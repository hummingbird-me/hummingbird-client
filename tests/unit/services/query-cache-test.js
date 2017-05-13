import { moduleFor, test } from 'ember-qunit';
import sinon from 'sinon';
import wait from 'ember-test-helpers/wait';
import moment from 'moment';

moduleFor('service:query-cache', 'Unit | Service | query cache');

test('query proxies to store#query', function(assert) {
  const service = this.subject({ store: { query: () => {} } });
  const query = { hello: 'world' };

  const stub = sinon.stub(service.store, 'query');
  stub.withArgs('model-type', query).resolves([]);

  service.query('model-type', query);
  assert.ok(stub.calledWith('model-type', query));
});

test('can determine if response should be cached', function(assert) {
  const service = this.subject({ store: { query: () => {} } });
  const query = { hello: 'world' };

  const stub = sinon.stub(service.store, 'query');
  stub.withArgs('model-type', query).resolves([1, 2, 3]);

  // no caching
  service.query('model-type', query, { cache: false });
  assert.ok(stub.calledWith('model-type', query));
  assert.ok(service.cache['model-type'][JSON.stringify(query)] === undefined);

  // caching
  service.query('model-type', query, { cache: true });
  assert.ok(stub.calledWith('model-type', query));
  return wait().then(() => {
    assert.ok(service.cache['model-type'][JSON.stringify(query)] !== undefined);
  });
});

test('can push records into the cache', function(assert) {
  const service = this.subject();
  const query = { hello: 'world' };
  const records = [1, 2, 3];
  service.push('model-type', query, records);
  const result = service.cache['model-type'][JSON.stringify(query)].promise._result;
  assert.deepEqual(result, records);
});

test('can invalidate a specific query', function(assert) {
  const service = this.subject();
  const query = { hello: 'world' };
  const records = [1, 2, 3];
  service.push('model-type', query, records);
  assert.ok(service.cache['model-type'][JSON.stringify(query)] !== undefined);
  service.invalidateQuery('model-type', query);
  assert.ok(service.cache['model-type'][JSON.stringify(query)] === undefined);
});

test('can invalidate a type bucket', function(assert) {
  const service = this.subject();
  const query = { hello: 'world' };
  const records = [1, 2, 3];
  service.push('model-type', query, records);
  assert.ok(service.cache['model-type'] !== undefined);
  service.invalidateType('model-type', query);
  assert.ok(service.cache['model-type'] === undefined);
});

test('_sortObject sorts an object and its children', function(assert) {
  const service = this.subject();
  const query = {
    zebra: 'last',
    alpha: 'first',
    charlie: {
      unicorn: 'last',
      dragon: 'first'
    }
  };
  const result = service._sortObject(query);
  assert.deepEqual(result, {
    alpha: 'first',
    charlie: {
      dragon: 'first',
      unicorn: 'last'
    },
    zebra: 'last'
  });
});

test('_getExpiryDate returns a date CACHE_TIME_HOUR in the future', function(assert) {
  const service = this.subject();
  const currentDate = new Date();
  const result = service._getExpiryDate();
  assert.ok(currentDate < result);
  const diff = moment(result).diff(moment(currentDate), 'hours');
  assert.equal(Math.abs(diff), 1);
});
