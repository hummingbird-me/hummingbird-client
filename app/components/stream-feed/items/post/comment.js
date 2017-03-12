import Component from 'ember-component';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import computed from 'ember-computed';
import { isEmpty } from 'ember-utils';
import { task } from 'ember-concurrency';
import { invokeAction } from 'ember-invoke-action';
import { scheduleOnce } from 'ember-runloop';
import errorMessages from 'client/utils/error-messages';
import getter from 'client/utils/getter';
import ClipboardMixin from 'client/mixins/clipboard';
import { unshiftObjects } from 'client/utils/array-utils';
import Pagination from 'client/mixins/pagination';
import { CanMixin } from 'ember-can';

export default Component.extend(ClipboardMixin, Pagination, CanMixin, {
  classNameBindings: ['comment.isNew:new-comment'],
  isEditing: false,
  isReplying: false,
  isTopLevel: false,
  metrics: service(),
  notify: service(),
  store: service(),
  host: getter(() => `${location.protocol}//${location.host}`),

  isEditable: getter(function() {
    if (get(this, 'session.account').hasRole('admin', get(this, 'comment'))) {
      return true;
    }
    const time = get(this, 'comment.createdAt').add(30, 'minutes');
    return !time.isBefore();
  }),

  commentEdited: computed('comment.createdAt', 'comment.editedAt', function() {
    if (!get(this, 'comment.editedAt')) { return false; }
    return !get(this, 'comment.createdAt').isSame(get(this, 'comment.editedAt'));
  }).readOnly(),

  canEditComment: computed(function() {
    const group = get(this, 'post').belongsTo('targetGroup').value();
    if (group) {
      return this.can('edit comment in group', group, {
        membership: get(this, 'groupMembership'),
        comment: get(this, 'comment')
      });
    }
    return this.can('edit comment', get(this, 'comment'));
  }).readOnly(),

  getReplies: task(function* () {
    return yield get(this, 'store').query('comment', {
      include: 'user',
      filter: { post_id: get(this, 'post.id'), parent_id: get(this, 'comment.id') },
      page: { limit: 2 },
      sort: '-created_at'
    });
  }).drop(),

  createReply: task(function* (content) {
    const reply = get(this, 'store').createRecord('comment', {
      content,
      post: get(this, 'post'),
      parent: get(this, 'comment'),
      user: get(this, 'session.account')
    });

    invokeAction(this, 'replyCountUpdate', get(this, 'comment.repliesCount') + 1);
    get(this, 'replies').addObject(reply);
    set(this, 'isReplying', false);

    yield reply.save()
      .then(() => {
        invokeAction(this, 'trackEngagement', 'comment');
        get(this, 'metrics').trackEvent({ category: 'comment', action: 'reply', value: get(this, 'comment.id') });
      })
      .catch((err) => {
        invokeAction(this, 'replyCountUpdate', get(this, 'comment.repliesCount') - 1);
        get(this, 'replies').removeObject(reply);
        get(this, 'notify').error(errorMessages(err));
      });
  }).drop(),

  updateComment: task(function* () {
    yield get(this, 'comment').save().catch(err => get(this, 'notify').error(errorMessages(err)));
  }).drop(),

  init() {
    this._super(...arguments);
    set(this, 'replies', []);
    if (get(this, 'isTopLevel') === true && get(this, 'comment.repliesCount') > 0) {
      get(this, 'getReplies').perform().then((replies) => {
        const content = replies.toArray().reverse();
        set(content, 'links', get(replies, 'links'));
        set(this, 'replies', content);
        this.updatePageState(replies);
      }).catch(() => {});
    }

    // groups
    const group = get(this, 'post').belongsTo('targetGroup').value();
    if (group) {
      if (get(this, 'kitsuGroupMembership')) {
        set(this, 'groupMembership', get(this, 'kitsuGroupMembership'));
      } else {
        get(this, 'store').query('group-member', {
          filter: { group, user: get(this, 'session.account') },
          include: 'permissions'
        }).then((records) => {
          const record = get(records, 'firstObject');
          set(this, 'groupMembership', record);
        }).catch(() => {});
      }
    }
  },

  onPagination(records) {
    set(this, 'isLoading', false);
    unshiftObjects(get(this, 'replies'), records.toArray().reverse());
    invokeAction(this, 'trackEngagement', 'click');
  },

  actions: {
    updateComment(component, event, content) {
      if (isEmpty(content) === true) { return; }
      const { shiftKey } = event;
      if (shiftKey === false) {
        event.preventDefault();
        get(this, 'updateComment').perform();
        this.toggleProperty('isEditing');
      }
    },

    deleteComment() {
      get(this, 'comment').destroyRecord()
        .then(() => {
          invokeAction(this, 'onDelete', get(this, 'comment'));
          get(this, 'notify').success('Success! Your comment has been deleted.');
        })
        .catch((err) => {
          get(this, 'comment').rollbackAttributes();
          get(this, 'notify').error(errorMessages(err));
        });
    },

    deletedReply(reply) {
      get(this, 'replies').removeObject(reply);
      invokeAction(this, 'replyCountUpdate', get(this, 'comment.repliesCount') - 1);
    },

    createReply(component, event, content) {
      if (isEmpty(content) === true) { return; }
      const { shiftKey } = event;
      if (shiftKey === false) {
        event.preventDefault();
        get(this, 'createReply').perform(content);
        component.clear();
      }
    },

    showReply() {
      if (get(this, 'isTopLevel') === true) {
        this.toggleProperty('isReplying');
      } else {
        invokeAction(this, 'onReply', get(this, 'comment.user.name'));
      }
    },

    onReply(name) {
      this.toggleProperty('isReplying');
      scheduleOnce('afterRender', () => this.$('.reply-comment').val(`@${name} `));
    },

    onPagination() {
      set(this, 'isLoading', true);
      this._super(null, { page: { limit: 10, offset: get(this, 'replies.length') } });
    },

    loadReplies(records, links) {
      const content = get(this, 'replies').toArray();
      unshiftObjects(content, records.toArray().reverse());
      set(this, 'replies', content);
      set(this, 'replies.links', links);
    },

    trackEngagement(label) {
      invokeAction(this, 'trackEngagement', label, `Comment:${get(this, 'comment.id')}`);
    }
  }
});
