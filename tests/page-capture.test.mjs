import assert from 'node:assert/strict';
import test from 'node:test';

import { capturePageOrFallback } from '../src/lib/page-capture.js';

const tab = {
  id: 42,
  url: 'https://blocked.example/article',
  title: 'Blocked article'
};

test('uses the plain-text capture when structured capture is denied', async () => {
  const result = await capturePageOrFallback({
    tab,
    captureStructured: async () => { throw new Error('denied'); },
    captureText: async () => ({ text: 'Readable page text', selection: 'Selected text' }),
    now: () => new Date('2026-10-02T12:00:00.000Z')
  });

  assert.equal(result.format, 'text');
  assert.equal(result.content, 'Readable page text');
  assert.equal(result.selection, 'Selected text');
  assert.equal(result.url, tab.url);
});

test('returns URL and title fallback when both scripting attempts are denied', async () => {
  let structuredAttempts = 0;
  let textAttempts = 0;
  const result = await capturePageOrFallback({
    tab,
    captureStructured: async () => {
      structuredAttempts += 1;
      throw new Error('content scripts denied');
    },
    captureText: async () => {
      textAttempts += 1;
      throw new Error('script injection denied');
    },
    now: () => new Date('2026-10-02T12:00:00.000Z')
  });

  assert.equal(structuredAttempts, 1);
  assert.equal(textAttempts, 1);
  assert.deepEqual(result, {
    url: tab.url,
    title: tab.title,
    format: 'text',
    content: 'Blocked article\n\nhttps://blocked.example/article',
    selection: '',
    capturedAt: '2026-10-02T12:00:00.000Z',
    imageCount: 0,
    simplified: true
  });
});
