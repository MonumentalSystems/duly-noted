/**
 * Voice Starter Side Panel
 * Main UI controller
 */

import { getDrafts, getHistory, getSettings, updateSettings, resetSettings } from '../lib/storage.js';
import { formatRelativeTime, getDestinationIcon, truncateText } from '../utils/helpers.js';
import { TranscriptionService } from '../lib/transcription-service.js';
import { WhisperTranscriptionService } from '../lib/whisper-transcription-service.js';
import { GitHubOAuth } from '../lib/github-oauth.js';
import { GitHubService } from '../lib/github-service.js';
import { GitHubCache } from '../lib/github-cache.js';
import { NotionOAuth } from '../lib/notion-oauth.js';
import { NotionService } from '../lib/notion-service.js';
import { GalaxyBrainService } from '../lib/galaxybrain-service.js';

console.log('[Side Panel] Loading...');

// Initialize transcription service
let transcriptionService = null;

// ============================================================================
// Screen Management
// ============================================================================

const screens = {
  RECORDING: 'recordingScreen',
  DESTINATION: 'destinationScreen',
  GITHUB_ISSUE: 'githubIssueScreen',
  GITHUB_PROJECT: 'githubProjectScreen',
  HISTORY: 'historyScreen',
  SETTINGS: 'settingsScreen',
};

let currentScreen = screens.RECORDING;

function showScreen(screenId) {
  // Hide all screens
  Object.values(screens).forEach(id => {
    const screen = document.getElementById(id);
    if (screen) {
      screen.classList.remove('active');
    }
  });

  // Show requested screen
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.add('active');
    currentScreen = screenId;
    console.log('[Side Panel] Showing screen:', screenId);
  }
}

// ============================================================================
// Recording State
// ============================================================================

let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let currentTranscription = '';
let _previousFocus = null;

// Audio visualizer instance (initialized in init())
let visualizer = null;

// ============================================================================
// UI Elements
// ============================================================================

// Buttons
const recordBtn = document.getElementById('recordBtn');
const recordBtnText = document.getElementById('recordBtnText');
const settingsBtn = document.getElementById('settingsBtn');
const historyBtn = document.getElementById('historyBtn');
const backToRecordingBtn = document.getElementById('backToRecordingBtn');
const backFromHistoryBtn = document.getElementById('backFromHistoryBtn');
const backFromSettingsBtn = document.getElementById('backFromSettingsBtn');
const sendBtn = document.getElementById('sendBtn');
const discardBtn = document.getElementById('discardBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');

// Containers
const recordingStatus = document.getElementById('recordingStatus');
const recordingTimer = document.getElementById('recordingTimer');
const noteBox = document.getElementById('noteBox');
const historyList = document.getElementById('historyList');
const destinationTranscriptionPreview = document.getElementById('destinationTranscriptionPreview');

// Forms
const githubTokenInput = document.getElementById('githubToken');
const maxDurationInput = document.getElementById('maxDuration');

// Theme switcher
const themeSwitcher = document.getElementById('themeSwitcher');

// Page Context Tools elements
const captureScreenshotBtn = document.getElementById('captureScreenshotBtn');
const selectElementBtn = document.getElementById('selectElementBtn');
const captureConsoleBtn = document.getElementById('captureConsoleBtn');
const attachmentsPreview = document.getElementById('attachmentsPreview');
const issueAttachments = document.getElementById('issueAttachments');
const issueAttachmentsPreview = document.getElementById('issueAttachmentsPreview');

// Page Context state
let capturedScreenshots = [];
let capturedElement = null;
let capturedConsoleLogs = [];
let consoleMonitoringTabId = null;

// AI Summary state
let aiSummary = null;
let aiSummaryDebounceTimer = null;

// AI Summary elements
const aiSummaryToggle = document.getElementById('aiSummaryToggle');
const aiAutoTitleToggle = document.getElementById('aiAutoTitleToggle');
const aiAutoTagsToggle = document.getElementById('aiAutoTagsToggle');
const aiAutoDescriptionToggle = document.getElementById('aiAutoDescriptionToggle');
const aiSubToggles = document.getElementById('aiSubToggles');
const aiSummaryCard = document.getElementById('aiSummaryCard');
const aiSummaryContent = document.getElementById('aiSummaryContent');
const aiSummaryTags = document.getElementById('aiSummaryTags');

// Default tags elements
const defaultTagsContainer = document.getElementById('defaultTagsContainer');
const defaultTagsInput = document.getElementById('defaultTagsInput');

// GitHub OAuth elements
const githubOAuthSection = document.getElementById('githubOAuthSection');
const githubNotConnected = document.getElementById('githubNotConnected');
const githubConnected = document.getElementById('githubConnected');
const githubSignInBtn = document.getElementById('githubSignInBtn');
const githubSignOutBtn = document.getElementById('githubSignOutBtn');
const githubUsername = document.getElementById('githubUsername');
const githubAvatar = document.getElementById('githubAvatar');
const developerModeToggle = document.getElementById('developerModeToggle');
const githubDeveloperSection = document.getElementById('githubDeveloperSection');
const testGitHubBtn = document.getElementById('testGitHubBtn');

// Galaxy Brain elements
const galaxyBrainUrlInput = document.getElementById('galaxyBrainUrl');
const galaxyBrainApiKeyInput = document.getElementById('galaxyBrainApiKey');
const testGalaxyBrainBtn = document.getElementById('testGalaxyBrainBtn');

// Notion OAuth elements
const notionOAuthSection = document.getElementById('notionOAuthSection');
const notionNotConnected = document.getElementById('notionNotConnected');
const notionConnected = document.getElementById('notionConnected');
const notionSignInBtn = document.getElementById('notionSignInBtn');
const notionSignOutBtn = document.getElementById('notionSignOutBtn');
const notionWorkspaceName = document.getElementById('notionWorkspaceName');
const notionWorkspaceIcon = document.getElementById('notionWorkspaceIcon');

// GitHub Issue form elements
const backFromGitHubIssueBtn = document.getElementById('backFromGitHubIssueBtn');
const githubRepoSearch = document.getElementById('githubRepoSearch');
const repoList = document.getElementById('repoList');
const recentReposList = document.getElementById('recentReposList');
const allReposList = document.getElementById('allReposList');
const selectedRepoId = document.getElementById('selectedRepoId');
const issueTitle = document.getElementById('issueTitle');
const issueBody = document.getElementById('issueBody');
const labelSearchInput = document.getElementById('labelSearchInput');
const labelDropdown = document.getElementById('labelDropdown');
const selectedLabelsContainer = document.getElementById('selectedLabelsContainer');
const createIssueBtn = document.getElementById('createIssueBtn');
const cancelIssueBtn = document.getElementById('cancelIssueBtn');

// GitHub Project form elements
const backFromGitHubProjectBtn = document.getElementById('backFromGitHubProjectBtn');
const githubProjectSearch = document.getElementById('githubProjectSearch');
const projectList = document.getElementById('projectList');
const recentProjectsList = document.getElementById('recentProjectsList');
const allProjectsList = document.getElementById('allProjectsList');
const selectedProjectId = document.getElementById('selectedProjectId');
const projectItemTitle = document.getElementById('projectItemTitle');
const projectItemBody = document.getElementById('projectItemBody');
const createProjectItemBtn = document.getElementById('createProjectItemBtn');
const cancelProjectItemBtn = document.getElementById('cancelProjectItemBtn');

// History Detail Modal elements
const historyDetailModal = document.getElementById('historyDetailModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeModalBtnFooter = document.getElementById('closeModalBtnFooter');
const modalTitle = document.getElementById('modalTitle');
const modalTranscription = document.getElementById('modalTranscription');
const modalDestination = document.getElementById('modalDestination');
const modalLink = document.getElementById('modalLink');
const modalLinkSection = document.getElementById('modalLinkSection');

// ============================================================================
// Event Listeners
// ============================================================================

// Navigation
settingsBtn.addEventListener('click', () => {
  showScreen(screens.SETTINGS);
  loadSettings();
});

historyBtn.addEventListener('click', () => {
  showScreen(screens.HISTORY);
  loadHistory();
});

backToRecordingBtn.addEventListener('click', () => showScreen(screens.RECORDING));
backFromHistoryBtn.addEventListener('click', () => showScreen(screens.RECORDING));
backFromSettingsBtn.addEventListener('click', () => showScreen(screens.RECORDING));

// Recording
recordBtn.addEventListener('click', handleRecordButtonClick);

// Note box input — update currentTranscription and enable/disable action buttons
noteBox.addEventListener('input', () => {
  currentTranscription = noteBox.textContent.trim();
  updateActionButtons();
});

// Action buttons (always visible, enabled when content exists)
sendBtn.addEventListener('click', async () => {
  currentTranscription = noteBox.textContent.trim();
  await showDestinationChooser();
});

discardBtn.addEventListener('click', () => {
  resetRecordingUI();
  showToast('Discarded', 'info');
});

// Destination options
document.querySelectorAll('.destination-option').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const destination = e.currentTarget.getAttribute('data-destination');
    await handleDestinationSelected(destination);
  });
});

// Settings
saveSettingsBtn.addEventListener('click', handleSaveSettings);
resetSettingsBtn.addEventListener('click', handleResetSettings);

// Theme switcher
themeSwitcher.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-theme]');
  if (!btn) return;
  const theme = btn.getAttribute('data-theme');
  applyTheme(theme);
  updateThemeSwitcherUI(theme);
  await updateSettings({ theme });
});

// GitHub OAuth
githubSignInBtn.addEventListener('click', handleGitHubSignIn);
githubSignOutBtn.addEventListener('click', handleGitHubSignOut);
developerModeToggle.addEventListener('change', handleDeveloperModeToggle);
testGitHubBtn.addEventListener('click', handleTestGitHubConnection);
testGalaxyBrainBtn.addEventListener('click', handleTestGalaxyBrainConnection);

// Notion OAuth
notionSignInBtn.addEventListener('click', handleNotionSignIn);
notionSignOutBtn.addEventListener('click', handleNotionSignOut);

// GitHub Issue form
backFromGitHubIssueBtn.addEventListener('click', () => showScreen(screens.DESTINATION));
cancelIssueBtn.addEventListener('click', () => showScreen(screens.DESTINATION));
createIssueBtn.addEventListener('click', handleCreateIssue);
githubRepoSearch.addEventListener('input', handleRepoSearch);
githubRepoSearch.addEventListener('focus', () => showRepoDropdown());
githubRepoSearch.addEventListener('blur', () => {
  // Delay to allow click on repo item
  setTimeout(() => hideRepoDropdown(), 300);
});

// Label picker
labelSearchInput.addEventListener('input', handleLabelSearch);
labelSearchInput.addEventListener('focus', () => showLabelDropdown());
labelSearchInput.addEventListener('blur', () => {
  setTimeout(() => hideLabelDropdown(), 300);
});
labelSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const query = labelSearchInput.value.trim();
    if (query) {
      addSelectedLabel(query, null);
      labelSearchInput.value = '';
      hideLabelDropdown();
    }
  }
});

// GitHub Project form
backFromGitHubProjectBtn.addEventListener('click', () => showScreen(screens.DESTINATION));
cancelProjectItemBtn.addEventListener('click', () => showScreen(screens.DESTINATION));
createProjectItemBtn.addEventListener('click', handleCreateProjectItem);
githubProjectSearch.addEventListener('input', handleProjectSearch);
githubProjectSearch.addEventListener('focus', () => showProjectDropdown());
githubProjectSearch.addEventListener('blur', () => {
  setTimeout(() => hideProjectDropdown(), 300);
});

// Note: OAuth callback is now handled directly by chrome.identity.launchWebAuthFlow
// No need for message listeners

// Page Context Tools
captureScreenshotBtn.addEventListener('click', handleCaptureScreenshot);
selectElementBtn.addEventListener('click', handleSelectElement);
captureConsoleBtn.addEventListener('click', handleCaptureConsole);

// AI Summary dismiss
document.getElementById('dismissAISummary')?.addEventListener('click', () => {
  aiSummary = null;
  renderAISummaryUI();
});

// AI master toggle → enable/disable sub-toggles
aiSummaryToggle.addEventListener('change', () => {
  aiSubToggles.classList.toggle('disabled', !aiSummaryToggle.checked);
});

// Default tags input — Enter to add pill
defaultTagsInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const tag = defaultTagsInput.value.trim();
    if (tag) {
      addDefaultTagPill(tag);
      defaultTagsInput.value = '';
    }
  }
});

