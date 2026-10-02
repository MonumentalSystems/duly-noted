import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.chrome = {
  storage: {
    local: {
      async get(key) {
        return {
          [key]: {
            galaxyBrainUrl: 'https://galaxybrain.example/workspace',
            galaxyBrainApiKey: 'gb_live_test'
          }
        };
      }
    }
  }
};

const { GalaxyBrainService } = await import('../src/lib/galaxybrain-service.js');

test('normalizes a configured Galaxy Brain instance to its origin', () => {
  assert.equal(
    GalaxyBrainService.normalizeInstanceUrl('galaxybrain.example/workspace/'),
    'https://galaxybrain.example'
  );
  assert.equal(GalaxyBrainService.normalizeInstanceUrl('file:///tmp/brain'), null);
});

test('sends an exact HTML web clip with a stable idempotency key', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 201,
      async json() {
        return {
          id: 'capture-1',
          title: 'Example',
          url: 'https://example.com/article',
          capturedAt: '2026-10-02T12:00:00.000Z'
        };
      }
    };
  };

  try {
    await GalaxyBrainService.capture({
      url: 'https://example.com/article',
      title: 'Example',
      format: 'html',
      content: '<!doctype html><html><body><img src="https://example.com/image.png"></body></html>',
      selection: 'important sentence',
      note: 'Read this later',
      tags: ['research'],
      capturedAt: '2026-10-02T12:00:00.000Z',
      idempotencyKey: 'duly-noted:test-capture-1'
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(request.url, 'https://galaxybrain.example/api/capture');
  assert.equal(request.options.headers.Authorization, 'Bearer gb_live_test');
  assert.equal(request.options.headers['Idempotency-Key'], 'duly-noted:test-capture-1');
  assert.deepEqual(JSON.parse(request.options.body), {
    url: 'https://example.com/article',
    title: 'Example',
    format: 'html',
    content: '<!doctype html><html><body><img src="https://example.com/image.png"></body></html>',
    selection: 'important sentence',
    note: 'Read this later',
    tags: ['research'],
    source: 'duly-noted',
    capturedAt: '2026-10-02T12:00:00.000Z'
  });
});

test('explains an idempotency conflict', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 409 });

  try {
    await assert.rejects(
      GalaxyBrainService.capture({
        url: 'https://example.com',
        content: 'Example',
        idempotencyKey: 'duly-noted:test-conflict'
      }),
      /conflicting retry/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
