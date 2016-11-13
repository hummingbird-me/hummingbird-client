import Component from 'ember-component';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import { isPresent } from 'ember-utils';
import { invokeAction } from 'ember-invoke-action';
import { task, taskGroup } from 'ember-concurrency';

// TODO: i18n errors
export default Component.extend({
  errorMessage: undefined,

  facebook: service(),
  session: service(),
  tasks: taskGroup().drop(),

  connectFacebook: task(function* () {
    yield get(this, 'facebook').connect(get(this, 'session.account'))
      .catch(() => set(this, 'errorMessage', 'There is already an account on Kitsu with your Facebook account connected.'));
  }).group('tasks'),

  disconnectFacebook: task(function* () {
    yield get(this, 'facebook').disconnect(get(this, 'session.account'))
      .catch(() => set(this, 'errorMessage', 'There was an issue disconnecting your Facebook account.'));
  }).group('tasks'),

  importFriends: task(function* () {
    if (isPresent(get(this, 'session.account.facebookId')) === true) {
      yield get(this, 'facebook').importFriends().catch(() => {});
    }
  }).group('tasks'),

  actions: {
    close() {
      invokeAction(this, 'close');
    }
  }
});
