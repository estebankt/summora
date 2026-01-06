/**
 * Summora Popup Script
 * Handles UI interactions, state management, and message passing
 */

// DOM Elements
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const summarizeBtn = document.getElementById('summarizeBtn');
const summarizeBtnText = document.getElementById('summarizeBtnText');
const summarizeLoader = document.getElementById('summarizeLoader');
const summaryContainer = document.getElementById('summaryContainer');
const summaryContent = document.getElementById('summaryContent');
const copySummaryBtn = document.getElementById('copySummaryBtn');
const statusMessage = document.getElementById('statusMessage');
const notYouTubeMessage = document.getElementById('notYouTubeMessage');
const mainContent = document.getElementById('mainContent');

// Settings Elements
const providerSelect = document.getElementById('providerSelect');
const openaiKeyInput = document.getElementById('openaiKey');
const claudeKeyInput = document.getElementById('claudeKey');
const geminiKeyInput = document.getElementById('geminiKey');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsStatus = document.getElementById('settingsStatus');
const openaiSettings = document.getElementById('openaiSettings');
const claudeSettings = document.getElementById('claudeSettings');
const geminiSettings = document.getElementById('geminiSettings');

// State
let currentTab = null;
let isYouTubePage = false;

/**
 * Initialize popup
 */
async function init() {
  // Load settings
  await loadSettings();

  // Check if current tab is YouTube
  await checkYouTubePage();

  // Setup event listeners
  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  settingsBtn.addEventListener('click', showSettings);
  backBtn.addEventListener('click', showMain);
  summarizeBtn.addEventListener('click', handleSummarize);
  copySummaryBtn.addEventListener('click', copySummary);
  saveSettingsBtn.addEventListener('click', saveSettings);
  providerSelect.addEventListener('change', handleProviderChange);
}

/**
 * Check if current tab is a YouTube video page
 */
async function checkYouTubePage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (!tab.url || !tab.url.includes('youtube.com/watch')) {
      isYouTubePage = false;
      notYouTubeMessage.classList.remove('hidden');
      mainContent.classList.add('hidden');
      return;
    }

    // Send message to content script to verify
    chrome.tabs.sendMessage(tab.id, { action: 'CHECK_YOUTUBE_PAGE' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded yet, try to inject
        injectContentScript(tab.id);
        return;
      }

      isYouTubePage = response?.isYouTube || false;
      if (isYouTubePage) {
        notYouTubeMessage.classList.add('hidden');
        mainContent.classList.remove('hidden');
      } else {
        notYouTubeMessage.classList.remove('hidden');
        mainContent.classList.add('hidden');
      }
    });

  } catch (error) {
    console.error('Error checking YouTube page:', error);
    isYouTubePage = false;
  }
}

/**
 * Inject content script if not already loaded
 */
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/content.js']
    });
    // Try checking again after a short delay
    setTimeout(checkYouTubePage, 500);
  } catch (error) {
    console.error('Error injecting content script:', error);
  }
}

/**
 * Handle summarize button click
 */
async function handleSummarize() {
  console.log('[Summora Popup] Summarize button clicked');

  if (!isYouTubePage || !currentTab) {
    console.warn('[Summora Popup] Not on YouTube page');
    showStatus('Please open a YouTube video first', 'error');
    return;
  }

  console.log('[Summora Popup] Checking API key configuration...');
  // Check if API key is configured
  const settings = await chrome.storage.sync.get(['provider', 'openaiKey', 'claudeKey', 'geminiKey']);
  const provider = settings.provider || 'openai';
  const apiKey = settings[`${provider}Key`];

  console.log('[Summora Popup] Provider:', provider, '| Has API key:', !!apiKey);

  if (!apiKey) {
    console.warn('[Summora Popup] No API key configured');
    showStatus(`Please configure your ${provider.toUpperCase()} API key in settings`, 'error');
    return;
  }

  // Show loading state
  console.log('[Summora Popup] Setting loading state...');
  setLoading(true);
  summaryContainer.classList.add('hidden');
  hideStatus();

  try {
    // Get transcript from content script
    console.log('[Summora Popup] Requesting transcript from content script...');
    const transcriptResponse = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(currentTab.id, { action: 'GET_TRANSCRIPT' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Summora Popup] Content script error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log('[Summora Popup] Received transcript response:', response.success ? 'SUCCESS' : 'FAILED');
          resolve(response);
        }
      });
    });

    if (!transcriptResponse.success) {
      console.error('[Summora Popup] Transcript extraction failed:', transcriptResponse.error);
      showStatus(transcriptResponse.error, 'error');
      setLoading(false);
      return;
    }

    const { transcript, videoTitle } = transcriptResponse;
    console.log('[Summora Popup] Transcript received - Length:', transcript.length, '| Title:', videoTitle);

    // Send to service worker for summarization
    console.log('[Summora Popup] Sending to service worker for summarization...');
    const summaryResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'SUMMARIZE',
        transcript: transcript,
        videoTitle: videoTitle
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Summora Popup] Service worker error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log('[Summora Popup] Received summary response:', response.success ? 'SUCCESS' : 'FAILED');
          resolve(response);
        }
      });
    });

    setLoading(false);

    if (!summaryResponse.success) {
      console.error('[Summora Popup] Summarization failed:', summaryResponse.error);
      showStatus(summaryResponse.error, 'error');
      return;
    }

    console.log('[Summora Popup] Summary received, displaying...');
    // Display summary
    displaySummary(summaryResponse.summary, videoTitle);

  } catch (error) {
    console.error('[Summora Popup] Unexpected error:', error);
    setLoading(false);
    showStatus(`Error: ${error.message}`, 'error');
  }
}

