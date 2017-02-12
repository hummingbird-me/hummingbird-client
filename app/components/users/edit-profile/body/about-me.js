import Component from 'ember-component';
import service from 'ember-service/inject';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import { isEmpty } from 'ember-utils';
import { task, timeout } from 'ember-concurrency';
import { invokeAction } from 'ember-invoke-action';

const GENDER_KEYS = ['secret', 'male', 'female', 'custom'];

export default Component.extend({
  classNames: ['tab-pane'],
  intl: service(),
  store: service(),

  searchCharacters: task(function* (query) {
    yield timeout(150);
    return yield get(this, 'store').query('character', {
      filter: { name: query },
      page: { limit: 4 }
    });
  }).restartable(),

  init() {
    this._super(...arguments);
    this._setGenderOptions();
    this._setGender();
    invokeAction(this, 'addRecord', get(this, 'user'));
  },

  _setGenderOptions() {
    const i18n = [];
    GENDER_KEYS.forEach((key) => {
      i18n.push(this._translateGender(key));
    });
    set(this, 'genderOptions', i18n);
  },

  _setGender() {
    const gender = get(this, 'user.gender');
    if (isEmpty(gender) === true) {
      set(this, 'selectedGender', this._translateGender(get(GENDER_KEYS, 'firstObject')));
    } else if (GENDER_KEYS.includes(gender) === true) {
      set(this, 'selectedGender', this._translateGender(gender));
    } else {
      set(this, 'selectedGender', this._translateGender(get(GENDER_KEYS, 'lastObject')));
    }
  },

  _translateGender(key) {
    return get(this, 'intl').t(`users.edit-modal.about.gender.options.${key}`);
  },

  actions: {
    updateGender(value) {
      const options = GENDER_KEYS.slice(0, 3).map(key => ({
        key, str: this._translateGender(key)
      }));
      if (options.map(o => o.str).includes(value) === true) {
        set(this, 'user.gender', options.find(o => o.str === value).key);
      }
      set(this, 'selectedGender', value);
    }
  }
});
