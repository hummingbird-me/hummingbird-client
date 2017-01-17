import Base from 'client/models/base';
import attr from 'ember-data/attr';
import { hasMany } from 'ember-data/relationships';

export default Base.extend({
  name: attr('string'),
  slug: attr('string'),

  animeProductions: hasMany('anime-production')
});