// --- Default tags pill helpers (settings section) ---
function addDefaultTagPill(tag) {
  // Prevent duplicates
  const existing = defaultTagsContainer.querySelectorAll('.label-pill');
  for (const pill of existing) {
    if (pill.getAttribute('data-label').toLowerCase() === tag.toLowerCase()) return;
  }

  const pill = document.createElement('span');
  pill.className = 'label-pill';
  pill.setAttribute('data-label', tag);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'label-pill-name';
  nameSpan.textContent = tag;
  pill.appendChild(nameSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'label-pill-remove';
  removeBtn.type = 'button';
  removeBtn.innerHTML = '&times;';
  removeBtn.setAttribute('aria-label', `Remove default label ${tag}`);
  removeBtn.addEventListener('click', () => pill.remove());
  pill.appendChild(removeBtn);

  defaultTagsContainer.appendChild(pill);
}

function getDefaultTagsFromPills() {
  const pills = defaultTagsContainer.querySelectorAll('.label-pill');
  return Array.from(pills).map(p => p.getAttribute('data-label'));
}

// Listen for messages from content scripts (via service worker)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ELEMENT_SELECTED') {
    capturedElement = message.data;
    updateAttachmentsPreview();
    updateActionButtons();
    showToast('Element captured!', 'success');
    triggerAISummary();
  }
  if (message.type === 'ELEMENT_SELECTION_CANCELLED') {
    showToast('Element selection cancelled', 'info');
  }
});

// History Detail Modal
closeModalBtn.addEventListener('click', hideHistoryDetailModal);
closeModalBtnFooter.addEventListener('click', hideHistoryDetailModal);
historyDetailModal.addEventListener('click', (e) => {
  // Close if clicking overlay (outside modal content)
  if (e.target === historyDetailModal || e.target.classList.contains('modal-overlay')) {
    hideHistoryDetailModal();
  }
});

// Keyboard handler for modal (Escape to close, Tab trap)
document.addEventListener('keydown', (e) => {
  if (historyDetailModal.style.display === 'none') return;

  if (e.key === 'Escape') {
    hideHistoryDetailModal();
    return;
  }

  // Focus trap within modal
  if (e.key === 'Tab') {
    const focusable = historyDetailModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
});

// ============================================================================
// Recording Functions
// ============================================================================

async function handleRecordButtonClick() {
  if (!isRecording) {
    await startRecording();
  } else {
    await stopRecording();
  }
}

// Detect if we should use whisper WASM instead of Web Speech API
// Brave exposes webkitSpeechRecognition but blocks the network requests,
// so we must also check for Brave explicitly
const useWhisperWasm = !TranscriptionService.isSupported() || TranscriptionService.isBrave();

async function startRecording() {
  console.log('[Side Panel] Starting recording...', useWhisperWasm ? '(Whisper WASM)' : '(Web Speech API)');

  try {
    if (useWhisperWasm) {
      // Whisper WASM path - microphone permission handled in offscreen document
      // Still need to check/request permission from sidepanel context first
      let permissionGranted = false;
      try {
        const permStatus = await navigator.permissions.query({ name: 'microphone' });
        permissionGranted = permStatus.state === 'granted';
      } catch (e) {
        console.log('[Side Panel] Could not query mic permission, opening popup');
      }

      if (permissionGranted) {
        actuallyStartRecording();
        return;
      }

      // Open permission popup
      const permissionUrl = chrome.runtime.getURL('src/permission/permission.html');
      await chrome.windows.create({
        url: permissionUrl,
        type: 'popup',
        width: 470,
        height: 520,
        focused: true
      });

      showToast('Please grant microphone permission in the popup window', 'info');
      return;
    }

    // Web Speech API path (Chrome/Edge)
    // Check if microphone permission is already granted
    let permissionGranted = false;
    try {
      const permStatus = await navigator.permissions.query({ name: 'microphone' });
      permissionGranted = permStatus.state === 'granted';
    } catch (e) {
      // permissions.query may not support 'microphone' in all browsers — fall through to popup
      console.log('[Side Panel] Could not query mic permission, opening popup');
    }

    if (permissionGranted) {
      // Already have permission — start recording directly
      console.log('[Side Panel] Mic permission already granted, skipping popup');
      actuallyStartRecording();
      return;
    }

    // Open permission popup window to request microphone access
    // Side panels cannot show permission prompts, so we need a popup
    const permissionUrl = chrome.runtime.getURL('src/permission/permission.html');
    await chrome.windows.create({
      url: permissionUrl,
      type: 'popup',
      width: 470,
      height: 520,
      focused: true
    });

    showToast('Please grant microphone permission in the popup window', 'info');
    // The permission popup will notify us when permission is granted

  } catch (error) {
    console.error('[Side Panel] Error opening permission popup:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Listen for permission granted message
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PERMISSION_GRANTED') {
    console.log('[Side Panel] Permission granted, starting recording');
    actuallyStartRecording();
  }
});

async function actuallyStartRecording() {
  try {
    // Get settings for language
    const settings = await getSettings();

    // Initialize transcription service based on browser support
    if (useWhisperWasm) {
      console.log('[Side Panel] Using Whisper WASM transcription');
      transcriptionService = new WhisperTranscriptionService({
        language: settings.transcriptionLanguage || 'en',
      });
    } else {
      console.log('[Side Panel] Using Web Speech API transcription');
      transcriptionService = new TranscriptionService({
        language: settings.transcriptionLanguage || 'en-US',
        continuous: true,
        interimResults: true
      });
    }

    // Set up event handlers
    transcriptionService.onInterimTranscript = (text, confidence) => {
      // Show interim results in lighter color
      const interim = document.createElement('span');
      interim.className = 'interim-text';
      interim.style.color = 'var(--text-secondary)';
      interim.textContent = text;

      // Replace previous interim text
      const existingInterim = noteBox.querySelector('.interim-text');
      if (existingInterim) {
        existingInterim.remove();
      }
      noteBox.appendChild(interim);
    };

    transcriptionService.onFinalTranscript = (text, confidence) => {
      console.log('[Side Panel] Final transcript:', text, 'confidence:', confidence);

      // Remove interim text
      const existingInterim = noteBox.querySelector('.interim-text');
      if (existingInterim) {
        existingInterim.remove();
      }

      // Add final text
      if (noteBox.textContent) {
        noteBox.textContent += ' ' + text;
      } else {
        noteBox.textContent = text;
      }

      // Update current transcription
      currentTranscription = noteBox.textContent.trim();
    };

    transcriptionService.onError = (error, type) => {
      console.error('[Side Panel] Transcription error:', error, type);

      // Stop recording on error
      if (isRecording) {
        stopRecording();
      }

      if (type === 'not-allowed') {
        showToast('Microphone access denied. Please allow microphone access and try again.', 'error', 8000);
      } else if (type === 'no-speech') {
        showToast('No speech detected. Please speak clearly and try again.', 'warning');
      } else if (type === 'network') {
        showToast('Network error. Web Speech API requires internet connection.', 'error');
      } else {
        showToast(`Error: ${error.message}`, 'error');
      }
    };

    transcriptionService.onStart = () => {
      console.log('[Side Panel] Transcription started');
      isRecording = true;
      recordingStartTime = Date.now();

      // Update UI
      recordBtn.classList.remove('btn-primary');
      recordBtn.classList.add('btn-danger');
      recordBtnText.textContent = 'Stop Recording';
      recordBtn.setAttribute('aria-label', 'Stop recording');

      recordingStatus.querySelector('.status-text').textContent = 'Recording...';

      recordingTimer.style.display = 'block';
      noteBox.textContent = '';

      // Start dynamic audio visualizer
      if (visualizer) visualizer.connectAudio();

      // Start timer
      startTimer();

      showToast('Recording started - speak now!', 'success');
    };

    transcriptionService.onStop = () => {
      console.log('[Side Panel] Transcription stopped');
    };

    // Start transcription
    await transcriptionService.start();

  } catch (error) {
    console.error('[Side Panel] Error starting recording:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function stopRecording() {
  console.log('[Side Panel] Stopping recording...');

  try {
    // Stop transcription service
    // Keep a reference so we can wait for whisper's final result
    const stoppingService = transcriptionService;
    if (transcriptionService) {
      // For whisper: always call stop() even if isListening() is false,
      // because _isListening only becomes true after the STARTED message
      // arrives from the offscreen doc, which may be delayed during model init.
      if (useWhisperWasm) {
        transcriptionService.stop();
      } else if (transcriptionService.isListening()) {
        transcriptionService.stop();
      }
      transcriptionService.dispose();
      transcriptionService = null;
    }

    isRecording = false;
    stopTimer();

    // Update UI
    recordBtn.classList.remove('btn-danger');
    recordBtn.classList.add('btn-primary');
    recordBtnText.textContent = 'Start Recording';
    recordBtn.setAttribute('aria-label', 'Start recording');

    recordingStatus.querySelector('.status-text').textContent = 'Recording Complete';

    recordingTimer.style.display = 'none';

    // Stop audio visualizer (returns to idle blob)
    if (visualizer) visualizer.disconnectAudio();

    // Remove any interim text
    const existingInterim = noteBox.querySelector('.interim-text');
    if (existingInterim) {
      existingInterim.remove();
    }

    // If using whisper WASM, wait for the final result to arrive
    // (whisper processes audio in batches, so the result comes a few seconds after stop)
    if (useWhisperWasm && stoppingService?.waitForFinalResult) {
      recordingStatus.querySelector('.status-text').textContent = 'Processing audio...';
      await stoppingService.waitForFinalResult();
    }

    // Get final transcription
    currentTranscription = noteBox.textContent.trim();

    if (!currentTranscription) {
      showToast('No speech detected. Please try again.', 'warning');
      return;
    }

    showToast('Recording complete — edit your note or choose a destination', 'success');

    // Enable action buttons since we now have content
    updateActionButtons();

  } catch (error) {
    console.error('[Side Panel] Error stopping recording:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    recordingTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/**
 * Reset recording UI to initial state after a note is sent or discarded.
 * Hides the transcription box and post-recording actions, clears text,
 * and resets the status line.
 */
function resetRecordingUI() {
  currentTranscription = '';
  noteBox.textContent = '';
  recordingStatus.querySelector('.status-text').textContent = 'Ready to Record';

  // Clear page context attachments
  capturedScreenshots = [];
  capturedElement = null;
  capturedConsoleLogs = [];
  consoleMonitoringTabId = null;
  attachmentsPreview.innerHTML = '';

  // Clear AI summary
  aiSummary = null;
  if (aiSummaryDebounceTimer) {
    clearTimeout(aiSummaryDebounceTimer);
    aiSummaryDebounceTimer = null;
  }
  renderAISummaryUI();

  // Disable action buttons
  updateActionButtons();
}

/**
 * Enable/disable send+discard buttons based on whether there's any content.
 * Content = text in noteBox OR captured screenshots/element/console logs.
 */
function updateActionButtons() {
  const hasText = noteBox.textContent.trim().length > 0;
  const hasAttachments = capturedScreenshots.length > 0 || capturedElement !== null || capturedConsoleLogs.length > 0;
  const hasContent = hasText || hasAttachments;

  sendBtn.disabled = !hasContent;
  discardBtn.disabled = !hasContent;
}

// ============================================================================
// Simplex Noise (lightweight 2D implementation for organic blob movement)
// ============================================================================

const SimplexNoise = (() => {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const grad3 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];

  class Simplex {
    constructor(seed = Math.random()) {
      this.perm = new Uint8Array(512);
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      // Fisher-Yates shuffle with seed
      let s = seed * 2147483647;
      for (let i = 255; i > 0; i--) {
        s = (s * 16807) % 2147483647;
        const j = s % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
      }
      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    noise2D(x, y) {
      const s = (x + y) * F2;
      const i = Math.floor(x + s), j = Math.floor(y + s);
      const t = (i + j) * G2;
      const x0 = x - (i - t), y0 = y - (j - t);
      const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;

      const dot = (g, x, y) => g[0] * x + g[1] * y;
      const contrib = (gIdx, cx, cy) => {
        const t = 0.5 - cx * cx - cy * cy;
        return t < 0 ? 0 : (t * t) * (t * t) * dot(grad3[gIdx % 8], cx, cy);
      };

      const n0 = contrib(this.perm[ii + this.perm[jj]], x0, y0);
      const n1 = contrib(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
      const n2 = contrib(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);

      return 70 * (n0 + n1 + n2); // Range roughly -1 to 1
    }
  }

  return Simplex;
})();

// ============================================================================
// Audio Visualizer — Circular Radial Frequency (Canvas 2D)
// Inspired by Noel Delgado's "Audio Visualization III"
// ============================================================================

class AudioVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.noise = new SimplexNoise();
    this.time = 0;
    this.animId = null;

    // Audio state
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.freqData = null;
    this.isActive = false;

    // Smoothed values
    this.smoothedAmp = 0;
    this.smoothedBins = null; // smoothed per-bin values for fluid motion
    this.rotation = 0; // accumulated rotation angle

    // Config
    this.BAR_COUNT = 180; // number of radial bars around the circle
    this.BAR_WIDTH = 1.8; // base width of each bar in pixels

    // Sizing
    this._resize();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(canvas.parentElement);

    // Start idle animation
    this._draw = this._draw.bind(this);
    this.animId = requestAnimationFrame(this._draw);
  }

  // --- Public API ---

  async connectAudio() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.micStream);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.75;
      this.analyser.minDecibels = -100;
      this.analyser.maxDecibels = -30;
      source.connect(this.analyser);

      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.smoothedBins = new Float32Array(this.BAR_COUNT);
      this.isActive = true;
      console.log('[Visualizer] Audio connected');
    } catch (err) {
      console.warn('[Visualizer] Could not connect audio:', err.message);
    }
  }

  disconnectAudio() {
    this.isActive = false;

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
      this.analyser = null;
      this.freqData = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    console.log('[Visualizer] Audio disconnected');
  }

  dispose() {
    this.disconnectAudio();
    if (this.animId) cancelAnimationFrame(this.animId);
    this._resizeObserver.disconnect();
  }

  // --- Internal ---

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = 280 * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = '280px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.centerX = rect.width / 2;
    this.centerY = 140;
    this.baseRadius = Math.min(rect.width, 280) * 0.22;
  }

  _getAudioValues() {
    if (!this.isActive || !this.analyser || !this.freqData) {
      return { bins: null, avgAmp: 0 };
    }
    this.analyser.getByteFrequencyData(this.freqData);
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) sum += this.freqData[i];
    const avgAmp = sum / this.freqData.length / 255;
    return { bins: this.freqData, avgAmp };
  }

  // Map bar index to a frequency bin (logarithmic-ish mapping for better low-end detail)
  _barToBin(barIdx, binCount) {
    const t = barIdx / this.BAR_COUNT;
    // Use a slight exponential curve so low frequencies get more visual space
    const mapped = Math.pow(t, 1.4);
    return Math.min(Math.floor(mapped * binCount * 0.8), binCount - 1);
  }

  // Interpolate along the brand gradient: teal(0) → mid(0.5) → green(1)
  _gradientColor(t, alpha) {
    // #0097b2 → #3db88a → #7ed952
    const clamp = Math.max(0, Math.min(1, t));
    const r = clamp < 0.5
      ? Math.round(0 + (61 - 0) * (clamp * 2))
      : Math.round(61 + (126 - 61) * ((clamp - 0.5) * 2));
    const g = clamp < 0.5
      ? Math.round(151 + (184 - 151) * (clamp * 2))
      : Math.round(184 + (217 - 184) * ((clamp - 0.5) * 2));
    const b = clamp < 0.5
      ? Math.round(178 + (138 - 178) * (clamp * 2))
      : Math.round(138 + (82 - 138) * ((clamp - 0.5) * 2));
    return `rgba(${r},${g},${b},${alpha})`;
  }

  _draw() {
    this.animId = requestAnimationFrame(this._draw);
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    // Clear canvas fully each frame
    ctx.clearRect(0, 0, w, h);

    this.time += 0.008;

    const { bins, avgAmp } = this._getAudioValues();

    // Smooth overall amplitude
    const targetAmp = this.isActive ? avgAmp : 0;
    this.smoothedAmp += (targetAmp - this.smoothedAmp) * 0.12;
    const amp = this.smoothedAmp;

    // Slow rotation: idle = very slow, active = proportional to volume
    this.rotation += 0.002 + (this.isActive ? amp * 0.015 : 0);

    const cx = this.centerX;
    const cy = this.centerY;
    const radius = this.baseRadius;
    const TWO_PI = Math.PI * 2;
    const barCount = this.BAR_COUNT;
    const angleStep = TWO_PI / barCount;

    // Max bar length scales with available space
    const maxBarLen = radius * 1.6;

    // --- Background glow halo ---
    const glowR = radius * (2.0 + amp * 1.2);
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, glowR);
    glowGrad.addColorStop(0, `rgba(0, 151, 178, ${0.04 + amp * 0.08})`);
    glowGrad.addColorStop(0.5, `rgba(61, 184, 138, ${0.02 + amp * 0.05})`);
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, TWO_PI);
    ctx.fill();

    // --- Draw radial frequency bars ---
    for (let i = 0; i < barCount; i++) {
      const angle = (i * angleStep) + this.rotation;

      // Get frequency value for this bar
      let barVal = 0;
      if (bins) {
        const binIdx = this._barToBin(i, bins.length);
        barVal = bins[binIdx] / 255;
      }

      // Smooth per-bin values for fluid motion
      if (this.smoothedBins) {
        this.smoothedBins[i] += (barVal - this.smoothedBins[i]) * 0.25;
        barVal = this.smoothedBins[i];
      }

      // Idle state: subtle noise-driven micro-bars for a "breathing" feel
      const idleNoise = this.noise.noise2D(
        Math.cos(angle) * 1.5 + this.time * 0.4,
        Math.sin(angle) * 1.5 + this.time * 0.4
      );
      const idleVal = 0.03 + Math.abs(idleNoise) * 0.06; // subtle 3-9% height

      // Final bar height: blend idle + audio
      const val = this.isActive ? Math.max(barVal, idleVal) : idleVal;
      const barLen = val * maxBarLen;

      // Bar start/end positions (emanate outward from circle edge)
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const x1 = cx + cosA * radius;
      const y1 = cy + sinA * radius;
      const x2 = cx + cosA * (radius + barLen);
      const y2 = cy + sinA * (radius + barLen);

      // Color: bars transition from teal (base) to green (tip) based on height
      const colorT = val; // short bars = teal, tall bars = green
      const alpha = 0.4 + val * 0.55;
      ctx.strokeStyle = this._gradientColor(colorT, alpha);
      ctx.lineWidth = this.BAR_WIDTH + val * 1.5;
      ctx.lineCap = 'round';

      // Draw the bar
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // --- Mirror bars inward (subtle inner reflection) ---
    for (let i = 0; i < barCount; i++) {
      const angle = (i * angleStep) + this.rotation;

      let barVal = 0;
      if (this.smoothedBins) {
        barVal = this.smoothedBins[i];
      } else {
        const idleNoise = this.noise.noise2D(
          Math.cos(angle) * 1.5 + this.time * 0.4,
          Math.sin(angle) * 1.5 + this.time * 0.4
        );
        barVal = 0.03 + Math.abs(idleNoise) * 0.06;
      }

      const val = this.isActive ? barVal : (0.03 + Math.abs(this.noise.noise2D(
        Math.cos(angle) * 1.5 + this.time * 0.4,
        Math.sin(angle) * 1.5 + this.time * 0.4
      )) * 0.06);

      const innerLen = val * maxBarLen * 0.35; // inner bars are shorter

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const x1 = cx + cosA * radius;
      const y1 = cy + sinA * radius;
      const x2 = cx + cosA * (radius - innerLen);
      const y2 = cy + sinA * (radius - innerLen);

      const alpha = 0.2 + val * 0.3;
      ctx.strokeStyle = this._gradientColor(val * 0.5, alpha);
      ctx.lineWidth = this.BAR_WIDTH * 0.8;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // --- Inner circle ring ---
    const ringPulse = 1 + amp * 0.08; // subtle pulse with audio
    ctx.beginPath();
    ctx.arc(cx, cy, radius * ringPulse, 0, TWO_PI);
    ctx.strokeStyle = this._gradientColor(0.2, 0.25 + amp * 0.3);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Center fill with radial gradient ---
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * ringPulse);
    centerGrad.addColorStop(0, `rgba(0, 151, 178, ${0.08 + amp * 0.12})`);
    centerGrad.addColorStop(0.6, `rgba(61, 184, 138, ${0.04 + amp * 0.06})`);
    centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * ringPulse, 0, TWO_PI);
    ctx.fill();

    // --- Bright center dot ---
    const dotR = 3 + amp * 4;
    const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR);
    dotGrad.addColorStop(0, `rgba(255, 255, 255, ${0.7 + amp * 0.25})`);
    dotGrad.addColorStop(0.5, `rgba(0, 151, 178, ${0.4 + amp * 0.3})`);
    dotGrad.addColorStop(1, 'rgba(126, 217, 82, 0)');
    ctx.fillStyle = dotGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, TWO_PI);
    ctx.shadowColor = `rgba(0, 151, 178, ${0.4 + amp * 0.4})`;
    ctx.shadowBlur = 10 + amp * 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Outer glow ring (visible when loud) ---
    if (amp > 0.05) {
      const outerR = radius + maxBarLen * amp * 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, TWO_PI);
      ctx.strokeStyle = this._gradientColor(0.7, amp * 0.2);
      ctx.lineWidth = 1;
      ctx.shadowColor = this._gradientColor(0.5, amp * 0.3);
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}

