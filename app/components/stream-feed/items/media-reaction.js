import Component from 'client/components/media/media-reaction';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import computed, { alias, reads } from 'ember-computed';
import { invokeAction } from 'ember-invoke-action';
import errorMessages from 'client/utils/error-messages';
import ClipboardMixin from 'client/mixins/clipboard';

export default Component.extend(ClipboardMixin, {
  classNames: ['stream-item', 'row'],
  metrics: service(),
  router: service('-routing'),
  activity: reads('group.activities.firstObject'),
  media: alias('reaction.media'),

  canDelete: computed('session.account', 'reaction', function() {
    const currentUser = get(this, 'session.account');
    if (currentUser.hasRole('admin', get(this, 'reaction'))) {
      return true;
    }
    if (get(currentUser, 'id') === get(this, 'reaction.user.id')) {
      return true;
    }
  }),

  init() {
    this._super(...arguments);
    set(this, 'host', `${location.protocol}//${location.host}`);
  },

  didReceiveAttrs() {
    if (get(this, 'group') !== undefined) {
      set(this, 'reaction', get(this, 'activity.subject.content') || get(this, 'activity.subject'));
    }
    this._super(...arguments);
  },

  actions: {
    trackEngagement(label) {
      const data = {
        label,
        content: { foreign_id: `MediaReaction:${get(this, 'reaction.id')}` },
        position: get(this, 'positionInFeed') || 0
      };
      if (get(this, 'feedId') !== undefined) {
        data.feed_id = get(this, 'feedId');
      }
      get(this, 'metrics').invoke('trackEngagement', 'Stream', data);
    },

    deleteReaction() {
      if (get(this, 'reaction.isDeleted')) { return; }
      get(this, 'reaction').destroyRecord()
        .then(() => {
          // this reaction is being deleted from its permalink page
          if (get(this, 'group') === undefined) {
            get(this, 'router').transitionTo('dashboard');
          } else {
            // try to find the activity-group that references this reaction
            const record = get(this, 'store').peekRecord('activity-group', get(this, 'group.id'));
            invokeAction(this, 'removeGroup', record);
          }
          get(this, 'notify').success('Success! The reaction has been deleted.');
        })
        .catch((err) => {
          get(this, 'reaction').rollbackAttributes();
          get(this, 'notify').error(errorMessages(err));
        });
    },
  }
});
