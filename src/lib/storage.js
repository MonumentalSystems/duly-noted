/**
 * Chrome Storage Wrapper
 * Provides convenient methods for storing and retrieving extension data
 */

// Storage keys
export const STORAGE_KEYS = {
  DRAFTS: 'drafts',
  HISTORY: 'history',
  SETTINGS: 'settings',
  CURRENT_RECORDING: 'current_recording',
  LAST_DESTINATION: 'last_destination',
};

/**
 * Get data from chrome.storage.local
 * @param {string} key - Storage key
 * @returns {Promise<any>} Stored value or null
 */
export async function getLocal(key) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
  } catch (error) {
    console.error(`[Storage] Error getting ${key}:`, error);
    return null;
  }
}

/**
 * Set data in chrome.storage.local
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {Promise<boolean>} Success status
 */
export async function setLocal(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
    return true;
  } catch (error) {
    console.error(`[Storage] Error setting ${key}:`, error);
    return false;
  }
}

/**
 * Remove data from chrome.storage.local
 * @param {string} key - Storage key
 * @returns {Promise<boolean>} Success status
 */
export async function removeLocal(key) {
  try {
    await chrome.storage.local.remove(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Error removing ${key}:`, error);
    return false;
  }
}

/**
 * Get data from chrome.storage.session (cleared when browser closes)
 * @param {string} key - Storage key
 * @returns {Promise<any>} Stored value or null
 */
export async function getSession(key) {
  try {
    const result = await chrome.storage.session.get(key);
    return result[key] ?? null;
  } catch (error) {
    console.error(`[Storage] Error getting session ${key}:`, error);
    return null;
  }
}

/**
 * Set data in chrome.storage.session
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {Promise<boolean>} Success status
 */
export async function setSession(key, value) {
  try {
    await chrome.storage.session.set({ [key]: value });
    return true;
  } catch (error) {
    console.error(`[Storage] Error setting session ${key}:`, error);
    return false;
  }
}

/**
 * Clear all session data
 * @returns {Promise<boolean>} Success status
 */
export async function clearSession() {
  try {
    await chrome.storage.session.clear();
    return true;
  } catch (error) {
    console.error('[Storage] Error clearing session:', error);
    return false;
  }
}

// ============================================================================
// Drafts Management
// ============================================================================

/**
 * Get all drafts
 * @returns {Promise<Array>} Array of draft objects
 */
export async function getDrafts() {
  const drafts = await getLocal(STORAGE_KEYS.DRAFTS);
  return drafts || [];
}

/**
 * Save a new draft
 * @param {Object} draft - Draft object
 * @param {string} draft.id - UUID
 * @param {number} draft.timestamp - Unix timestamp
 * @param {string} draft.transcription - Transcribed text
 * @param {string} [draft.refinedText] - LLM-refined text
 * @returns {Promise<boolean>} Success status
 */
export async function saveDraft(draft) {
  const drafts = await getDrafts();
  drafts.unshift(draft); // Add to beginning (most recent first)
  return await setLocal(STORAGE_KEYS.DRAFTS, drafts);
}

/**
 * Update an existing draft
 * @param {string} draftId - Draft ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateDraft(draftId, updates) {
  const drafts = await getDrafts();
  const index = drafts.findIndex(d => d.id === draftId);

  if (index === -1) {
    console.error(`[Storage] Draft ${draftId} not found`);
    return false;
  }

  drafts[index] = { ...drafts[index], ...updates };
  return await setLocal(STORAGE_KEYS.DRAFTS, drafts);
}

/**
 * Delete a draft
 * @param {string} draftId - Draft ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteDraft(draftId) {
  const drafts = await getDrafts();
  const filtered = drafts.filter(d => d.id !== draftId);
  return await setLocal(STORAGE_KEYS.DRAFTS, filtered);
}

// ============================================================================
// History Management
// ============================================================================

/**
 * Get all history items (sent notes)
 * @returns {Promise<Array>} Array of history items
 */
export async function getHistory() {
  const history = await getLocal(STORAGE_KEYS.HISTORY);
  return history || [];
}

/**
 * Add item to history
 * @param {Object} item - History item
 * @param {string} item.id - UUID
 * @param {number} item.timestamp - Unix timestamp
 * @param {string} item.transcription - Transcribed text
 * @param {string} item.destination - Destination type
 * @param {string} item.status - 'sent' or 'draft'
 * @param {string} [item.artifactUrl] - Link to created artifact
 * @param {Object} [item.metadata] - Destination-specific metadata
 * @returns {Promise<boolean>} Success status
 */
export async function addToHistory(item) {
  const history = await getHistory();
  history.unshift(item); // Add to beginning (most recent first)

  // Keep only last 1000 items to prevent storage bloat
  const trimmed = history.slice(0, 1000);

  return await setLocal(STORAGE_KEYS.HISTORY, trimmed);
}

/**
 * Delete history item
 * @param {string} itemId - History item ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteHistoryItem(itemId) {
  const history = await getHistory();
  const filtered = history.filter(h => h.id !== itemId);
  return await setLocal(STORAGE_KEYS.HISTORY, filtered);
}

/**
 * Clear all history
 * @returns {Promise<boolean>} Success status
 */
export async function clearHistory() {
  return await setLocal(STORAGE_KEYS.HISTORY, []);
}

// ============================================================================
// Settings Management
// ============================================================================

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  // GitHub
  githubToken: null,
  githubDefaultRepo: null,
  githubDefaultLabels: ['voice-note'],

  // OneNote
  onenoteToken: null,
  onenoteDefaultNotebook: null,
  onenoteDefaultSection: null,

  // Galaxy Brain (self-hosted: origin and key travel together)
  galaxyBrainUrl: null,
  galaxyBrainApiKey: null,

  // LLM
  llmProvider: 'openrouter', // 'openrouter' | 'zai' | 'claude-code'
  llmApiKey: null,
  llmModel: 'anthropic/claude-3.5-sonnet',

  // Transcription
  transcriptionLanguage: 'en',
  maxRecordingDuration: 300, // 5 minutes in seconds

  // UI
  lastDestination: null, // Remember last used destination
  theme: 'auto', // 'light' | 'dark' | 'auto'

  // AI
  aiSummaryEnabled: true, // Master toggle for AI-powered capture analysis
  aiAutoTitle: true,       // AI auto-fills issue title
  aiAutoTags: true,        // AI auto-suggests labels
  aiAutoDescription: true, // AI auto-fills note box with description

  // GitHub Defaults
  defaultTags: [],         // Labels always added to every GitHub issue
};

/**
 * Get all settings
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
  const settings = await getLocal(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
}

/**
 * Update settings
 * @param {Object} updates - Settings to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateSettings(updates) {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  return await setLocal(STORAGE_KEYS.SETTINGS, updated);
}

/**
 * Reset settings to defaults
 * @returns {Promise<boolean>} Success status
 */
export async function resetSettings() {
  return await setLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

/**
 * Check if a specific integration is configured
 * @param {string} integration - 'github' | 'onenote' | 'notion' | 'llm'
 * @returns {Promise<boolean>} Configuration status
 */
export async function isIntegrationConfigured(integration) {
  const settings = await getSettings();

  switch (integration) {
    case 'github':
      return !!settings.githubToken;
    case 'onenote':
      return !!settings.onenoteToken;
    case 'llm':
      return !!settings.llmApiKey;
    case 'galaxy-brain':
      return !!settings.galaxyBrainUrl && !!settings.galaxyBrainApiKey;
    default:
      return false;
  }
}

// ============================================================================
// Storage Quota Management
// ============================================================================

/**
 * Get storage quota information
 * @returns {Promise<Object>} Storage quota info
 */
export async function getStorageQuota() {
  try {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
    const percentUsed = (bytesInUse / quota) * 100;

    return {
      bytesInUse,
      quota,
      percentUsed: percentUsed.toFixed(2),
      available: quota - bytesInUse,
    };
  } catch (error) {
    console.error('[Storage] Error getting quota:', error);
    return {
      bytesInUse: 0,
      quota: 5242880,
      percentUsed: 0,
      available: 5242880,
    };
  }
}

/**
 * Check if storage is nearly full (>80%)
 * @returns {Promise<boolean>} True if storage is nearly full
 */
export async function isStorageNearlyFull() {
  const quota = await getStorageQuota();
  return quota.percentUsed > 80;
}
