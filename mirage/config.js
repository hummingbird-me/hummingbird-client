/* eslint-disable no-param-reassign */
function _defineRoutes(server) {
  server.passthrough('/write-coverage');

  // authentication
  server.post('/api/oauth/token', {});

  // Forums
  server.get('https://forums.hummingbird.me/c/industry-news.json', {});

  // API Routes
  server.namespace = '/api/edge';

  server.get('/feeds/:type/:id', { data: [] });

  server.get('/anime');
  server.get('/anime/:id');
  server.get('/anime/:id/_languages', () => []);

  server.get('/genres');
  server.get('/streamers');
  server.get('/reviews', { data: [] });
  server.get('/streaming-links', { data: [] });
  server.get('/media-follows', { data: [] });
  server.get('/library-entries', { data: [] });
  server.post('/library-entries');

  server.get('/users');
  server.get('/users/:id');
  server.post('/users');

  server.get('/trending/:namespace', { data: [] });
  server.get('/castings', { data: [] });
}

// test
export function testConfig() {
  _defineRoutes(this);
}

// development
export default function() {
}
