import Component from '@ember/component';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { invokeAction } from 'ember-invoke-action';
import { task } from 'ember-concurrency';

export default Component.extend({
  aozoraConflicts: service(),
  conflicts: {},
  chosen: '',

  getConflicts: task(function* () {
    const conflicts = yield get(this, 'aozoraConflicts').list();
    set(this, 'conflicts', conflicts);
  }).on('init'),

  choose: task(function* (chosen) {
    set(this, 'chosen', chosen);
    yield get(this, 'aozoraConflicts').resolve(chosen);
    invokeAction(this, 'changeComponent', 'aozora-account-details');
  }).drop()
});