// ============================================================================
// Destination Chooser
// ============================================================================

async function showDestinationChooser() {
  destinationTranscriptionPreview.textContent = truncateText(currentTranscription, 200);

  // Enable/disable destination options based on OAuth authentication
  const isGitHubAuthenticated = await GitHubOAuth.isAuthenticated();
  const isNotionAuthenticated = await NotionOAuth.isAuthenticated();
  const settings = await getSettings();

  document.querySelector('[data-destination="github-issue"]').disabled = !isGitHubAuthenticated;
  document.querySelector('[data-destination="github-project"]').disabled = !isGitHubAuthenticated;
  document.querySelector('[data-destination="notion"]').disabled = !isNotionAuthenticated;
  const galaxyBrainReady = Boolean(settings.galaxyBrainUrl && settings.galaxyBrainApiKey);
  document.querySelector('[data-destination="galaxy-brain"]').disabled = !galaxyBrainReady;
  showScreen(screens.DESTINATION);
}

async function handleDestinationSelected(destination) {
  console.log('[Side Panel] Destination selected:', destination);

  // Kick off AI re-run immediately so it runs in parallel with form loading.
  // The user's full description (currentTranscription) is available now.
  let aiReadyPromise = Promise.resolve();
  if (destination !== 'draft') {
    const { getSettings } = await import('../lib/storage.js');
    const settings = await getSettings();
    const needsAI = settings.aiSummaryEnabled !== false &&
      (settings.aiAutoTitle !== false || settings.aiAutoTags !== false);
    if (needsAI) {
      aiReadyPromise = generateAISummary();
    }
  }

  if (destination === 'draft') {
    await saveDraft();
  } else if (destination === 'github-issue') {
    await showGitHubIssueForm(aiReadyPromise);
  } else if (destination === 'github-project') {
    await showGitHubProjectForm(aiReadyPromise);
  } else if (destination === 'notion') {
    await handleNotionDestination();
  } else if (destination === 'galaxy-brain') {
    await handleGalaxyBrainDestination();
  } else {
    showToast(`${destination} integration coming in later phases`, 'warning');
  }
}

async function saveDraft() {
  try {
    const { generateUUID } = await import('../utils/helpers.js');
    const { saveDraft: saveDraftToStorage } = await import('../lib/storage.js');

    const draft = {
      id: generateUUID(),
      timestamp: Date.now(),
      transcription: currentTranscription,
    };

    // Save directly to chrome.storage
    const success = await saveDraftToStorage(draft);

    if (success) {
      showToast('Draft saved!', 'success');

      // Reset recording state and return to recording screen
      resetRecordingUI();
      showScreen(screens.RECORDING);
    } else {
      throw new Error('Failed to save draft');
    }
  } catch (error) {
    console.error('[Side Panel] Error saving draft:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// ============================================================================
// History Functions
// ============================================================================

async function loadHistory() {
  try {
    const drafts = await getDrafts();
    const history = await getHistory();

    // Combine drafts and history
    const allItems = [
      ...drafts.map(d => ({ ...d, status: 'draft', destination: 'draft' })),
      ...history
    ];

    // Sort by timestamp (most recent first)
    allItems.sort((a, b) => b.timestamp - a.timestamp);

    if (allItems.length === 0) {
      historyList.innerHTML = '<p class="empty-state">No history yet.</p>';
      return;
    }

    historyList.innerHTML = allItems.map(item => `
      <div class="note-card" data-id="${item.id}">
        <div class="note-header">
          <span class="note-icon">${getDestinationIcon(item.destination)}</span>
          <span class="note-title">${truncateText(item.transcription, 50)}</span>
        </div>
        <div class="note-meta">
          ${formatRelativeTime(item.timestamp)}
          ${item.status === 'draft' ? '• Draft' : ''}
        </div>
      </div>
    `).join('');

    // Add click handlers
    historyList.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const itemId = card.getAttribute('data-id');
        handleHistoryItemClick(itemId, allItems);
      });
    });
  } catch (error) {
    console.error('[Side Panel] Error loading history:', error);
    historyList.innerHTML = '<p class="empty-state text-danger">Error loading history</p>';
  }
}

