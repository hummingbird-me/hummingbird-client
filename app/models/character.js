import Base from 'client/models/-base';
import attr from 'ember-data/attr';
import { belongsTo } from 'ember-data/relationships';

export default Base.extend({
  description: attr('string'),
  image: attr('object', { defaultValue: '/image/default_avatar.png' }),
  name: attr('string'),
  slug: attr('string'),

  primaryMedia: belongsTo('media')
});
