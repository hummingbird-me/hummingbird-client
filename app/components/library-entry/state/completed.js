import Component from 'ember-component';
import set from 'ember-metal/set';
import { scheduleOnce } from 'ember-runloop';
import { invokeAction } from 'ember-invoke-action';
import jQuery from 'jquery';

export default Component.extend({
  isChangingRating: false,

  actions: {
    showRating() {
      set(this, 'isChangingRating', true);
      // watch for clicks outside the tether element for closure
      scheduleOnce('afterRender', () => {
        jQuery(document.body).on('click.library-state-rating', ({ target }) => {
          const id = '#library-state-completed-rating';
          const isChild = jQuery(target).is(`${id} *, ${id}`);
          if (!isChild) {
            set(this, 'isChangingRating', false);
            jQuery(document.body).off('click.library-state-rating');
          }
        });
      });
    },

    ratingSelected(rating) {
      set(this, 'isChangingRating', false);
      jQuery(document.body).off('click.library-state-rating');
      invokeAction(this, 'onRatingChange', rating);
    }
  }
});