function handleHistoryItemClick(itemId, allItems) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;

  if (item.status === 'draft') {
    // TODO: Show draft promotion UI in Phase 3
    showToast('Draft promotion coming in Phase 3', 'info');
  } else {
    // Show detail modal with transcription and link (save focus for restore)
    _previousFocus = document.activeElement;
    showHistoryDetailModal(item);
  }
}

// ============================================================================
// Settings Functions
// ============================================================================

async function loadSettings() {
  try {
    const settings = await getSettings();

    githubTokenInput.value = settings.githubToken || '';
    galaxyBrainUrlInput.value = settings.galaxyBrainUrl || '';
    galaxyBrainApiKeyInput.value = settings.galaxyBrainApiKey || '';
    maxDurationInput.value = settings.maxRecordingDuration || 300;
    aiSummaryToggle.checked = settings.aiSummaryEnabled !== false;

    // Granular AI sub-toggles
    aiAutoTitleToggle.checked = settings.aiAutoTitle !== false;
    aiAutoTagsToggle.checked = settings.aiAutoTags !== false;
    aiAutoDescriptionToggle.checked = settings.aiAutoDescription !== false;
    aiSubToggles.classList.toggle('disabled', !aiSummaryToggle.checked);

    // Default tags pills
    defaultTagsContainer.innerHTML = '';
    if (Array.isArray(settings.defaultTags)) {
      for (const tag of settings.defaultTags) {
        addDefaultTagPill(tag);
      }
    }

    // Sync theme toggle UI
    updateThemeSwitcherUI(settings.theme || 'auto');

    // Update OAuth UIs
    await updateGitHubConnectionUI();
    await updateNotionConnectionUI();
  } catch (error) {
    console.error('[Side Panel] Error loading settings:', error);
    showToast('Error loading settings', 'error');
  }
}

async function handleSaveSettings() {
  try {
    const pat = githubTokenInput.value.trim() || null;
    const updates = {
      githubToken: pat,
      galaxyBrainUrl: galaxyBrainUrlInput.value.trim() || null,
      galaxyBrainApiKey: galaxyBrainApiKeyInput.value.trim() || null,
      maxRecordingDuration: parseInt(maxDurationInput.value) || 300,
      aiSummaryEnabled: aiSummaryToggle.checked,
      aiAutoTitle: aiAutoTitleToggle.checked,
      aiAutoTags: aiAutoTagsToggle.checked,
      aiAutoDescription: aiAutoDescriptionToggle.checked,
      defaultTags: getDefaultTagsFromPills(),
    };

    const success = await updateSettings(updates);

    if (success) {
      // If a PAT was provided, also store it at the top-level key
      // so the existing API layer (GitHubOAuth.getAccessToken) can find it
      if (pat) {
        await chrome.storage.local.set({
          githubToken: pat,
          githubTokenExpiry: null,
          githubRefreshToken: null,
        });
        // Fetch and store username for the connection UI
        try {
          const user = await GitHubService.getUser();
          await chrome.storage.local.set({ githubUsername: user.login });
          await updateGitHubConnectionUI();
          updateDestinationOptions();
          showToast(`Connected to GitHub as @${user.login}`, 'success');
        } catch (apiError) {
          // Token is invalid - clear it
          await chrome.storage.local.remove(['githubToken', 'githubTokenExpiry', 'githubRefreshToken', 'githubUsername']);
          showToast('Invalid GitHub token. Please check and try again.', 'error');
          return;
        }
      } else {
        // PAT was cleared - remove top-level token if it was a PAT
        // (don't clear if user is OAuth-authenticated)
        const { githubRefreshToken } = await chrome.storage.local.get('githubRefreshToken');
        if (!githubRefreshToken) {
          // No refresh token means this was a PAT, not OAuth - safe to clear
          await chrome.storage.local.remove(['githubToken', 'githubTokenExpiry', 'githubRefreshToken', 'githubUsername']);
          await updateGitHubConnectionUI();
          updateDestinationOptions();
        }
        showToast('Settings saved!', 'success');
      }
    } else {
      throw new Error('Failed to save settings');
    }
  } catch (error) {
    console.error('[Side Panel] Error saving settings:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function handleResetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }

  try {
    const success = await resetSettings();

    if (success) {
      showToast('Settings reset to defaults', 'success');
      await loadSettings();
    } else {
      throw new Error('Failed to reset settings');
    }
  } catch (error) {
    console.error('[Side Panel] Error resetting settings:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// ============================================================================
// Theme Functions
// ============================================================================

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');

  if (theme === 'light') {
    root.classList.add('theme-light');
  } else if (theme === 'dark') {
    root.classList.add('theme-dark');
  }
  // 'auto' = no class, media query handles it
}

function updateThemeSwitcherUI(theme) {
  if (!themeSwitcher) return;
  themeSwitcher.querySelectorAll('button').forEach(btn => {
    const isActive = btn.getAttribute('data-theme') === theme;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
}

// ============================================================================
// GitHub OAuth Functions
// ============================================================================

async function handleGitHubSignIn() {
  try {
    console.log('[Side Panel] Initiating GitHub OAuth flow');
    githubSignInBtn.disabled = true;
    githubSignInBtn.textContent = 'Opening GitHub...';

    // Launch OAuth flow - this now completes the full flow and returns user data
    const result = await GitHubOAuth.authorize();

    // Update UI with success
    await handleGitHubAuthSuccess(result.user.login);
  } catch (error) {
    console.error('[Side Panel] GitHub sign-in error:', error);
    showToast(`Failed to sign in: ${error.message}`, 'error');
    githubSignInBtn.disabled = false;
    githubSignInBtn.innerHTML = `
      <svg class="oauth-icon" viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
      </svg>
      Sign in with GitHub
    `;
  }
}

async function handleGitHubAuthSuccess(username) {
  console.log('[Side Panel] GitHub auth successful:', username);

  // Reset sign in button
  githubSignInBtn.disabled = false;
  githubSignInBtn.innerHTML = `
    <svg class="oauth-icon" viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
    </svg>
    Sign in with GitHub
  `;

  // Update UI to show connected state
  await updateGitHubConnectionUI();

  // Enable GitHub destination options
  updateDestinationOptions();

  showToast(`Connected to GitHub as @${username}`, 'success');
}

async function handleGitHubSignOut() {
  if (!confirm('Are you sure you want to sign out of GitHub?')) {
    return;
  }

  try {
    await GitHubOAuth.signOut();
    // Also clear PAT from settings if developer mode was used
    await updateSettings({ githubToken: null });
    githubTokenInput.value = '';
    await updateGitHubConnectionUI();
    updateDestinationOptions();
    showToast('Signed out of GitHub', 'success');
  } catch (error) {
    console.error('[Side Panel] GitHub sign-out error:', error);
    showToast(`Failed to sign out: ${error.message}`, 'error');
  }
}

function handleDeveloperModeToggle(e) {
  const isDeveloperMode = e.target.checked;

  if (isDeveloperMode) {
    githubOAuthSection.style.display = 'none';
    githubDeveloperSection.style.display = 'block';
  } else {
    githubOAuthSection.style.display = 'block';
    githubDeveloperSection.style.display = 'none';
  }
}

async function handleTestGalaxyBrainConnection() {
  const instanceUrl = galaxyBrainUrlInput.value.trim();
  const apiKey = galaxyBrainApiKeyInput.value.trim();

  testGalaxyBrainBtn.disabled = true;
  testGalaxyBrainBtn.textContent = 'Testing...';

  try {
    // Checks the credentials as typed, without storing them first.
    const result = await GalaxyBrainService.testConnection(instanceUrl, apiKey);
    if (result.ok) {
      showToast('Connected to Galaxy Brain', 'success');
    } else {
      showToast(result.error || 'Could not connect to Galaxy Brain', 'error');
    }
  } finally {
    testGalaxyBrainBtn.disabled = false;
    testGalaxyBrainBtn.textContent = 'Test Connection';
  }
}

async function handleTestGitHubConnection() {
  const pat = githubTokenInput.value.trim();
  if (!pat) {
    showToast('Please enter a GitHub token first', 'error');
    return;
  }

  testGitHubBtn.disabled = true;
  testGitHubBtn.textContent = 'Testing...';

  try {
    // Temporarily store the token so GitHubService can use it
    await chrome.storage.local.set({
      githubToken: pat,
      githubTokenExpiry: null,
      githubRefreshToken: null,
    });

    const user = await GitHubService.getUser();
    showToast(`Connection successful! Logged in as @${user.login}`, 'success');
  } catch (error) {
    // Clear the invalid token
    await chrome.storage.local.remove(['githubToken', 'githubTokenExpiry', 'githubRefreshToken']);
    showToast(`Connection failed: ${error.message}`, 'error');
  } finally {
    testGitHubBtn.disabled = false;
    testGitHubBtn.textContent = 'Test Connection';
  }
}

// ============================================================================
// Notion OAuth Functions
// ============================================================================

async function handleNotionSignIn() {
  try {
    console.log('[Side Panel] Initiating Notion OAuth flow');
    notionSignInBtn.disabled = true;
    notionSignInBtn.textContent = 'Opening Notion...';

    const result = await NotionOAuth.authorize();
    await handleNotionAuthSuccess(result.workspace.name);
  } catch (error) {
    console.error('[Side Panel] Notion sign-in error:', error);
    showToast(`Failed to sign in: ${error.message}`, 'error');
  } finally {
    notionSignInBtn.disabled = false;
    notionSignInBtn.innerHTML = `
      <svg class="oauth-icon" viewBox="0 0 100 100" width="20" height="20" fill="currentColor">
        <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"/>
      </svg>
      Sign in with Notion
    `;
  }
}

async function handleNotionAuthSuccess(workspaceName) {
  console.log('[Side Panel] Notion auth successful:', workspaceName);
  await updateNotionConnectionUI();
  updateDestinationOptions();
  showToast(`Connected to Notion workspace: ${workspaceName}`, 'success');
}

async function handleNotionSignOut() {
  if (!confirm('Are you sure you want to sign out of Notion?')) {
    return;
  }

  try {
    await NotionOAuth.signOut();
    await updateNotionConnectionUI();
    updateDestinationOptions();
    showToast('Signed out of Notion', 'success');
  } catch (error) {
    console.error('[Side Panel] Notion sign-out error:', error);
    showToast(`Failed to sign out: ${error.message}`, 'error');
  }
}

// ============================================================================
// Notion Integration Functions
// ============================================================================

/**
 * Save the current page to Galaxy Brain, along with whatever was dictated.
 *
 * Unlike the other destinations there is no intermediate form: a capture is the
 * least committal thing Galaxy Brain stores, and deciding it is a paper or an
 * experiment happens there, later.
 */
async function handleGalaxyBrainDestination() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showToast('No active tab found', 'error');
      return;
    }
    if (!/^https?:/i.test(tab.url)) {
      showToast('Only http and https pages can be captured', 'error');
      return;
    }

    // Best effort: a page that blocks scripting still captures as a link.
    let pageText = '';
    let selection = '';
    try {
      const [injected] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          text: document.body?.innerText?.slice(0, 500000) || '',
          selection: window.getSelection()?.toString() || ''
        })
      });
      pageText = injected?.result?.text || '';
      selection = injected?.result?.selection || '';
    } catch {
      console.log('[Side Panel] Could not read page text; capturing the link only');
    }

    const settings = await getSettings();

    const created = await GalaxyBrainService.capture({
      url: tab.url,
      title: tab.title || '',
      content: pageText,
      selection,
      note: currentTranscription,
      tags: settings.defaultTags
    });

    await addToHistory({
      id: generateUUID(),
      timestamp: Date.now(),
      transcription: currentTranscription,
      destination: 'galaxy-brain',
      status: 'success',
      artifactTitle: created.title,
      metadata: {
        'galaxy-brain': {
          captureId: created.id,
          url: created.url
        }
      }
    });

    showToast('Saved to Galaxy Brain!', 'success');
    resetRecordingUI();
    showScreen(screens.RECORDING);
  } catch (error) {
    console.error('[Side Panel] Galaxy Brain capture failed:', error);
    showToast(error.message || 'Could not save to Galaxy Brain', 'error');
  }
}

