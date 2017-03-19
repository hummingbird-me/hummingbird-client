import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import moment from 'moment';

moduleForComponent('users/library/library-entries', 'Integration | Component | users/library/library entries', {
  integration: true,
  beforeEach() {
    const service = this.container.lookup('service:intl');
    service.setLocale('en-us');
  }
});

test('it renders', function(assert) {
  assert.expect(2);
  this.set('entries', [{
    media: {
      episodeCount: 13,
      episodeLength: 24,
      posterImage: 'pi',
      subtype: 'TV',
      startDate: moment.utc('2008-01-08T00:00:00.000Z'),
      endDate: moment.utc('2008-03-25T00:00:00.000Z')
    }
  }]);

  this.render(hbs`{{users/library/library-entries
      entries=entries
      metaCount=2
      status="current"
      mediaType="anime"}}`);
  assert.ok(this.$('[data-test-selector="library-entries"]').length);
  const text = this.$('[data-test-selector="library-entries-stats"]').text().trim();
  assert.equal(text, '2 titles');
});

