import Base from 'client/models/-base';
import attr from 'ember-data/attr';
import { belongsTo, hasMany } from 'ember-data/relationships';
import { equal } from 'ember-computed';

export default Base.extend({
  createdAt: attr('utc'),
  status: attr('string'),

  assignee: belongsTo('user'),
  firstMessage: belongsTo('group-ticket-message'),
  group: belongsTo('group'),
  user: belongsTo('user'),

  messages: hasMany('group-ticket-message', { inverse: 'ticket' }),

  isOpen: equal('status', 'created'),
  isResolved: equal('status', 'resolved')
});
