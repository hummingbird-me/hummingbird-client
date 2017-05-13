import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import testSelector from 'ember-test-selectors';

moduleForComponent('media/media-poster', 'Integration | Component | media/media poster', {
  integration: true,

  beforeEach() {
    const service = this.container.lookup('service:intl');
    service.setLocale('en-us');
  }
});

test('media-poster it renders', function(assert) {
  this.set('media', { constructor: { modelName: 'anime' }, posterImage: 'pi' });
  this.render(hbs`{{media/media-poster media=media}}`);
  const $el = this.$(testSelector('media-poster'));
  assert.equal($el.length, 1);
});
