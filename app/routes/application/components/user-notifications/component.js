import Component from 'ember-component';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import computed from 'ember-computed';
import { task } from 'ember-concurrency';
import { prependObjects } from 'client/utils/array-utils';
import moment from 'moment';

export default Component.extend({
  session: service(),
  store: service(),
  streamRealtime: service(),

  count: computed('groups.@each.isSeen', {
    get() {
      const groups = get(this, 'groups');
      if (groups === undefined) {
        return 0;
      }
      return groups.reduce((prev, curr) => (prev + (get(curr, 'isSeen') ? 0 : 1)), 0);
    }
  }),

  /**
   * set the activities to an array so any updates to a group from a feed load
   * won't reset the activities relationship
   */
  getNotifications: task(function* () {
    // TODO: Limit the number of notifications pulled here and filter on isRead: false
    return yield get(this, 'store').query('feed', {
      type: 'notifications',
      id: get(this, 'session.account.id'),
      include: 'actor'
    }).then((groups) => {
      const meta = get(groups, 'meta');
      set(this, 'groups', groups.map(group => ({
        ...group,
        activities: get(group, 'activities').toArray()
      })));
      set(this, 'groups.meta', meta);
      return get(this, 'groups');
    });
  }).drop(),

  init() {
    this._super(...arguments);
    set(this, 'groups', []);
    get(this, 'getNotifications').perform().then((data) => {
      const { readonlyToken } = get(data, 'meta');
      const id = get(this, 'session.account.id');
      const subscription = get(this, 'streamRealtime')
        .subscribe('notifications', id, readonlyToken, object => this._handleRealtime(object));
      set(this, 'subscription', subscription);
    }).catch(() => {});
  },

  willDestroyElement() {
    this._super(...arguments);
    const subscription = get(this, 'subscription');
    if (subscription !== undefined) {
      subscription.cancel();
    }
  },

  _handleRealtime(object) {
    const groups = get(this, 'groups');

    // new activities
    get(object, 'new').forEach((activity) => {
      const enriched = this._enrichActivity(activity);
      const group = groups.findBy('group', get(activity, 'group'));
      if (group !== undefined) {
        prependObjects(get(group, 'activities'), [enriched]);
        set(group, 'isSeen', false);
        // TODO: push this group to top of stack
      } else {
        const newGroup = get(this, 'store').createRecord('activity-group', {
          activities: [enriched]
        });
        const content = get(this, 'groups').toArray();
        prependObjects(content, [newGroup]);
        set(this, 'groups', content);
      }
    });

    // deleted activities
    get(object, 'deleted').forEach((id) => {
      const group = groups.find(g => get(g, 'activities').findBy('id', id) !== undefined);
      if (group !== undefined) {
        const activities = get(group, 'activities').reject(activity => get(activity, 'id') === id);
        set(group, 'activities', activities);
        if (get(group, 'activities.length') === 0) {
          get(this, 'groups').removeObject(group);
        }
      }
    });

    // TODO: Toast user
  },

  _enrichActivity(activity) {
    const enriched = get(this, 'store').createRecord('activity', {
      id: get(activity, 'id'),
      foreignId: get(activity, 'foreign_id'),
      time: moment.parseZone(get(activity, 'time')).local().format(),
      verb: get(activity, 'verb')
    });
    get(this, 'store').findRecord('user', get(activity, 'actor').split(':')[1]).then((user) => {
      set(enriched, 'actor', user);
    });
    return enriched;
  },

  actions: {
    markSeen() {
      // TODO: API Needed here (will mark notifications here as seen)
      get(this, 'groups').forEach(group => set(group, 'isSeen', true));
      return true;
    },

    markRead() {
      // TODO: API Needed here (will mark notifications here as read)
    }
  }
});