async function handleNotionDestination() {
  try {
    console.log('[Side Panel] Handling Notion destination');

    // Get list of databases and pages from Notion
    const databases = await NotionService.getDatabases();
    const pages = await NotionService.searchPages();

    if (databases.length === 0 && pages.length === 0) {
      showToast('No databases or pages found in your Notion workspace. Please create a database or page first.', 'error');
      return;
    }

    // For MVP: Simple flow - create a new page in the first available database
    // TODO: Add UI for database/page picker in future iteration
    let parent;
    let parentName;

    if (databases.length > 0) {
      // Use first database
      parent = { database_id: databases[0].id };
      parentName = databases[0].title?.[0]?.plain_text || 'Database';

      // Find the title property name from the database schema
      // Notion databases can name their title column anything (e.g., "Name", "Title", "Task")
      const dbProperties = databases[0].properties || {};
      const titlePropName = Object.keys(dbProperties).find(
        key => dbProperties[key].type === 'title'
      ) || 'Name';

      await sendToNotion(parent, parentName, titlePropName);
    } else {
      // Use first page
      parent = { page_id: pages[0].id };
      parentName = pages[0].properties?.title?.title?.[0]?.plain_text || 'Page';

      await sendToNotion(parent, parentName);
    }
  } catch (error) {
    console.error('[Side Panel] Error handling Notion destination:', error);
    showToast(`Failed to send to Notion: ${error.message}`, 'error');
  }
}

async function sendToNotion(parent, parentName, titlePropertyName = 'Name') {
  try {
    console.log('[Side Panel] Sending note to Notion');

    // Generate title from first line of transcription or smart default
    const lines = currentTranscription.trim().split('\n');
    const aiTitle = (aiSummary?.status === 'done' && aiSummary.title) ? aiSummary.title : '';
    const title = truncateText(lines[0], 100) || aiTitle || generateSmartTitle() || 'Voice Note';
    const content = currentTranscription;

    // Upload screenshots to Notion if any
    const imageBlocks = [];
    if (capturedScreenshots.length > 0) {
      showToast('Uploading screenshots to Notion...', 'info');
      for (const screenshot of capturedScreenshots) {
        try {
          const filename = `screenshot_${screenshot.timestamp}.png`;
          const fileUploadId = await NotionService.uploadImage(screenshot.dataUrl, filename);
          imageBlocks.push(NotionService.createImageBlock(fileUploadId));
        } catch (err) {
          console.error('[Notion] Screenshot upload failed:', err);
        }
      }
    }

    // Build element info block if captured
    const elementBlocks = [];
    if (capturedElement) {
      const elementText = `Element: <${capturedElement.tagName.toLowerCase()}> ${capturedElement.idAttribute ? '#' + capturedElement.idAttribute : ''}\nCSS: ${capturedElement.cssSelector}\nXPath: ${capturedElement.xpath}\nSize: ${Math.round(capturedElement.position.width)}x${Math.round(capturedElement.position.height)}`;
      elementBlocks.push({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: elementText } }],
          language: 'plain text'
        }
      });
    }

    // Build console log blocks if captured
    const consoleBlocks = [];
    if (capturedConsoleLogs.length > 0) {
      let consoleText = '';
      if (aiSummary?.status === 'done' && aiSummary.consoleSummary) {
        consoleText += `Summary: ${aiSummary.consoleSummary}\n\n`;
      }
      consoleText += capturedConsoleLogs.slice(0, 20).map(l => {
        const time = new Date(l.timestamp).toLocaleTimeString();
        return `[${l.level.toUpperCase()}] ${time} ${l.message}`;
      }).join('\n');
      consoleBlocks.push({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: consoleText } }],
          language: 'plain text'
        }
      });
    }

    let createdPage;

    if (parent.database_id) {
      // Create database entry with content
      // Use the actual title property name from the database schema (not hardcoded "Name")
      const properties = {
        [titlePropertyName]: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        }
      };

      // Add content as child blocks
      const children = [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: content
                }
              }
            ]
          }
        },
        ...imageBlocks,
        ...elementBlocks,
        ...consoleBlocks
      ];

      createdPage = await NotionService.createDatabaseEntry(parent.database_id, properties, children);
    } else {
      // Create child page
      const pageData = {
        parent: parent,
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title
                }
              }
            ]
          }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: content
                  }
                }
              ]
            }
          },
          ...imageBlocks,
          ...elementBlocks
        ]
      };

      createdPage = await NotionService.createPage(pageData);
    }

    console.log('[Side Panel] Notion page created:', createdPage);

    // Save to history
    const { generateUUID } = await import('../utils/helpers.js');
    const { addToHistory } = await import('../lib/storage.js');

    const historyItem = {
      id: generateUUID(),
      timestamp: Date.now(),
      transcription: content,
      destination: 'notion',
      status: 'success',
      artifactUrl: createdPage.url,
      artifactTitle: title,
      metadata: {
        notion: {
          pageId: createdPage.id,
          parentName: parentName
        }
      }
    };

    await addToHistory(historyItem);

    // Show success message
    showToast(`Note sent to Notion (${parentName})!`, 'success');

    // Reset recording state and return to recording screen
    resetRecordingUI();
    showScreen(screens.RECORDING);

  } catch (error) {
    console.error('[Side Panel] Error sending to Notion:', error);
    throw error;
  }
}

async function updateNotionConnectionUI() {
  const isAuth = await NotionOAuth.isAuthenticated();

  if (isAuth) {
    // Get workspace info from storage
    const workspaceInfo = await NotionOAuth.getWorkspaceInfo();

    if (workspaceInfo) {
      notionWorkspaceName.textContent = workspaceInfo.name;
      // Keep default SVG icon from HTML; workspace icon data not used
    }

    notionNotConnected.style.display = 'none';
    notionConnected.style.display = 'block';
  } else {
    notionNotConnected.style.display = 'block';
    notionConnected.style.display = 'none';
  }
}

async function updateGitHubConnectionUI() {
  const isAuth = await GitHubOAuth.isAuthenticated();

  if (isAuth) {
    // Get user info from storage
    const { githubUsername: username } = await chrome.storage.local.get('githubUsername');

    if (username) {
      // Fetch user data for avatar
      try {
        const user = await GitHubService.getUser();
        githubUsername.textContent = `@${user.login}`;
        githubAvatar.src = user.avatar_url;
        githubAvatar.alt = `${user.login}'s avatar`;
      } catch (error) {
        console.error('[Side Panel] Error fetching user data:', error);
        githubUsername.textContent = `@${username}`;
        githubAvatar.src = `https://github.com/${username}.png`;
      }
    }

    githubNotConnected.style.display = 'none';
    githubConnected.style.display = 'block';
  } else {
    githubNotConnected.style.display = 'block';
    githubConnected.style.display = 'none';
  }
}

function updateDestinationOptions() {
  // Update GitHub destination buttons
  GitHubOAuth.isAuthenticated().then(isAuth => {
    const githubIssueBtn = document.querySelector('[data-destination="github-issue"]');
    const githubProjectBtn = document.querySelector('[data-destination="github-project"]');

    if (githubIssueBtn) {
      if (isAuth) {
        githubIssueBtn.disabled = false;
        const badge = githubIssueBtn.querySelector('.destination-badge');
        if (badge) badge.remove();
      } else {
        githubIssueBtn.disabled = true;
        if (!githubIssueBtn.querySelector('.destination-badge')) {
          const badge = document.createElement('div');
          badge.className = 'destination-badge';
          badge.textContent = 'Not configured';
          githubIssueBtn.appendChild(badge);
        }
      }
    }

    if (githubProjectBtn) {
      if (isAuth) {
        githubProjectBtn.disabled = false;
        const badge = githubProjectBtn.querySelector('.destination-badge');
        if (badge) badge.remove();
      } else {
        githubProjectBtn.disabled = true;
        if (!githubProjectBtn.querySelector('.destination-badge')) {
          const badge = document.createElement('div');
          badge.className = 'destination-badge';
          badge.textContent = 'Not configured';
          githubProjectBtn.appendChild(badge);
        }
      }
    }
  });

  // Update Notion destination button
  NotionOAuth.isAuthenticated().then(isAuth => {
    const notionBtn = document.querySelector('[data-destination="notion"]');

    if (notionBtn) {
      if (isAuth) {
        notionBtn.disabled = false;
        const badge = notionBtn.querySelector('.destination-badge');
        if (badge) badge.remove();
      } else {
        notionBtn.disabled = true;
        if (!notionBtn.querySelector('.destination-badge')) {
          const badge = document.createElement('div');
          badge.className = 'destination-badge';
          badge.textContent = 'Not configured';
          notionBtn.appendChild(badge);
        }
      }
    }
  });
}

// ============================================================================
// Toast Notifications
// ============================================================================

function showToast(message, type = 'info', duration = 3000) {
  const toastContainer = document.getElementById('toastContainer');

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Support HTML content for links
  if (message.includes('<a')) {
    toast.innerHTML = message;
  } else {
    toast.textContent = message;
  }

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exiting');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
  console.log('[Side Panel] Initializing...');

  // Apply saved theme immediately to prevent flash
  const settings = await getSettings();
  applyTheme(settings.theme || 'auto');

  // Log which transcription engine will be used
  if (useWhisperWasm) {
    console.log('[Side Panel] Whisper WASM will be used for transcription');
  }

  // Initialize action buttons state
  updateActionButtons();

  // Update OAuth connection UIs
  await updateGitHubConnectionUI();
  await updateNotionConnectionUI();

  // Update destination button states based on auth
  updateDestinationOptions();

  // Initialize radial audio visualizer
  const vizCanvas = document.getElementById('visualizer');
  if (vizCanvas) {
    visualizer = new AudioVisualizer(vizCanvas);
  }

  // Show recording screen
  showScreen(screens.RECORDING);

  console.log('[Side Panel] Ready');
}

// ============================================================================
// GitHub Issue Form Functions
// ============================================================================

let repositories = [];
let selectedRepo = null;
let repoLabels = [];
let selectedLabels = [];

async function showGitHubIssueForm(aiReadyPromise = Promise.resolve()) {
  try {
    const { getSettings } = await import('../lib/storage.js');
    const settings = await getSettings();

    // Pre-fill issue body with transcription
    issueBody.value = currentTranscription;

    // Always add default tags first
    if (Array.isArray(settings.defaultTags)) {
      for (const tag of settings.defaultTags) {
        addSelectedLabel(tag, null);
      }
    }

    // Set a temporary smart title while AI runs in parallel
    const smartDefault = generateSmartTitle();
    if (!issueTitle.value.trim()) {
      issueTitle.value = smartDefault;
    }

    // Show attachment preview if any exist
    const hasAttachments = capturedScreenshots.length > 0 || capturedElement || capturedConsoleLogs.length > 0;
    issueAttachments.style.display = hasAttachments ? 'block' : 'none';
    if (hasAttachments) {
      renderAttachmentsInto(issueAttachmentsPreview);
    }

    // Load repos + wait for AI in parallel
    showToast('Loading repositories...', 'info');
    const [repoResult] = await Promise.all([
      GitHubService.fetchRepositories(),
      aiReadyPromise,
    ]);
    repositories = repoResult;
    console.log(`[GitHub Issue] Loaded ${repositories.length} repositories`);

    // Apply AI results now that both are done
    const needsAITitle = settings.aiAutoTitle !== false;
    const needsAITags = settings.aiAutoTags !== false;
    if (aiSummary?.status === 'done') {
      if (needsAITitle && aiSummary.title) {
        const currentTitle = issueTitle.value.trim();
        if (!currentTitle || currentTitle === smartDefault) {
          issueTitle.value = aiSummary.title;
        }
      }
      if (needsAITags && aiSummary.suggestedTags?.length > 0) {
        for (const tag of aiSummary.suggestedTags) {
          addSelectedLabel(tag, null);
        }
      }
    }

    // Show the form
    showScreen(screens.GITHUB_ISSUE);
    issueTitle.focus();
  } catch (error) {
    console.error('[GitHub Issue] Error loading repositories:', error);
    showToast(`Failed to load repositories: ${error.message}`, 'error');
  }
}

function showRepoDropdown() {
  renderRepoList();
  repoList.style.display = 'block';
  githubRepoSearch.setAttribute('aria-expanded', 'true');
}

function hideRepoDropdown() {
  repoList.style.display = 'none';
  githubRepoSearch.setAttribute('aria-expanded', 'false');
}

async function handleRepoSearch(e) {
  const query = e.target.value.trim();
  renderRepoList(query);
}

