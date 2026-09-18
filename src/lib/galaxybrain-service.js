/**
 * Galaxy Brain API Service
 *
 * Unlike GitHub and Notion, Galaxy Brain is self-hosted: there is no single
 * origin to talk to and no OAuth app to authorize against. A person points the
 * extension at their own instance and pastes an API key minted from that
 * instance's Settings -> API keys page, so the key and the origin travel
 * together and both live in extension settings.
 */

import { getSettings } from './storage.js';

export class GalaxyBrainService {
  /**
   * Normalize a user-entered instance URL into an origin.
   * People paste "galaxybrain.info", a full workspace URL, or a trailing slash.
   * @param {string} value
   * @returns {string|null} origin, or null when unusable
   */
  static normalizeInstanceUrl(value) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const url = new URL(withScheme);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.origin;
    } catch {
      return null;
    }
  }

  /**
   * @returns {Promise<{origin: string, apiKey: string}>}
   * @throws when the destination has not been configured
   */
  static async getConfig() {
    const settings = await getSettings();
    const origin = GalaxyBrainService.normalizeInstanceUrl(settings.galaxyBrainUrl);
    const apiKey = settings.galaxyBrainApiKey;

    if (!origin) {
      throw new Error('Set your Galaxy Brain instance URL in settings first.');
    }
    if (!apiKey) {
      throw new Error('Add a Galaxy Brain API key in settings first.');
    }
    return { origin, apiKey };
  }

  /**
   * Send a capture to Galaxy Brain.
   *
   * @param {Object} capture
   * @param {string} capture.url - the page being captured
   * @param {string} [capture.title]
   * @param {string} [capture.content] - page text
   * @param {string} [capture.selection] - what the person highlighted
   * @param {string} [capture.note] - the transcribed voice note
   * @param {string[]} [capture.tags]
   * @returns {Promise<{id: string|null, title: string, url: string, capturedAt: string}>}
   */
  static async capture(capture) {
    const { origin, apiKey } = await GalaxyBrainService.getConfig();

    const response = await fetch(`${origin}/api/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: capture.url,
        title: capture.title,
        content: capture.content,
        selection: capture.selection,
        note: capture.note,
        tags: capture.tags,
        source: 'duly-noted'
      })
    });

    if (response.status === 401) {
      throw new Error('Galaxy Brain rejected the API key. Create a new one in Settings → API keys.');
    }
    if (response.status === 403) {
      throw new Error('This API key is not allowed to capture. Create one with capture access.');
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`Galaxy Brain error: ${response.status} - ${body.error || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Verify an instance URL and key without storing anything.
   *
   * Sends a deliberately invalid capture: the endpoint authenticates before it
   * validates, so 401 and 403 identify a bad key while 400 proves the key was
   * accepted and only the body was rejected. Nothing is written either way.
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  static async testConnection(instanceUrl, apiKey) {
    const origin = GalaxyBrainService.normalizeInstanceUrl(instanceUrl);
    if (!origin) return { ok: false, error: 'That does not look like a valid URL.' };
    if (!apiKey) return { ok: false, error: 'Enter an API key.' };

    let response;
    try {
      response = await fetch(`${origin}/api/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
    } catch {
      return { ok: false, error: 'Could not reach that instance.' };
    }

    if (response.status === 401) return { ok: false, error: 'That API key was rejected.' };
    if (response.status === 403) return { ok: false, error: 'That key is not allowed to capture.' };
    if (response.status === 404) return { ok: false, error: 'No Galaxy Brain found at that URL.' };
    if (response.status === 400) return { ok: true };
    if (response.ok) return { ok: true };
    return { ok: false, error: `Unexpected response: ${response.status}` };
  }
}
