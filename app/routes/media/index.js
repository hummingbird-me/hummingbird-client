import Route from 'ember-route';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import { isEmpty, typeOf } from 'ember-utils';
import { isEmberArray } from 'ember-array/utils';
import { task, timeout } from 'ember-concurrency';
import jQuery from 'jquery';
import QueryableMixin from 'client/mixins/routes/queryable';
import PaginationMixin from 'client/mixins/routes/pagination';
import SlideHeaderMixin from 'client/mixins/routes/slide-header';
import moment from 'moment';

export default Route.extend(SlideHeaderMixin, QueryableMixin, PaginationMixin, {
  mediaQueryParams: {
    averageRating: { refreshModel: true, replace: true },
    genres: { refreshModel: true, replace: true },
    text: { refreshModel: true, replace: true },
    year: { refreshModel: true, replace: true }
  },
  templateName: 'media/index',

  refreshDebounced: task(function* () {
    yield timeout(1000);
    this.refresh();
  }).restartable(),

  modelTask: task(function* (mediaType, options) {
    const results = yield get(this, 'store').query(mediaType, options);
    const controller = this.controllerFor(get(this, 'routeName'));
    set(controller, 'taskValue', results);
  }).restartable(),

  init() {
    this._super(...arguments);
    const mediaQueryParams = get(this, 'mediaQueryParams');
    const queryParams = get(this, 'queryParams') || {};
    set(this, 'queryParams', Object.assign(mediaQueryParams, queryParams));
  },

  beforeModel() {
    this._super(...arguments);
    const controller = this.controllerFor(get(this, 'routeName'));
    if (get(controller, 'availableGenres') !== undefined) {
      return;
    }
    get(this, 'store').query('genre', {
      page: { limit: 10000, offset: 0 }
    }).then(genres => set(controller, 'availableGenres', genres.sortBy('name')));
  },

  model(params) {
    const hash = { page: { offset: 0, limit: 20 } };
    const filters = this._buildFilters(params);
    const options = Object.assign(filters, hash);
    const [mediaType] = get(this, 'routeName').split('.');
    return { taskInstance: get(this, 'modelTask').perform(mediaType, options) };
  },

  afterModel() {
    // @Vevix - Not sure what needs done here, still have a search page?
    const [mediaType] = get(this, 'routeName').split('.');
    const desc = `Check out ALL our ${mediaType}. TODO`;
    set(this, 'headTags', [{
      type: 'meta',
      tagId: 'meta-description',
      attrs: {
        name: 'description',
        content: desc
      }
    }, {
      type: 'meta',
      tagId: 'meta-og-description',
      attrs: {
        property: 'og:description',
        content: desc
      }
    }]);
  },

  setupController(controller) {
    this._super(...arguments);
    jQuery(document.body).addClass('browse-page');
    jQuery(document).on('scroll.media', () => controller._handleScroll());
    controller._setDirtyValues();
  },

  resetController() {
    this._super(...arguments);
    jQuery(document.body).removeClass('browse-page');
    jQuery(document).off('scroll.media');
  },

  serializeQueryParam(value, key) {
    let result = this._super(...arguments);
    if (key === 'year') {
      if (value !== undefined) {
        const [lower, upper] = value;
        if (upper === (moment().year() + 1)) {
          result = `${lower}..`;
        }
      }
    } else if (key === 'averageRating') {
      if (value !== undefined) {
        const [lower, upper] = value;
        if (lower === 0.5 && upper === 5.0) {
          result = undefined;
        }
      }
    }
    return result;
  },

  deserializeQueryParam(value, key) {
    let result = this._super(...arguments);
    if (key === 'year') {
      if (value !== undefined) {
        const [lower, upper] = result;
        if (isEmpty(upper)) {
          result = [lower, moment().year() + 1];
        }
      }
    }
    return result;
  },

  _buildFilters(params) {
    const filters = { filter: {} };
    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (isEmpty(value) === true) {
        return;
      } else if (isEmberArray(value) === true) {
        const filtered = value.reject(x => isEmpty(x));
        if (isEmpty(filtered) === true) {
          return;
        }
      }
      const type = typeOf(value);
      filters.filter[key] = this.serializeQueryParam(value, key, type);
    });

    if (filters.filter.text === undefined) {
      filters.sort = '-user_count';
    }
    return filters;
  },

  actions: {
    refresh() {
      this.refresh();
    }
  }
});
