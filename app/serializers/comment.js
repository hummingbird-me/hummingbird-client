import ApplicationSerializer from 'client/serializers/application';

export default ApplicationSerializer.extend({
  attrs: {
    contentFormatted: { serialize: false },
    likesCount: { serialize: false },
    repliesCount: { serialize: false },
    createdAt: { serialize: false },
    editedAt: { serialize: false },
    updatedAt: { serialize: false },

    uploads: { serialize: true }
  }
});
