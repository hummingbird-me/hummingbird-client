import Component from 'ember-component';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import computed from 'ember-computed';
import { task, timeout } from 'ember-concurrency';
import { concat } from 'client/utils/computed-macros';
import Pagination from 'client/mixins/pagination';

export default Component.extend(Pagination, {
  intl: service(),
  notify: service(),
  store: service(),
  invites: concat('getInvitesTask.last.value', 'paginatedRecords'),

  init() {
    this._super(...arguments);
    get(this, 'getInvitesTask').perform();
  },

  canInvite: computed('inviteUser', 'inviteUserTask.isRunning', function() {
    return get(this, 'inviteUser') && get(this, 'inviteUserTask.isIdle');
  }).readOnly(),

  getInvitesTask: task(function* () {
    return yield get(this, 'store').query('group-invite', {
      filter: { group: get(this, 'group.id'), status: 'pending' },
      include: 'user'
    }).then((records) => {
      this.updatePageState(records);
      return records;
    });
  }),

  searchUsersTask: task(function* (query) {
    yield timeout(250);
    return yield get(this, 'store').query('user', {
      filter: { query }
    });
  }).restartable(),

  inviteUserTask: task(function* () {
    const user = get(this, 'inviteUser');
    const invite = get(this, 'store').createRecord('group-invite', {
      group: get(this, 'group'),
      sender: get(this, 'session.account'),
      user
    });
    yield invite.save().then(() => {
      set(this, 'inviteUser', null);
      get(this, 'paginatedRecords').addObject(invite);
    }).catch(() => {
      get(this, 'notify').error(get(this, 'intl').t('errors.request'));
    });
  })
});
