import Controller from 'ember-controller';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import { isEmpty } from 'ember-utils';
import { moment } from 'client/utils/moment';
import { concat } from 'client/utils/computed-macros';
import { serializeArray, deserializeArray } from 'client/utils/queryable';

export const MEDIA_QUERY_PARAMS = {
  averageRating: {
    defaultValue: [5, 100],
    refresh: true,
    serialize(value) {
      const [lower, upper] = value;
      if (lower === 5 && upper === 100) {
        return undefined;
      } else if (lower === 5) {
        return serializeArray([5, upper]);
      }
      return serializeArray(value);
    },
    deserialize(value = []) {
      const [lower, upper] = deserializeArray(value);
      if (isEmpty(lower)) {
        return [5, upper];
      }
      return [lower, upper];
    }
  },
  genres: {
    defaultValue: [],
    refresh: true,
    serialize(value) {
      return serializeArray(value);
    },
    deserialize(value = []) {
      return deserializeArray(value);
    }
  },
  text: {
    defaultValue: '',
    refresh: true
  },
  sort: {
    defaultValue: 'popularity',
    refresh: true
  },
  subtype: {
    defaultValue: [],
    refresh: true,
    serialize(value) {
      return serializeArray(value);
    },
    deserialize(value = []) {
      return deserializeArray(value);
    }
  },
  year: {
    defaultValue: [1907, moment().year() + 1],
    refresh: true,
    serialize(value) {
      const [lower, upper] = value;
      if (upper === (moment().year() + 1)) {
        return serializeArray([lower, null]);
      }
      return serializeArray(value);
    },
    deserialize(value = []) {
      const [lower, upper] = deserializeArray(value);
      if (isEmpty(upper)) {
        return [lower, moment().year() + 1];
      }
      return [lower, upper];
    }
  }
};

export default Controller.extend({
  sortOptions: ['popularity', 'rating', 'date', 'recent'],
  taskValue: concat('model.taskInstance.value', 'model.paginatedRecords'),

  init() {
    this._super(...arguments);
    set(this, 'maxYear', moment().year() + 1);
    const mediaType = get(this, 'mediaType');
    set(this, 'isAnime', mediaType === 'anime');
    set(this, 'isManga', mediaType === 'manga');
  },

  actions: {
    formatValue(value) {
      return parseFloat(parseFloat(value).toFixed(0));
    }
  },

  _setDirtyValues() {
    set(this, 'dirtyYear', get(this, 'year'));
    set(this, 'dirtyRating', get(this, 'averageRating'));
  }
});
