import Component from 'ember-component';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import { or } from 'ember-computed';
import { task } from 'ember-concurrency';

export default Component.extend({
  isUpvoted: false,
  isEditable: false,
  queryCache: service(),
  store: service(),
  tasksRunning: or('getUserVoteTask.isRunning', 'createVoteTask.isRunning', 'destroyVoteTask.isRunning'),

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
    }
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
