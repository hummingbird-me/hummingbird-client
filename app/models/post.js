import Base from 'client/models/-base';
import attr from 'ember-data/attr';
import { belongsTo, hasMany } from 'ember-data/relationships';

export default Base.extend({
  blocked: attr('boolean'),
  commentsCount: attr('number'),
  content: attr('string'),
  contentFormatted: attr('string'),
  createdAt: attr('utc', { defaultValue() { return new Date(); } }),
  editedAt: attr('utc'),
  nsfw: attr('boolean'),
  postLikesCount: attr('number'),
  spoiler: attr('boolean'),
  topLevelCommentsCount: attr('number'),
  updatedAt: attr('utc', { defaultValue() { return new Date(); } }),

  media: belongsTo('media'),
  spoiledUnit: belongsTo('-base'),
  targetGroup: belongsTo('group'),
  targetUser: belongsTo('user'),
  user: belongsTo('user'),

  comments: hasMany('comment', { inverse: 'post' }),
  postLikes: hasMany('post-like', { inverse: 'post' })
});