async function renderRepoList(query = '') {
  // Get recently used repos
  const recentRepos = await GitHubCache.getRecentlyUsedRepos();
  const recentRepoFullNames = recentRepos.map(r => r.fullName);

  // Filter all repositories
  const filteredRepos = query
    ? GitHubService.searchRepositories(query, repositories)
    : repositories;

  // If we have recently used AND no search query, show them
  if (recentRepos.length > 0 && !query) {
    recentReposList.parentElement.style.display = 'block';
    recentReposList.innerHTML = recentRepos.map(repo =>
      createRepoItem(repo.fullName, repo.description, true)
    ).join('');
  } else {
    // Hide recently used section if empty or searching
    recentReposList.parentElement.style.display = 'none';
  }

  // Always show "All Repositories" section with available repos
  const reposToShow = query
    ? filteredRepos
    : filteredRepos.filter(repo => !recentRepoFullNames.includes(repo.full_name));

  // Update section title
  const allReposSection = allReposList.parentElement;
  const sectionTitle = allReposSection.querySelector('.dropdown-section-title');
  sectionTitle.textContent = query ? 'Search Results' : (recentRepos.length > 0 ? 'All Repositories' : 'Your Repositories');

  if (reposToShow.length > 0) {
    allReposSection.style.display = 'block';
    allReposList.innerHTML = reposToShow
      .slice(0, 20) // Limit to 20 results
      .map(repo => createRepoItem(repo.full_name, repo.description, false))
      .join('');
  } else if (repositories.length === 0) {
    allReposSection.style.display = 'block';
    allReposList.innerHTML = '<div class="repo-empty">No repositories found. Create one on GitHub first.</div>';
  } else {
    allReposSection.style.display = 'block';
    allReposList.innerHTML = '<div class="repo-empty">No matching repositories</div>';
  }

  // Add click handlers (use mousedown to fire before blur)
  document.querySelectorAll('.repo-item').forEach(item => {
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent input blur
      handleRepoSelected(e);
    });
  });
}

function createRepoItem(fullName, description, isRecent) {
  return `
    <div class="repo-item" data-repo="${fullName}">
      <div class="repo-name">${fullName}${isRecent ? ' ⭐' : ''}</div>
      ${description ? `<div class="repo-description">${description}</div>` : ''}
    </div>
  `;
}

function handleRepoSelected(e) {
  const repoFullName = e.currentTarget.getAttribute('data-repo');
  selectedRepo = repositories.find(r => r.full_name === repoFullName);

  if (selectedRepo) {
    githubRepoSearch.value = selectedRepo.full_name;
    selectedRepoId.value = selectedRepo.full_name;

    // Update UI
    document.querySelectorAll('.repo-item').forEach(item => {
      item.classList.remove('selected');
    });
    e.currentTarget.classList.add('selected');

    hideRepoDropdown();

    // Fetch labels for the selected repo
    const [owner, repo] = selectedRepo.full_name.split('/');
    fetchRepoLabels(owner, repo);
  }
}

// ============================================================================
// Label Picker Functions
// ============================================================================

/**
 * Fetch labels for a repo (with cache) and update the label picker UI.
 * Also matches any AI-suggested tags against real repo labels.
 */
async function fetchRepoLabels(owner, repo) {
  const fullName = `${owner}/${repo}`;
  try {
    // Check cache first
    let labels = await GitHubCache.getLabels(fullName);
    if (!labels) {
      console.log(`[Labels] Fetching labels for ${fullName}`);
      labels = await GitHubService.getRepoLabels(owner, repo);
      await GitHubCache.cacheLabels(fullName, labels);
    } else {
      console.log(`[Labels] Using cached labels for ${fullName}`);
    }

    repoLabels = labels;
    console.log(`[Labels] ${labels.length} labels available for ${fullName}`);

    // Match AI-suggested tags against real repo labels
    if (aiSummary?.status === 'done' && aiSummary.suggestedTags?.length > 0) {
      // Clear pre-filled AI tags and re-add with real color info
      const previousAITags = [...selectedLabels];
      selectedLabels = [];
      selectedLabelsContainer.innerHTML = '';

      for (const tag of previousAITags) {
        const match = repoLabels.find(l => l.name.toLowerCase() === tag.toLowerCase());
        if (match) {
          addSelectedLabel(match.name, match.color);
        } else {
          addSelectedLabel(tag, null);
        }
      }
    }
  } catch (err) {
    console.warn(`[Labels] Failed to fetch labels for ${fullName}:`, err);
    repoLabels = [];
  }
}

function showLabelDropdown() {
  renderLabelDropdown();
  labelDropdown.style.display = 'block';
  labelSearchInput.setAttribute('aria-expanded', 'true');
}

function hideLabelDropdown() {
  labelDropdown.style.display = 'none';
  labelSearchInput.setAttribute('aria-expanded', 'false');
}

function handleLabelSearch() {
  renderLabelDropdown();
}

function renderLabelDropdown() {
  const query = labelSearchInput.value.trim().toLowerCase();

  // Filter out already-selected labels
  const available = repoLabels.filter(l => !selectedLabels.includes(l.name));

  // Filter by search query
  const filtered = query
    ? available.filter(l =>
        l.name.toLowerCase().includes(query) ||
        (l.description && l.description.toLowerCase().includes(query))
      )
    : available;

  let html = '';

  if (filtered.length > 0) {
    html = filtered.slice(0, 20).map(label => `
      <div class="label-item" data-label-name="${escapeHtml(label.name)}" data-label-color="${label.color || ''}">
        <span class="label-color-dot" style="background-color: #${label.color || 'ccc'};"></span>
        <div class="label-item-info">
          <div class="label-item-name">${escapeHtml(label.name)}</div>
          ${label.description ? `<div class="label-item-desc">${escapeHtml(label.description)}</div>` : ''}
        </div>
      </div>
    `).join('');
  } else if (repoLabels.length === 0) {
    html = '<div class="label-empty">Select a repository to see labels</div>';
  } else if (query && filtered.length === 0) {
    // Offer to add as custom label
    html = `<div class="label-add-custom" data-label-name="${escapeHtml(query)}" data-label-color="">
      + Add "${escapeHtml(query)}" as custom label
    </div>`;
  } else {
    html = '<div class="label-empty">All labels selected</div>';
  }

  labelDropdown.innerHTML = html;

  // Add click handlers
  labelDropdown.querySelectorAll('.label-item, .label-add-custom').forEach(item => {
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const name = item.getAttribute('data-label-name');
      const color = item.getAttribute('data-label-color') || null;
      addSelectedLabel(name, color);
      labelSearchInput.value = '';
      hideLabelDropdown();
    });
  });
}

/**
 * Add a label to the selected set and render a pill.
 * @param {string} name - Label name
 * @param {string|null} color - Hex color without # (e.g. 'd73a4a'), or null for custom
 */
function addSelectedLabel(name, color) {
  // Prevent duplicates (case-insensitive)
  if (selectedLabels.some(l => l.toLowerCase() === name.toLowerCase())) return;

  selectedLabels.push(name);

  const pill = document.createElement('span');
  pill.className = 'label-pill';
  pill.setAttribute('data-label', name);

  const dot = document.createElement('span');
  dot.className = 'label-color-dot';
  dot.style.backgroundColor = color ? `#${color}` : '#888';
  pill.appendChild(dot);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'label-pill-name';
  nameSpan.textContent = name;
  pill.appendChild(nameSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'label-pill-remove';
  removeBtn.type = 'button';
  removeBtn.innerHTML = '&times;';
  removeBtn.setAttribute('aria-label', `Remove label ${name}`);
  removeBtn.addEventListener('click', () => {
    selectedLabels = selectedLabels.filter(l => l !== name);
    pill.remove();
  });
  pill.appendChild(removeBtn);

  selectedLabelsContainer.appendChild(pill);
}

async function handleCreateIssue() {
  try {
    // Validate inputs
    if (!selectedRepo) {
      showToast('Please select a repository', 'error');
      githubRepoSearch.focus();
      return;
    }

    // Auto-fill title if empty and we have context
    if (!issueTitle.value.trim()) {
      issueTitle.value = (aiSummary?.status === 'done' && aiSummary.title) ? aiSummary.title : generateSmartTitle();
    }

    if (!issueTitle.value.trim()) {
      showToast('Please enter an issue title', 'error');
      issueTitle.focus();
      return;
    }

    // Disable button and show loading
    createIssueBtn.disabled = true;
    createIssueBtn.textContent = 'Creating...';

    // Parse repository owner and name
    const [owner, repo] = selectedRepo.full_name.split('/');

    // Upload screenshots to repo if any
    let screenshotUrls = [];
    if (capturedScreenshots.length > 0) {
      createIssueBtn.textContent = 'Uploading screenshots...';
      screenshotUrls = await uploadScreenshotsToRepo(owner, repo);
    }

    // Build enriched body with attachments
    let body = issueBody.value.trim();
    const attachmentMarkdown = buildAttachmentMarkdown(screenshotUrls);
    if (attachmentMarkdown) {
      body = body ? body + '\n\n---\n\n' + attachmentMarkdown : attachmentMarkdown;
    }

    // Append AI source citation
    if (aiSummary?.status === 'done' && aiSummary.sourceCitation) {
      body = body ? body + '\n\n---\n\n**Source:** ' + aiSummary.sourceCitation : '**Source:** ' + aiSummary.sourceCitation;
    }

    // Branding footer
    const titleText = issueTitle.value.trim();
    body += `\n\n---\n*\u2014${titleText} noted by [Duly Noted](https://github.com/DavinciDreams/duly-noted)*`;

    createIssueBtn.textContent = 'Creating issue...';

    // Create issue data with selected labels
    const issueData = {
      title: titleText,
      body: body,
      labels: selectedLabels.length > 0 ? [...selectedLabels] : undefined
    };

    console.log('[GitHub Issue] Creating issue:', issueData);

    // Create the issue
    const createdIssue = await GitHubService.createIssue(owner, repo, issueData);

    console.log('[GitHub Issue] Issue created:', createdIssue.html_url);

    // Save to history
    const { generateUUID } = await import('../utils/helpers.js');
    const { addToHistory } = await import('../lib/storage.js');

    await addToHistory({
      id: generateUUID(),
      timestamp: Date.now(),
      transcription: currentTranscription,
      destination: 'github-issue',
      metadata: {
        issueNumber: createdIssue.number,
        issueUrl: createdIssue.html_url,
        repository: selectedRepo.full_name,
        title: createdIssue.title
      }
    });

    // Show success with clickable link
    showToast(
      `✓ Issue #${createdIssue.number} created! <a href="${createdIssue.html_url}" target="_blank" style="color: inherit; text-decoration: underline;">View on GitHub →</a>`,
      'success',
      5000 // Show for 5 seconds
    );

    // Reset form and recording UI
    resetIssueForm();
    resetRecordingUI();

    // Go back to recording screen
    showScreen(screens.RECORDING);

  } catch (error) {
    console.error('[GitHub Issue] Error creating issue:', error);
    showToast(`Failed to create issue: ${error.message}`, 'error');
  } finally {
    createIssueBtn.disabled = false;
    createIssueBtn.textContent = 'Create Issue';
  }
}

function resetIssueForm() {
  githubRepoSearch.value = '';
  selectedRepoId.value = '';
  issueTitle.value = '';
  issueBody.value = '';
  labelSearchInput.value = '';
  selectedLabels = [];
  repoLabels = [];
  selectedLabelsContainer.innerHTML = '';
  hideLabelDropdown();
  selectedRepo = null;
}

// ============================================================================
// History Detail Modal Functions
// ============================================================================

function showHistoryDetailModal(item) {
  // Set modal content
  modalTranscription.textContent = item.transcription;

  // Set destination
  const destinationNames = {
    'github-issue': 'GitHub Issue',
    'github-project': 'GitHub Project',
    'notion': 'Notion',
    'galaxy-brain': 'Galaxy Brain',
    'draft': 'Draft'
  };
  modalDestination.textContent = destinationNames[item.destination] || item.destination;

  // Set link if available
  const linkUrl = item.metadata?.issueUrl || item.metadata?.projectUrl || item.artifactUrl;
  if (linkUrl) {
    modalLink.href = linkUrl;

    // Set link text based on destination
    if (item.destination === 'github-issue') {
      modalLink.textContent = `Issue #${item.metadata.issueNumber} on GitHub →`;
    } else if (item.destination === 'github-project') {
      modalLink.textContent = `View on GitHub Projects →`;
    } else {
      modalLink.textContent = `View →`;
    }

    modalLinkSection.style.display = 'block';
  } else {
    modalLinkSection.style.display = 'none';
  }

  // Show modal and focus close button for accessibility
  historyDetailModal.style.display = 'flex';
  closeModalBtn.focus();
}

function hideHistoryDetailModal() {
  historyDetailModal.style.display = 'none';
  if (_previousFocus) {
    _previousFocus.focus();
    _previousFocus = null;
  }
}

// ============================================================================
// GitHub Project Form Functions
// ============================================================================

let projects = [];
let selectedProject = null;

async function showGitHubProjectForm(aiReadyPromise = Promise.resolve()) {
  try {
    const { getSettings } = await import('../lib/storage.js');
    const settings = await getSettings();

    // Pre-fill item body with transcription
    projectItemBody.value = currentTranscription;

    // Set a temporary smart title while AI runs in parallel
    const smartDefault = generateSmartTitle();
    if (!projectItemTitle.value.trim()) {
      projectItemTitle.value = smartDefault;
    }

    // Load projects + wait for AI in parallel
    showToast('Loading projects...', 'info');
    const [projectResult] = await Promise.all([
      GitHubService.fetchProjects(),
      aiReadyPromise,
    ]);
    projects = projectResult;
    console.log(`[GitHub Project] Loaded ${projects.length} projects`);

    // Apply AI title now that both are done
    if (settings.aiAutoTitle !== false && aiSummary?.status === 'done' && aiSummary.title) {
      const currentTitle = projectItemTitle.value.trim();
      if (!currentTitle || currentTitle === smartDefault) {
        projectItemTitle.value = aiSummary.title;
      }
    }

    // Show the form
    showScreen(screens.GITHUB_PROJECT);
    projectItemTitle.focus();
  } catch (error) {
    console.error('[GitHub Project] Error loading projects:', error);
    showToast(`Failed to load projects: ${error.message}`, 'error');
  }
}

function showProjectDropdown() {
  renderProjectList();
  projectList.style.display = 'block';
  githubProjectSearch.setAttribute('aria-expanded', 'true');
}

function hideProjectDropdown() {
  projectList.style.display = 'none';
  githubProjectSearch.setAttribute('aria-expanded', 'false');
}

async function handleProjectSearch(e) {
  const query = e.target.value.trim();
  renderProjectList(query);
}

async function renderProjectList(query = '') {
  // Get recently used projects
  const recentProjects = await GitHubCache.getRecentlyUsedProjects();
  const recentProjectIds = recentProjects.map(p => p.id);

  // Filter all projects
  const filteredProjects = query
    ? GitHubService.searchProjects(query, projects)
    : projects;

  // If we have recently used AND no search query, show them
  if (recentProjects.length > 0 && !query) {
    recentProjectsList.parentElement.style.display = 'block';
    recentProjectsList.innerHTML = recentProjects.map(project =>
      createProjectItem(project.id, project.title, project.description, true)
    ).join('');
  } else {
    // Hide recently used section if empty or searching
    recentProjectsList.parentElement.style.display = 'none';
  }

  // Always show "All Projects" section with available projects
  const projectsToShow = query
    ? filteredProjects
    : filteredProjects.filter(project => !recentProjectIds.includes(project.id));

  // Update section title
  const allProjectsSection = allProjectsList.parentElement;
  const sectionTitle = allProjectsSection.querySelector('.dropdown-section-title');
  sectionTitle.textContent = query ? 'Search Results' : (recentProjects.length > 0 ? 'All Projects' : 'Your Projects');

  if (projectsToShow.length > 0) {
    allProjectsSection.style.display = 'block';
    allProjectsList.innerHTML = projectsToShow
      .slice(0, 20)
      .map(project => createProjectItem(project.id, project.title, project.description, false))
      .join('');
  } else if (projects.length === 0) {
    allProjectsSection.style.display = 'block';
    allProjectsList.innerHTML = '<div class="repo-empty">No projects found. Create one on GitHub first.</div>';
  } else {
    allProjectsSection.style.display = 'block';
    allProjectsList.innerHTML = '<div class="repo-empty">No matching projects</div>';
  }

  // Add click handlers (use mousedown to fire before blur)
  document.querySelectorAll('.project-item').forEach(item => {
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent input blur
      handleProjectSelected(e);
    });
  });
}

