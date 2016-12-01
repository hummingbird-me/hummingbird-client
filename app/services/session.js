import Session from 'ember-simple-auth/services/session';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import computed from 'ember-computed';
import jQuery from 'jquery';

export default Session.extend({
  account: undefined,
  ajax: service(),
  store: service(),
  hasUser: computed('isAuthenticated', 'account', {
    get() {
      return get(this, 'isAuthenticated') === true && get(this, 'account') !== undefined;
    }
  }).readOnly(),

  authenticateWithOAuth2(identification, password) {
    return this.authenticate('authenticator:oauth2', identification, password);
  },

  authenticateWithFacebook() {
    return this.authenticate('authenticator:assertion', 'facebook');
  },

  isCurrentUser(user) {
    const hasUser = get(this, 'hasUser');
    const userId = get(this, 'account.id');
    return hasUser && userId === get(user, 'id');
  },

  getCurrentUser() {
    return get(this, 'ajax').request('/users?filter[self]=true&include=userRoles.role')
      .then((response) => {
        const [data] = response.data;
        const normalizedData = get(this, 'store').normalize('user', data);
        const user = get(this, 'store').push(normalizedData);

        const included = response.included || [];
        included.forEach((record) => {
          let type = get(record, 'type');
          type = type === 'userRoles' ? 'user-role' : 'role';
          get(this, 'store').push(get(this, 'store').normalize(type, record));
        });

        set(this, 'account', user);
        return user;
      });
  },

  signUpModal() {
    jQuery('#sign-up-button').click();
  }
});
