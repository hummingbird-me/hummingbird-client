import { module, test } from 'qunit';
import { getTitleField, getComputedTitle } from 'client/utils/get-title-field';

module('Unit | Utility | get title field', function() {
  test('it returns `en` for `english`', function(assert) {
    const result = getTitleField('english');
    assert.equal(result, 'en');
  });

  test('it returns `en_us` for `english` with language preferences', function(assert) {
    const session = { hasUser: true, account: { titleLanguagePreference: 'english', language: 'en-us' } };
    const media = { titles: { en_us: 'en_us', en: 'en' }, canonicalTitle: 'abc' };
    const result = getComputedTitle(session, media);
    assert.equal(result, 'en_us');
  });

  test('it returns `en_jp` for `romanized`', function(assert) {
    const result = getTitleField('romanized');
    assert.equal(result, 'en_jp');
  });

  test('it returns `en_cn` for `romanized` with Chinese media', function(assert) {
    const session = { hasUser: true, account: { titleLanguagePreference: 'romanized', language: 'en-us' } };
    const media = { titles: { en_cn: 'en_cn', en: 'en' }, canonicalTitle: 'abc' };
    const result = getComputedTitle(session, media);
    assert.equal(result, 'en_cn');
  });

  test('it returns `canonical` as default', function(assert) {
    const result = getTitleField('something_else');
    assert.equal(result, 'canonical');
  });

  test('it returns canonicalTitle when there is no session', function(assert) {
    const result = getComputedTitle({ hasUser: false }, { canonicalTitle: 'Hello, World!' });
    assert.equal(result, 'Hello, World!');
  });

  test('it returns session preference', function(assert) {
    const session = { hasUser: true, account: { titleLanguagePreference: 'romanized', language: 'en-us' } };
    const media = { titles: { en_jp: 'Shinjeki no Kyojin', en: 'Attack on Titan' }, canonicalTitle: 'Attack on Titan' };
    let result = getComputedTitle(session, media);
    assert.equal(result, 'Shinjeki no Kyojin');
    session.account.titleLanguagePreference = 'english';
    result = getComputedTitle(session, media);
    assert.equal(result, 'Attack on Titan');
    session.account.titleLanguagePreference = 'nothingburger';
    result = getComputedTitle(session, media);
    assert.equal(result, 'Attack on Titan');
  });
});