/**
 * Display summary in UI
 */
function displaySummary(summary, videoTitle) {
  summaryContent.textContent = summary;
  summaryContainer.classList.remove('hidden');
  showStatus('Summary generated successfully!', 'success');
}

/**
 * Copy summary to clipboard
 */
async function copySummary() {
  try {
    const text = summaryContent.textContent;
    await navigator.clipboard.writeText(text);
    showStatus('Summary copied to clipboard!', 'success');
  } catch (error) {
    showStatus('Failed to copy summary', 'error');
  }
}

/**
 * Set loading state
 */
function setLoading(loading) {
  summarizeBtn.disabled = loading;
  if (loading) {
    summarizeBtnText.classList.add('hidden');
    summarizeLoader.classList.remove('hidden');
  } else {
    summarizeBtnText.classList.remove('hidden');
    summarizeLoader.classList.add('hidden');
  }
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove('hidden');

  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      hideStatus();
    }, 5000);
  }
}

/**
 * Hide status message
 */
function hideStatus() {
  statusMessage.classList.add('hidden');
}

/**
 * Show settings view
 */
function showSettings() {
  mainView.classList.add('hidden');
  settingsView.classList.remove('hidden');
  hideStatus();
}

/**
 * Show main view
 */
function showMain() {
  settingsView.classList.add('hidden');
  mainView.classList.remove('hidden');
  settingsStatus.classList.add('hidden');
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get(['provider', 'openaiKey', 'claudeKey', 'geminiKey']);

    // Set provider
    providerSelect.value = settings.provider || 'openai';

    // Set API keys
    openaiKeyInput.value = settings.openaiKey || '';
    claudeKeyInput.value = settings.claudeKey || '';
    geminiKeyInput.value = settings.geminiKey || '';

    // Show appropriate settings panel
    handleProviderChange();

  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Handle provider selection change
 */
function handleProviderChange() {
  const provider = providerSelect.value;

  // Hide all provider settings
  openaiSettings.classList.add('hidden');
  claudeSettings.classList.add('hidden');
  geminiSettings.classList.add('hidden');

  // Show selected provider settings
  switch (provider) {
    case 'openai':
      openaiSettings.classList.remove('hidden');
      break;
    case 'claude':
      claudeSettings.classList.remove('hidden');
      break;
    case 'gemini':
      geminiSettings.classList.remove('hidden');
      break;
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const provider = providerSelect.value;
    const openaiKey = openaiKeyInput.value.trim();
    const claudeKey = claudeKeyInput.value.trim();
    const geminiKey = geminiKeyInput.value.trim();

    // Validate that current provider has a key
    const currentKey = provider === 'openai' ? openaiKey :
                      provider === 'claude' ? claudeKey :
                      geminiKey;

    if (!currentKey) {
      showSettingsStatus(`Please enter an API key for ${provider.toUpperCase()}`, 'error');
      return;
    }

    // Save to storage
    await chrome.storage.sync.set({
      provider: provider,
      openaiKey: openaiKey,
      claudeKey: claudeKey,
      geminiKey: geminiKey
    });

    showSettingsStatus('Settings saved successfully!', 'success');

    // Optionally test the API key
    setTimeout(() => {
      showMain();
    }, 1500);

  } catch (error) {
    console.error('Error saving settings:', error);
    showSettingsStatus('Failed to save settings', 'error');
  }
}

/**
 * Show settings status message
 */
function showSettingsStatus(message, type = 'info') {
  settingsStatus.textContent = message;
  settingsStatus.className = `status-message ${type}`;
  settingsStatus.classList.remove('hidden');

  if (type === 'success') {
    setTimeout(() => {
      settingsStatus.classList.add('hidden');
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
