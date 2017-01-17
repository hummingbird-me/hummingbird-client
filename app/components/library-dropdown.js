import Component from 'ember-component';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import computed from 'ember-computed';
import service from 'ember-service/inject';
import { task } from 'ember-concurrency';
import { invokeAction } from 'ember-invoke-action';
import libraryStatus from 'client/utils/library-status';
import getter from 'client/utils/getter';
import { modelType as getType } from 'client/helpers/model-type';
import RSVP from 'rsvp';

export const REMOVE_KEY = 'library.remove';

export default Component.extend({
  classNameBindings: ['entry:has-entry'],
  entryIsLoaded: false,
  i18n: service(),
  metrics: service(),

  mediaType: getter(function() {
    return get(this, 'type') || getType([get(this, 'entry.media')]);
  }),

  currentStatus: computed('entry.status', {
    get() {
      const status = get(this, 'entry.status');
      const type = get(this, 'mediaType');
      return get(this, 'i18n').t(`library.statuses.${type}.${status}`).toString();
    }
  }).readOnly(),

  statuses: computed('entry', 'currentStatus', {
    get() {
      const type = get(this, 'mediaType');
      const statuses = libraryStatus.getEnumKeys().map(key => ({
        key,
        string: get(this, 'i18n').t(`library.statuses.${type}.${key}`).toString()
      }));
      if (get(this, 'entry') === undefined) {
        return statuses;
      }
      const status = get(this, 'currentStatus');
      statuses.splice(statuses.findIndex(el => el.string === status), 1);
      const removeKey = get(this, 'i18n').t(REMOVE_KEY).toString();
      return statuses.concat([{ key: REMOVE_KEY, string: removeKey }]);
    }
  }).readOnly(),

  updateTask: task(function* (status) {
    const entry = get(this, 'entry');
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

  init() {
    this._super(...arguments);
    RSVP.resolve(get(this, 'entry')).then(() => {
      if (get(this, 'isDestroyed') === false) {
        set(this, 'entryIsLoaded', true);
      }
    });
  }
});