function createProjectItem(id, title, description, isRecent) {
  return `
    <div class="project-item repo-item" data-project-id="${id}">
      <div class="repo-name">${title}${isRecent ? ' ⭐' : ''}</div>
      ${description ? `<div class="repo-description">${description}</div>` : ''}
    </div>
  `;
}

function handleProjectSelected(e) {
  const projectId = e.currentTarget.getAttribute('data-project-id');
  selectedProject = projects.find(p => p.id === projectId);

  if (selectedProject) {
    githubProjectSearch.value = selectedProject.title;
    selectedProjectId.value = selectedProject.id;

    // Update UI
    document.querySelectorAll('.project-item').forEach(item => {
      item.classList.remove('selected');
    });
    e.currentTarget.classList.add('selected');

    hideProjectDropdown();
  }
}

async function handleCreateProjectItem() {
  try {
    // Validate inputs
    if (!selectedProject) {
      showToast('Please select a project', 'error');
      githubProjectSearch.focus();
      return;
    }

    if (!projectItemTitle.value.trim()) {
      showToast('Please enter a title', 'error');
      projectItemTitle.focus();
      return;
    }

    // Disable button and show loading
    createProjectItemBtn.disabled = true;
    createProjectItemBtn.textContent = 'Adding...';

    // Create draft issue data with branding footer
    const projTitle = projectItemTitle.value.trim();
    let projBody = projectItemBody.value.trim();
    projBody += `\n\n---\n*\u2014${projTitle} noted by [Duly Noted](https://github.com/DavinciDreams/duly-noted)*`;

    const itemData = {
      title: projTitle,
      body: projBody
    };

    console.log('[GitHub Project] Creating draft issue:', itemData);

    // Create the draft issue
    const createdItem = await GitHubService.createProjectDraftIssue(selectedProject.id, itemData);

    console.log('[GitHub Project] Draft issue created');

    // Save to history
    const { generateUUID } = await import('../utils/helpers.js');
    const { addToHistory } = await import('../lib/storage.js');

    await addToHistory({
      id: generateUUID(),
      timestamp: Date.now(),
      transcription: currentTranscription,
      destination: 'github-project',
      metadata: {
        projectId: selectedProject.id,
        projectTitle: selectedProject.title,
        projectUrl: selectedProject.url,
        itemTitle: itemData.title
      }
    });

    // Show success
    showToast(
      `✓ Added to project! <a href="${selectedProject.url}" target="_blank" style="color: inherit; text-decoration: underline;">View Project →</a>`,
      'success',
      5000
    );

    // Reset form and recording UI
    resetProjectForm();
    resetRecordingUI();

    // Go back to recording screen
    showScreen(screens.RECORDING);

  } catch (error) {
    console.error('[GitHub Project] Error creating draft issue:', error);
    showToast(`Failed to add to project: ${error.message}`, 'error');
  } finally {
    createProjectItemBtn.disabled = false;
    createProjectItemBtn.textContent = 'Add to Project';
  }
}

function resetProjectForm() {
  githubProjectSearch.value = '';
  selectedProjectId.value = '';
  projectItemTitle.value = '';
  projectItemBody.value = '';
  selectedProject = null;
}

// ============================================================================
// Page Context: Screenshot, Element Selection, Console Logs
// ============================================================================

/**
 * Capture a screenshot of the active tab
 */
async function handleCaptureScreenshot() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showToast('No active tab found', 'error');
      return;
    }

    // chrome:// and edge:// pages can't be captured
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      showToast('Cannot capture restricted pages', 'error');
      return;
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

    capturedScreenshots.push({
      dataUrl,
      timestamp: Date.now(),
      tabUrl: tab.url,
      tabTitle: tab.title
    });

    // Save metadata to local storage (not the dataUrl — too large for storage quota)
    await chrome.storage.local.set({
      lastCaptureMetadata: {
        timestamp: Date.now(),
        tabUrl: tab.url,
        tabTitle: tab.title,
        count: capturedScreenshots.length
      }
    });

    updateAttachmentsPreview();
    updateActionButtons();
    showToast('Screenshot captured!', 'success');

    // Copy to clipboard via offscreen document
    copyScreenshotToClipboard(dataUrl);

    // Trigger AI summary analysis
    triggerAISummary();
  } catch (error) {
    console.error('[Screenshot] Capture failed:', error);
    showToast(`Screenshot failed: ${error.message}`, 'error');
  }
}

/**
 * Start element selection on the active tab
 */
async function handleSelectElement() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showToast('No active tab found', 'error');
      return;
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      showToast('Cannot select elements on restricted pages', 'error');
      return;
    }

    await ensureContentScriptInjected(tab.id);

    chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_SELECTION' }, (response) => {
      if (chrome.runtime.lastError) {
        showToast('Could not connect to page. Try refreshing.', 'error');
      } else {
        showToast('Click an element on the page to capture it', 'info');
      }
    });
  } catch (error) {
    console.error('[Element Selection] Failed:', error);
    showToast(`Element selection failed: ${error.message}`, 'error');
  }
}

/**
 * Capture console logs from the active tab
 */
async function handleCaptureConsole() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showToast('No active tab found', 'error');
      return;
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      showToast('Cannot capture console on restricted pages', 'error');
      return;
    }

    await ensureContentScriptInjected(tab.id);

    if (consoleMonitoringTabId === tab.id) {
      // Already monitoring — fetch logs
      chrome.tabs.sendMessage(tab.id, { type: 'GET_CONSOLE_LOGS' }, (response) => {
        if (chrome.runtime.lastError) {
          showToast('Lost connection to page. Try refreshing.', 'error');
          consoleMonitoringTabId = null;
          return;
        }
        if (response?.success) {
          capturedConsoleLogs = response.logs || [];
          updateAttachmentsPreview();
          updateActionButtons();
          showToast(`${capturedConsoleLogs.length} console entries captured`, 'success');
          triggerAISummary();
        }
      });
    } else {
      // Start monitoring
      chrome.tabs.sendMessage(tab.id, { type: 'START_CONSOLE_MONITORING' }, (response) => {
        if (response?.success) {
          consoleMonitoringTabId = tab.id;
          showToast('Console monitoring started. Click again to capture logs.', 'info');
        } else {
          showToast('Could not start console monitoring. Try refreshing.', 'error');
        }
      });
    }
  } catch (error) {
    console.error('[Console] Capture failed:', error);
    showToast(`Console capture failed: ${error.message}`, 'error');
  }
}

/**
 * Ensure content scripts are injected in the given tab
 */
async function ensureContentScriptInjected(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        // Inject content scripts programmatically
        chrome.scripting.executeScript({
          target: { tabId },
          files: [
            'src/content-scripts/namespace.js',
            'src/content-scripts/element-inspector.js',
            'src/content-scripts/element-selector.js',
            'src/content-scripts/console-interceptor.js',
            'src/content-scripts/main.js'
          ]
        }).then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    });
  });
}

/**
 * Copy screenshot to clipboard via offscreen document
 */
async function copyScreenshotToClipboard(dataUrl) {
  try {
    chrome.runtime.sendMessage({
      type: 'COPY_IMAGE_TO_CLIPBOARD',
      target: 'offscreen',
      dataUrl: dataUrl
    });
  } catch (error) {
    console.error('[Clipboard] Copy failed:', error);
  }
}

/**
 * Try to generate AI description using Chrome's Prompt API (multimodal)
 */
/**
 * Generate a comprehensive AI summary of all captured context.
 * Uses Chrome's Prompt API (Gemini Nano) for multimodal analysis.
 */
