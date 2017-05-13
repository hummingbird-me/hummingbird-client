import BaseComponent from 'client/components/trending/-base';
import get from 'ember-metal/get';
import { task } from 'ember-concurrency';
import FlickityActionsMixin from 'client/mixins/flickity-actions';
import { moment } from 'client/utils/moment';

export default BaseComponent.extend(FlickityActionsMixin, {
  classNames: ['annual-trending'],
  currentTab: 'anime',
  lastYear: moment().year() - 1,

  getDataTask: task(function* (type) {
    return yield get(this, 'queryCache').query(type, {
      filter: { year: get(this, 'lastYear') },
      sort: '-average_rating',
      page: { limit: 10 }
    });
  }).restartable()
});
