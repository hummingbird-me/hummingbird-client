import { moduleFor, test } from 'ember-qunit';
import run from 'ember-runloop';
import get from 'ember-metal/get';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import RSVP from 'rsvp';
import setupStore from 'client/tests/helpers/setup-store';
import wait from 'ember-test-helpers/wait';

moduleFor('service:session', 'Unit | Service | session', {
  needs: ['service:ajax'],

  beforeEach() {
    this.store = setupStore({
      user: Model.extend({
        name: attr('string')
      })
    });
  },

  afterEach() {
    run(this.store, 'destroy');
  }
});

test('#isCurrentUser tests if the passed user is the current user', function(assert) {
  const service = this.subject({
    isAuthenticated: true,
    account: { id: 1 }
  });
  let result = service.isCurrentUser({ id: 1 });
  assert.ok(result);
  result = service.isCurrentUser({ id: 2 });
  assert.notOk(result);
});

test('#getCurrentUser retrieves the user and sets account', function(assert) {
  assert.expect(1);
  const service = this.subject({
    store: this.store,
    ajax: {
      request() {
        return new RSVP.Promise((resolve) => {
          resolve({
            data: [{
              id: '1',
              type: 'users',
              attributes: {
                name: 'Holo'
              }
            }]
          });
        });
      }
    }
  });
  service.getCurrentUser();
  return wait().then(() => assert.equal(get(service, 'account.name'), 'Holo'));
});