async function generateAISummary() {
  const { getSettings } = await import('../lib/storage.js');
  const settings = await getSettings();
  if (settings.aiSummaryEnabled === false) return;

  // Check if any sub-toggle is enabled — skip AI call entirely if nothing is wanted
  const wantTitle = settings.aiAutoTitle !== false;
  const wantTags = settings.aiAutoTags !== false;
  const wantDescription = settings.aiAutoDescription !== false;
  if (!wantTitle && !wantTags && !wantDescription) {
    console.log('[AI Summary] All sub-toggles off, skipping AI call');
    return;
  }

  if (!self.ai?.languageModel) {
    console.log('[AI Summary] Prompt API not available');
    return;
  }

  try {
    const capabilities = await self.ai.languageModel.capabilities();
    if (capabilities.available === 'no') return;

    // Show loading state
    aiSummary = { status: 'loading', timestamp: Date.now() };
    renderAISummaryUI();

    const session = await self.ai.languageModel.create();
    const promptParts = [];

    // Build context text
    let context = 'Analyze the following web capture and respond with JSON only.\n\n';

    // Source info
    const sourceUrl = capturedScreenshots[0]?.tabUrl || '';
    const sourceTitle = capturedScreenshots[0]?.tabTitle || '';
    if (sourceUrl) {
      context += `Source page: "${sourceTitle}" at ${sourceUrl}\n`;
    }

    // Element context
    if (capturedElement) {
      const tag = capturedElement.tagName.toLowerCase();
      const id = capturedElement.idAttribute ? `#${capturedElement.idAttribute}` : '';
      const classes = capturedElement.className || '';
      context += `Selected element: <${tag}${id}> classes="${classes}"\n`;
      context += `CSS selector: ${capturedElement.cssSelector}\n`;
    }

    // Console log context
    if (capturedConsoleLogs.length > 0) {
      const errors = capturedConsoleLogs.filter(l => l.level === 'error');
      const warnings = capturedConsoleLogs.filter(l => l.level === 'warn');
      const lines = [];
      if (errors.length > 0) {
        lines.push(`${errors.length} errors:`);
        errors.slice(0, 5).forEach(e => lines.push(`  - ${e.message.slice(0, 150)}`));
      }
      if (warnings.length > 0) {
        lines.push(`${warnings.length} warnings:`);
        warnings.slice(0, 3).forEach(w => lines.push(`  - ${w.message.slice(0, 150)}`));
      }
      context += `\nConsole output:\n${lines.join('\n')}\n`;
    }

    // User note context
    if (currentTranscription) {
      context += `\nUser note: "${currentTranscription.slice(0, 200)}"\n`;
    }

    // Dynamically build JSON schema based on enabled sub-toggles
    const jsonFields = [];
    const fieldInstructions = [];

    if (wantTitle) {
      jsonFields.push('"title": "short issue title under 60 chars"');
    }
    if (wantDescription) {
      jsonFields.push('"description": "1-2 sentence summary of what this capture shows, where it is from, and what it depicts"');
    }
    if (wantTags) {
      jsonFields.push('"suggestedTags": ["tag1", "tag2"]');
      const tagList = repoLabels.length > 0 ? repoLabels.map(l => l.name).join(', ') : 'bug, enhancement, UI, performance, error, accessibility, styling, API, security, documentation';
      fieldInstructions.push(`For suggestedTags, choose 1-3 from: ${tagList}.`);
    }
    // Always include consoleSummary (cheap, used in Notion flow)
    jsonFields.push('"consoleSummary": "one-line plain English summary of console logs, or empty string if none"');
    fieldInstructions.push('For consoleSummary, summarize errors/warnings in plain English. If no console logs, use empty string.');

    context += `\nRespond with ONLY valid JSON (no markdown, no backticks):\n{\n  ${jsonFields.join(',\n  ')}\n}\n\n${fieldInstructions.join('\n')}`;

    promptParts.push({ type: 'text', value: context });

    // Screenshot as multimodal image
    if (capturedScreenshots.length > 0) {
      try {
        const response = await fetch(capturedScreenshots[0].dataUrl);
        const blob = await response.blob();
        const imageBitmap = await createImageBitmap(blob);
        promptParts.push({ type: 'image', value: imageBitmap });
      } catch (imgErr) {
        console.warn('[AI Summary] Could not process screenshot:', imgErr);
      }
    }

    const result = await session.prompt(promptParts);
    session.destroy();

    // Parse response
    try {
      const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Build source citation
      let sourceCitation = '';
      if (sourceUrl) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        try {
          const hostname = new URL(sourceUrl).hostname;
          sourceCitation = `Captured from [${hostname}](${sourceUrl}) at ${time}`;
        } catch {
          sourceCitation = `Captured from ${sourceUrl} at ${time}`;
        }
      }

      aiSummary = {
        title: parsed.title || '',
        description: parsed.description || '',
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
        consoleSummary: parsed.consoleSummary || '',
        sourceCitation,
        status: 'done',
        timestamp: Date.now()
      };
    } catch {
      console.warn('[AI Summary] Failed to parse AI response:', result);
      aiSummary = { status: 'error', timestamp: Date.now() };
    }
  } catch (err) {
    console.warn('[AI Summary] Generation failed:', err);
    aiSummary = { status: 'error', timestamp: Date.now() };
  }

  renderAISummaryUI();
  applyAISummaryAutoFill();
}

/**
 * Debounced trigger for AI summary generation.
 * Waits 800ms after the last capture event before starting.
 */
function triggerAISummary() {
  if (aiSummaryDebounceTimer) {
    clearTimeout(aiSummaryDebounceTimer);
  }
  aiSummaryDebounceTimer = setTimeout(() => {
    generateAISummary();
  }, 800);
}

/**
 * Render the AI summary card based on current aiSummary state.
 */
function renderAISummaryUI() {
  if (!aiSummary || aiSummary.status === 'idle') {
    aiSummaryCard.style.display = 'none';
    return;
  }

  aiSummaryCard.style.display = 'block';

  if (aiSummary.status === 'loading') {
    aiSummaryContent.innerHTML = '<div class="ai-loading"><div class="spinner"></div> Analyzing capture...</div>';
    aiSummaryTags.innerHTML = '';
    return;
  }

  if (aiSummary.status === 'error') {
    aiSummaryContent.innerHTML = '<span style="color: var(--text-disabled); font-style: italic;">AI analysis unavailable</span>';
    aiSummaryTags.innerHTML = '';
    return;
  }

  // status === 'done'
  let html = '';
  if (aiSummary.description) {
    html += `<p>${escapeHtml(aiSummary.description)}</p>`;
  }
  if (aiSummary.consoleSummary) {
    html += `<p><strong>Console:</strong> ${escapeHtml(aiSummary.consoleSummary)}</p>`;
  }
  if (aiSummary.sourceCitation) {
    html += `<div class="ai-summary-source">${aiSummary.sourceCitation}</div>`;
  }
  aiSummaryContent.innerHTML = html;

  // Render tag pills
  if (aiSummary.suggestedTags && aiSummary.suggestedTags.length > 0) {
    aiSummaryTags.innerHTML = aiSummary.suggestedTags
      .map(tag => `<span class="ai-tag">${escapeHtml(tag)}</span>`)
      .join('');
  } else {
    aiSummaryTags.innerHTML = '';
  }
}

/**
 * Apply AI summary auto-fill to the note box if user hasn't typed anything.
 * Respects the aiAutoDescription setting.
 */
async function applyAISummaryAutoFill() {
  if (!aiSummary || aiSummary.status !== 'done') return;

  const { getSettings } = await import('../lib/storage.js');
  const settings = await getSettings();
  if (settings.aiAutoDescription === false) return;

  const noteBoxEmpty = noteBox.textContent.trim().length === 0;
  if (noteBoxEmpty && aiSummary.description) {
    noteBox.textContent = aiSummary.description;
    currentTranscription = aiSummary.description;
    updateActionButtons();
  }
}

/**
 * Escape HTML to prevent XSS from AI-generated content.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Generate a smart title based on captured context
 */
function generateSmartTitle() {
  if (capturedElement) {
    const tag = capturedElement.tagName.toLowerCase();
    const id = capturedElement.idAttribute ? `#${capturedElement.idAttribute}` : '';
    try {
      const hostname = capturedScreenshots[0]?.tabUrl
        ? new URL(capturedScreenshots[0].tabUrl).hostname
        : '';
      return `[Bug] ${tag}${id} on ${hostname}`.slice(0, 60);
    } catch {
      return `[Bug] ${tag}${id}`.slice(0, 60);
    }
  }

  if (capturedScreenshots.length > 0 && capturedScreenshots[0].tabUrl) {
    try {
      const hostname = new URL(capturedScreenshots[0].tabUrl).hostname;
      return `Issue on ${hostname}`;
    } catch {
      return '';
    }
  }

  if (currentTranscription) {
    const firstLine = currentTranscription.trim().split('\n')[0];
    return truncateText(firstLine, 60);
  }

  return '';
}

/**
 * Upload all captured screenshots to a GitHub repo
 * @returns {Promise<string[]>} Array of raw.githubusercontent.com URLs
 */
async function uploadScreenshotsToRepo(owner, repo) {
  const urls = [];
  for (const screenshot of capturedScreenshots) {
    try {
      const filename = `screenshot_${screenshot.timestamp}.png`;
      const url = await GitHubService.uploadImage(owner, repo, screenshot.dataUrl, filename);
      urls.push(url);
    } catch (error) {
      console.error('[GitHub] Screenshot upload failed:', error);
    }
  }
  return urls;
}

/**
 * Build markdown sections for attachments
 * @param {string[]} screenshotUrls - URLs for uploaded screenshots
 * @returns {string} Markdown content
 */
function buildAttachmentMarkdown(screenshotUrls) {
  const sections = [];

  // Screenshots section
  if (screenshotUrls.length > 0) {
    const images = screenshotUrls.map((url, i) => `![Screenshot ${i + 1}](${url})`).join('\n\n');
    sections.push(`## Screenshots\n\n${images}`);
  }

  // Element information section
  if (capturedElement) {
    const el = capturedElement;
    const tag = el.tagName.toLowerCase();
    const id = el.idAttribute || '—';
    const classes = (typeof el.className === 'string' ? el.className : '') || '—';
    const css = el.cssSelector || '—';
    const xpath = el.xpath || '—';
    const pos = el.position;
    const size = pos ? `${Math.round(pos.width)}x${Math.round(pos.height)}` : '—';

    const htmlSnippet = (el.outerHTML || '').slice(0, 200).replace(/`/g, "'");

    const table = [
      '| Property | Value |',
      '|----------|-------|',
      `| Tag | \`<${tag}>\` |`,
      `| ID | \`${id}\` |`,
      `| Classes | \`${classes}\` |`,
      `| CSS Selector | \`${css}\` |`,
      `| XPath | \`${xpath}\` |`,
      `| Size | ${size} |`,
    ].join('\n');

    sections.push(`## Element Information\n\n${table}\n\n<details><summary>HTML Snippet</summary>\n\n\`\`\`html\n${htmlSnippet}\n\`\`\`\n\n</details>`);
  }

  // Console logs section
  if (capturedConsoleLogs.length > 0) {
    const errors = capturedConsoleLogs.filter(l => l.level === 'error');
    const warnings = capturedConsoleLogs.filter(l => l.level === 'warn');
    const infos = capturedConsoleLogs.filter(l => l.level === 'info' || l.level === 'log');

    let logContent = '';

    if (errors.length > 0) {
      const errorLines = errors.slice(0, 20).map(l => {
        const time = new Date(l.timestamp).toLocaleTimeString();
        return `[${time}] ${l.message}`;
      }).join('\n');
      logContent += `### Errors (${errors.length})\n\n\`\`\`\n${errorLines}\n\`\`\`\n\n`;
    }

    if (warnings.length > 0) {
      const warnLines = warnings.slice(0, 10).map(l => {
        const time = new Date(l.timestamp).toLocaleTimeString();
        return `[${time}] ${l.message}`;
      }).join('\n');
      logContent += `### Warnings (${warnings.length})\n\n\`\`\`\n${warnLines}\n\`\`\`\n\n`;
    }

    if (infos.length > 0) {
      const infoLines = infos.slice(0, 10).map(l => {
        const time = new Date(l.timestamp).toLocaleTimeString();
        return `[${time}] ${l.message}`;
      }).join('\n');
      logContent += `### Info/Logs (${infos.length})\n\n\`\`\`\n${infoLines}\n\`\`\`\n\n`;
    }

    sections.push(`## Console Logs\n\n${logContent}`);
  }

  return sections.join('\n\n');
}

/**
 * Update the attachments preview in the page tools bar
 */
function updateAttachmentsPreview() {
  renderAttachmentsInto(attachmentsPreview);
}

/**
 * Render attachment previews into a container element
 */
function renderAttachmentsInto(container) {
  container.innerHTML = '';

  // Screenshot thumbnails
  capturedScreenshots.forEach((screenshot, index) => {
    const item = document.createElement('div');
    item.className = 'attachment-item';

    const img = document.createElement('img');
    img.src = screenshot.dataUrl;
    img.alt = `Screenshot ${index + 1}`;
    item.appendChild(img);

    // Only add remove button if container is NOT readonly
    if (!container.classList.contains('attachments-readonly')) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '\u00d7';
      removeBtn.title = 'Remove screenshot';
      removeBtn.addEventListener('click', () => {
        capturedScreenshots.splice(index, 1);
        updateAttachmentsPreview();
        updateActionButtons();
      });
      item.appendChild(removeBtn);
    }

    container.appendChild(item);
  });

  // Element badge
  if (capturedElement) {
    const badge = document.createElement('div');
    badge.className = 'attachment-badge';
    badge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg> Element`;

    if (!container.classList.contains('attachments-readonly')) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', () => {
        capturedElement = null;
        updateAttachmentsPreview();
        updateActionButtons();
      });
      badge.appendChild(removeBtn);
    }

    container.appendChild(badge);
  }

  // Console logs badge
  if (capturedConsoleLogs.length > 0) {
    const errors = capturedConsoleLogs.filter(l => l.level === 'error').length;
    const warns = capturedConsoleLogs.filter(l => l.level === 'warn').length;
    const badge = document.createElement('div');
    badge.className = 'attachment-badge';
    let label = `Console (${capturedConsoleLogs.length})`;
    if (errors > 0) label = `Console: ${errors} errors`;
    badge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg> ${label}`;

    if (!container.classList.contains('attachments-readonly')) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', () => {
        capturedConsoleLogs = [];
        updateAttachmentsPreview();
        updateActionButtons();
      });
      badge.appendChild(removeBtn);
    }

    container.appendChild(badge);
  }
}

// ============================================================================
// Initialization
// ============================================================================

// Start when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
