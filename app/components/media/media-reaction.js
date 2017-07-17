import Component from 'ember-component';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import { or } from 'ember-computed';
import { task } from 'ember-concurrency';
import getter from 'client/utils/getter';
import errorMessages from 'client/utils/error-messages';
import ClipboardMixin from 'client/mixins/clipboard';

export default Component.extend(ClipboardMixin, {
  isUpvoted: false,
  showUser: true,
  queryCache: service(),
  store: service(),
  router: service('-routing'),
  tasksRunning: or('getUserVoteTask.isRunning', 'createVoteTask.isRunning', 'destroyVoteTask.isRunning'),
  host: getter(() => `${location.protocol}//${location.host}`),

  canDelete: getter(function() {
    const currentUser = get(this, 'session.account');
    if (currentUser.hasRole('admin', get(this, 'reaction'))) {
      return true;
    }
    if (get(currentUser, 'id') === get(this, 'reaction.user.id')) {
      return true;
    }
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    get(this, 'getUserVoteTask').perform();
  },

  getUserVoteTask: task(function* () {
    const options = this._getRequestOptions();
    const response = yield get(this, 'queryCache').query('media-reaction-vote', options);
    const userVote = get(response, 'firstObject');
    if (userVote) {
      set(this, 'userVote', userVote);
      set(this, 'isUpvoted', true);
    }
  }).drop(),

  createVoteTask: task(function* () {
    const reaction = get(this, 'reaction');
    const vote = get(this, 'store').createRecord('media-reaction-vote', {
      mediaReaction: get(this, 'reaction'),
      user: get(this, 'session.account')
    });
    set(this, 'isUpvoted', true);
    reaction.incrementProperty('upVotesCount');
    try {
      yield vote.save();
      set(this, 'userVote', vote);
    } catch (err) {
      set(this, 'isUpvoted', false);
      reaction.decrementProperty('upVotesCount');
    }
  }).drop(),

  destroyVoteTask: task(function* () {
    const reaction = get(this, 'reaction');
    const vote = get(this, 'userVote');
    set(this, 'isUpvoted', false);
    reaction.decrementProperty('upVotesCount');
    try {
      yield vote.destroyRecord();
      const queryCache = get(this, 'queryCache');
      const options = this._getRequestOptions();
      queryCache.invalidateQuery('media-reaction-vote', options);
    } catch (err) {
      set(this, 'isUpvoted', false);
      reaction.incrementProperty('upVotesCount');
    }
  }).drop(),

  actions: {
    toggleVote() {
      if (!get(this, 'session.hasUser')) {
        return get(this, 'session').signUpModal();
      }
      if (get(this, 'tasksRunning.isRunning')) {
        return;
      }
      const task = get(this, 'isUpvoted') ? 'destroyVoteTask' : 'createVoteTask';
      get(this, task).perform();
    },

    deleteReaction() {
      if (get(this, 'reaction.isDeleted')) { return; }
      get(this, 'reaction').destroyRecord()
        .catch((err) => {
          get(this, 'reaction').rollbackAttributes();
          get(this, 'notify').error(errorMessages(err));
        });
    },
  },

  _getRequestOptions() {
    const mediaReactionId = get(this, 'reaction.id');
    const userId = get(this, 'session.account.id');
    return {
      filter: { mediaReactionId, userId },
      page: { limit: 1 }
    };
  }
});
