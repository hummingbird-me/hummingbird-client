import MediaShowRoute from 'client/routes/media/show/characters';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import { isEmpty } from 'ember-utils';
import { capitalize } from 'ember-string';

export default MediaShowRoute.extend({
  queryParams: {
    language: { refreshModel: true }
  },
  ajax: service(),

  /**
   * Retrieve the languages available. This is a temporary setup until our Casting setup has
   * been migrated.
   */
  beforeModel({ queryParams }) {
    const controller = this.controllerFor(get(this, 'routeName'));
    if (isEmpty(get(controller, 'availableLanguages'))) {
      const [mediaType] = get(this, 'routeName').split('.');
      const media = this.modelFor(`${mediaType}.show`);
      const id = get(media, 'id');
      return get(this, 'ajax').request(`/anime/${id}/_languages`).then((results) => {
        const languages = results.map(result => capitalize(result));
        set(controller, 'availableLanguages', languages);
        this._languageCheck(queryParams);
      }).catch((error) => {
        get(this, 'raven').logException(error);
      });
    }
    this._languageCheck(queryParams);
  },

  _getFilters({ language }) {
    const controller = this.controllerFor(get(this, 'routeName'));
    const availableLanguages = get(controller, 'availableLanguages');
    // If it's empty then don't filter by language at all. Shouldn't happen tho.
    if (isEmpty(availableLanguages)) { return {}; }
    return { language: capitalize(language || get(controller, 'language')) };
  },

  _languageCheck(queryParams) {
    const controller = this.controllerFor(get(this, 'routeName'));
    const languages = get(controller, 'availableLanguages');
    const language = capitalize(get(queryParams, 'language') || get(controller, 'language'));
    if (!isEmpty(languages) && !languages.includes(language)) {
      this.replaceWith({ queryParams: { language: get(languages, 'firstObject') } });
    }
  }
});
