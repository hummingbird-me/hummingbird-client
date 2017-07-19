import Route from 'ember-route';
import get from 'ember-metal/get';
import DataErrorMixin from 'client/mixins/routes/data-error';

export default Route.extend(DataErrorMixin, {
  model({ id }) {
    return get(this, 'store').findRecord('media-reaction', id, {
      include: 'user,anime,manga',
      reload: true
    });
  }
});
