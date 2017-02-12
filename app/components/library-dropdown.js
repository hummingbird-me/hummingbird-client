import Component from 'ember-component';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import computed from 'ember-computed';
import service from 'ember-service/inject';
import { task } from 'ember-concurrency';
import { invokeAction } from 'ember-invoke-action';
import libraryStatus from 'client/utils/library-status';
import getter from 'client/utils/getter';
import RSVP from 'rsvp';

export const REMOVE_KEY = 'library-dropdown.remove';

export default Component.extend({
  classNameBindings: ['entry:has-entry'],
  entryIsLoaded: false,
  intl: service(),
  metrics: service(),

  mediaType: getter(function() {
    return get(this, 'type') || get(this, 'entry.media.modelType');
  }),

  currentStatus: computed('entry.status', function() {
    const status = get(this, 'entry.status');
    const type = get(this, 'mediaType');
    return get(this, 'intl').t(`library-shared.${status}`, { type }).toString();
  }).readOnly(),

  statuses: computed('entry', 'currentStatus', function() {
    const type = get(this, 'mediaType');
    const statuses = libraryStatus.getEnumKeys().map(key => ({
      key,
      string: get(this, 'intl').t(`library-shared.${key}`, { type }).toString()
    }));
    if (get(this, 'entry')) {
      const removeKey = get(this, 'intl').t(REMOVE_KEY).toString();
      return statuses.concat([{ key: REMOVE_KEY, string: removeKey }]);
    }
    return statuses;
  }).readOnly(),

  updateTask: task(function* (status) {
    const entry = get(this, 'entry');
    if (entry && get(entry, 'status') === status.key) { return; }
    const actions = get(this, 'methods');
    let eventCategory;
    if (entry === undefined) {
      yield invokeAction(actions, 'create', status.key);
      eventCategory = 'create';
    } else if (status.key === REMOVE_KEY) {
      yield invokeAction(actions, 'delete');
      eventCategory = 'remove';
    } else {
      yield invokeAction(actions, 'update', status.key);
    }
    if (get(this, 'eventCategory') !== undefined) {
      get(this, 'metrics').trackEvent({
        category: 'library',
        action: eventCategory,
        label: get(this, 'mediaType'),
        value: get(this, 'entry.media.id')
      });
    }
  }).drop(),

  didReceiveAttrs() {
    this._super(...arguments);
    set(this, 'entryIsLoaded', false);
    RSVP.resolve(get(this, 'entry')).then(() => {
      if (!get(this, 'isDestroying') || !get(this, 'isDestroyed')) {
        set(this, 'entryIsLoaded', true);
      }
    });
  }
});
