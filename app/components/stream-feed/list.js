import Component from 'ember-component';
import { task } from 'ember-concurrency';
import get, { getProperties } from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import { isEmpty } from 'ember-utils';
import { capitalize } from 'ember-string';
import computed from 'ember-computed';
import EmberObject from 'ember-object';
import getter from 'client/utils/getter';
import { modelType } from 'client/helpers/model-type';
import errorMessages from 'client/utils/error-messages';
import { prependObjects } from 'client/utils/array-utils';

export default Component.extend({
  filter: 'all',
  readOnly: false,

  ajax: service(),
  headData: service(),
  headTags: service(),
  notify: service(),
  session: service(),
  store: service(),
  metrics: service(),
  streamRealtime: service(),

  feedId: getter(function() {
    return `${get(this, 'streamType')}:${get(this, 'streamId')}`;
  }),

  filterOptions: computed('filter', {
    get() {
      return ['all', 'media', 'user'].removeObject(get(this, 'filter'));
    }
  }).readOnly(),

  filteredFeed: computed('feed.[]', 'filter', {
    get() {
      const feed = get(this, 'feed');
      if (feed === undefined) {
        return [];
      }
      let result = feed;
      const filter = get(this, 'filter');
      if (filter === 'media') {
        result = result.filter((group) => {
          const [type] = get(group, 'activities.firstObject.foreignId').split(':');
          return type === 'LibraryEntry' || type === 'Review';
        });
      } else if (filter === 'user') {
        result = result.reject((group) => {
          const [type] = get(group, 'activities.firstObject.foreignId').split(':');
          return type === 'LibraryEntry' || type === 'Review';
        });
      }
      return result;
    }
  }).readOnly(),

  getFeedData: task(function* (type, id, limit = 10) {
    return yield get(this, 'store').query('feed', {
      type,
      id,
      include: [
        // activity
        'media,actor,unit,subject,target',
        // posts (and comment system)
        'target.user,target.target_user,target.spoiled_unit,target.media',
        'subject.user,subject.target_user,subject.spoiled_unit,subject.media',
        // follow
        'subject.followed',
        // review
        'subject.library_entry'
      ].join(','),
      page: { limit }
    });
  }).restartable(),

  createPost: task(function* (content, options) {
    const data = { content, user: get(this, 'session.account'), ...options };
    // posting on another user's profile
    if (get(this, 'user') !== undefined && get(this, 'user.id') !== get(this, 'session.account.id')) {
      set(data, 'targetUser', get(this, 'user'));
    }
    // spoiler + media set
    if (get(data, 'spoiler') === true && get(data, 'media') !== undefined) {
      const entry = yield get(this, 'store').query('library-entry', {
        filter: {
          user_id: get(this, 'session.account.id'),
          media_type: capitalize(modelType([get(data, 'media')])),
          media_id: get(data, 'media.id')
        },
        include: 'unit'
      });
      set(data, 'spoiledUnit', get(entry, 'unit'));
    }
    const post = get(this, 'store').createRecord('post', data);
    const [group, activity] = this._createTempActivity(post);
    // update post counter
    get(this, 'session.account').incrementProperty('postsCount');
    return yield post.save()
      .then((record) => {
        get(this, 'feed').insertAt(0, group);
        set(group, 'group', get(record, 'id'));
        set(activity, 'foreignId', `Post:${get(record, 'id')}`);
        get(this, 'metrics').trackEvent({ category: 'post', action: 'create' });
      })
      .catch((err) => {
        get(this, 'feed').removeObject(group);
        get(this, 'session.account').decrementProperty('postsCount');
        get(this, 'notify').error(errorMessages(err));
      });
  }).drop(),

  deleteActivity: task(function* (activity) {
    const activityId = get(activity, 'id');
    const actorId = get(activity, 'actor.id');
    const feedUrl = `/feeds/user/${actorId}/activities/${activityId}`;
    return yield get(this, 'ajax').delete(feedUrl);
  }).enqueue(),

  didReceiveAttrs() {
    this._super(...arguments);
    get(this, 'headTags').collectHeadTags();

    // cancel any previous subscriptions
    this._cancelSubscription();

    const { streamType, streamId } = getProperties(this, 'streamType', 'streamId');
    if (isEmpty(streamType) || isEmpty(streamId)) {
      return;
    }
    set(this, 'feed', []);
    set(this, 'newItems', EmberObject.create({ length: 0, cache: [] }));
    get(this, 'getFeedData').perform(streamType, streamId).then((data) => {
      get(this, 'feed').addObjects(data);
      set(this, 'feed.links', get(data, 'links'));

      // realtime
      const { readonlyToken } = get(data, 'meta');
      const subscription = get(this, 'streamRealtime').subscribe(streamType, streamId, readonlyToken,
        object => this._handleRealtime(object));
      set(this, 'subscription', subscription);

      // stream analytics
      this._trackImpressions(data);
    }).catch(() => {});
  },

  willDestroyElement() {
    this._super(...arguments);
    this._cancelSubscription();
  },

  /**
   * Create a temporary activity group record so that we can push a new
   * post into the feed without a refresh.
   */
  _createTempActivity(record) {
    const activity = get(this, 'store').createRecord('activity', {
      subject: record,
      foreignId: 'Post:<unknown>'
    });
    const group = get(this, 'store').createRecord('activity-group', {
      group: '<unknown>',
      activities: [activity]
    });
    return [group, activity];
  },

  _trackImpressions(data) {
    const list = data.map(group => get(group, 'activities').map(activity => get(activity, 'foreignId')));
    if (isEmpty(list) === true) {
      return;
    }
    get(this, 'metrics').invoke('trackImpression', 'Stream', {
      content_list: list.reduce((a, b) => a.concat(b)).uniq(),
      feed_id: get(this, 'feedId')
    });
  },

  _cancelSubscription() {
    const subscription = get(this, 'subscription');
    if (subscription !== undefined) {
      subscription.cancel();
    }
  },

  _handleRealtime(object) {
    const groupCache = get(this, 'newItems.cache');

    get(this, 'newItems').beginPropertyChanges();
    get(object, 'new').forEach((activity) => {
      const type = get(activity, 'foreign_id').split(':')[0];
      if (type === 'Post' || type === 'Comment') {
        // look for unknown post at first object by session user
        if (get(activity, 'actor').split(':')[1] === get(this, 'session.account.id')) {
          if (type === 'post') {
            const top = get(this, 'feed.firstObject.activities.firstObject');
            if (get(top, 'foreignId') === 'Post:<unknown>' ||
              get(top, 'foreignId') === get(activity, 'foreign_id')) {
              return;
            }
          } else {
            return; // Don't show new activity and bump post for own users comments
          }
        }
      }
      if (groupCache.indexOf(get(activity, 'group')) === -1) {
        set(this, 'newItems.length', get(this, 'newItems.length') + 1);
        groupCache.addObject(get(activity, 'group'));
      }
    });
    get(this, 'newItems').endPropertyChanges();

    if (get(this, 'newItems.length') > 0) {
      const title = `(${get(this, 'newItems.length')}) ${get(this, 'headData.title')}`;
      window.document.title = title;
    }
  },

  actions: {
    updateNextPage(records, links) {
      const dup = get(this, 'feed').toArray();
      dup.addObjects(records);
      set(this, 'feed', dup);
      set(this, 'feed.links', links);
    },

    deleteActivity(activity, callback) {
      get(this, 'deleteActivity').perform(activity).then(() => {
        if (callback !== undefined) {
          callback(...arguments);
        }
        get(this, 'notify').success('Your feed activity was deleted.');
      }).catch((err) => {
        get(this, 'notify').error(errorMessages(err));
      });
    },

    removeGroup(group) {
      get(this, 'feed').removeObject(group);
    },

    /**
     * Request the activities from the API Server instead of enriching them locally
     * so we reduce the logic and handling of all the relationships needed for display.
     */
    newActivities() {
      const { streamType, streamId } = getProperties(this, 'streamType', 'streamId');
      const limit = get(this, 'newItems.length');
      set(this, 'realtimeLoading', true);
      get(this, 'getFeedData').perform(streamType, streamId, limit).then((data) => {
        set(this, 'newItems.length', 0);
        set(this, 'newItems.cache', []);
        get(this, 'headTags').collectHeadTags();

        // remove dups from the feed and replace with updated activity
        const dups = get(this, 'feed').filter(group => (
          data.findBy('group', get(group, 'group')) !== undefined
        ));
        get(this, 'feed').removeObjects(dups);

        // prepend the new activities
        prependObjects(get(this, 'feed'), data.toArray().reverse());

        set(this, 'realtimeLoading', false);
        this._trackImpressions(data);
      }).catch(() => set(this, 'realtimeLoading', false));
    }
  }
});
