/**
 * Summora Service Worker
 * Handles background tasks including AI API calls and message routing
 */

console.log('[Summora SW] Service worker loading...');

// Import AI provider modules
// Note: In Manifest V3, we use importScripts for service worker imports
try {
  console.log('[Summora SW] Importing provider scripts...');
  importScripts('../providers/openai.js', '../providers/claude.js', '../providers/gemini.js');
  console.log('[Summora SW] ✅ All provider scripts loaded successfully');

  // Verify that summarize function is available
  console.log('[Summora SW] Checking if summarize function exists:', typeof summarize);
  if (typeof summarize !== 'function') {
    console.error('[Summora SW] ❌ summarize function is not defined!');
  } else {
    console.log('[Summora SW] ✅ summarize function is ready');
  }
} catch (error) {
  console.error('[Summora SW] ❌ Failed to load provider scripts:', error);
  console.error('[Summora SW] Error details:', error.message, error.stack);
}

/**
 * Message handler for communication with popup and content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Summora SW] ========================================');
  console.log('[Summora SW] Message received at:', new Date().toISOString());
  console.log('[Summora SW] Action:', request.action);
  console.log('[Summora SW] Sender:', sender.tab ? `Tab ${sender.tab.id}` : 'Extension');

  if (request.action === 'SUMMARIZE') {
    console.log('[Summora SW] 🎬 Starting SUMMARIZE handler');
    console.log('[Summora SW] Transcript length:', request.transcript?.length);
    console.log('[Summora SW] Video title:', request.videoTitle);

    console.log('[Summora SW] Calling handleSummarize...');

    handleSummarize(request.transcript, request.videoTitle)
      .then(result => {
        console.log('[Summora SW] ✅ handleSummarize completed');
        console.log('[Summora SW] Result success:', result.success);
        console.log('[Summora SW] Result has summary:', !!result.summary);
        console.log('[Summora SW] Result has error:', !!result.error);

        if (!result.success) {
          console.error('[Summora SW] ❌ Summarization failed:', result.error);
        } else {
          console.log('[Summora SW] Summary length:', result.summary?.length);
        }

        console.log('[Summora SW] Sending response back to popup...');
        sendResponse(result);
        console.log('[Summora SW] ✅ Response sent successfully');
      })
      .catch(error => {
        console.error('[Summora SW] ❌ handleSummarize threw exception:', error);
        console.error('[Summora SW] Error name:', error.name);
        console.error('[Summora SW] Error message:', error.message);
        console.error('[Summora SW] Error stack:', error.stack);

        const errorResponse = {
          success: false,
          error: error.message || 'An unexpected error occurred'
        };

        console.log('[Summora SW] Sending error response...');
        sendResponse(errorResponse);
        console.log('[Summora SW] ✅ Error response sent');
      });

    console.log('[Summora SW] Returning true to keep message channel open');
    return true; // Keep channel open for async response
  }

  if (request.action === 'TEST_API_KEY') {
    console.log('[Summora SW] Testing API key for provider:', request.provider);
    testApiKey(request.provider, request.apiKey)
      .then(result => {
        console.log('[Summora SW] API key test result:', result.success ? 'VALID' : 'INVALID');
        sendResponse(result);
      })
      .catch(error => {
        console.error('[Summora SW] API key test error:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to test API key'
        });
      });
    return true;
  }

  console.warn('[Summora SW] ⚠️ Unknown action:', request.action);
  return false;
});

/**
 * Handles summarization request
 * @param {string} transcript - Video transcript text
 * @param {string} videoTitle - Video title
 * @returns {Promise<{success: boolean, summary?: string, error?: string}>}
 */
async function handleSummarize(transcript, videoTitle) {
  try {
    console.log('[Summora SW] Loading settings...');
    // Load user settings
    const settings = await chrome.storage.sync.get(['provider', 'openaiKey', 'claudeKey', 'geminiKey']);

    const provider = settings.provider || 'openai';
    console.log('[Summora SW] Provider:', provider);

    let apiKey;

    // Get the appropriate API key based on selected provider
    switch (provider) {
      case 'openai':
        apiKey = settings.openaiKey;
        break;
      case 'claude':
        apiKey = settings.claudeKey;
        break;
      case 'gemini':
        apiKey = settings.geminiKey;
        break;
      default:
        console.error('[Summora SW] Invalid provider:', provider);
        return { success: false, error: 'Invalid provider selected' };
    }

    // Check if API key exists
    if (!apiKey) {
      console.warn('[Summora SW] No API key configured for provider:', provider);
      return {
        success: false,
        error: `No API key found for ${provider}. Please configure your API key in settings.`
      };
    }

    console.log('[Summora SW] API key found, calling', provider, 'API...');
    console.log('[Summora SW] Transcript length:', transcript.length, 'characters');

    // Call the appropriate provider
    let result;
    switch (provider) {
      case 'openai':
        console.log('[Summora SW] Calling OpenAI summarize...');
        result = await summarize(transcript, apiKey); // From openai.js
        break;
      case 'claude':
        console.log('[Summora SW] Calling Claude summarize...');
        result = await summarize(transcript, apiKey); // From claude.js
        break;
      case 'gemini':
        console.log('[Summora SW] Calling Gemini summarize...');
        result = await summarize(transcript, apiKey); // From gemini.js
        break;
    }

    console.log('[Summora SW] Provider response:', result.success ? 'SUCCESS' : 'FAILED');
    if (result.success) {
      console.log('[Summora SW] Summary length:', result.summary?.length, 'characters');
    } else {
      console.error('[Summora SW] Provider error:', result.error);
    }

    // Add video title to the result if successful
    if (result.success && videoTitle) {
      result.videoTitle = videoTitle;
    }

    return result;

  } catch (error) {
    console.error('[Summora SW] Error in handleSummarize:', error.message);
    console.error('[Summora SW] Stack:', error.stack);
    return {
      success: false,
      error: `Failed to generate summary: ${error.message}`
    };
  }
}

/**
 * Tests an API key by making a small request
 * @param {string} provider - Provider name (openai, claude, gemini)
 * @param {string} apiKey - API key to test
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function testApiKey(provider, apiKey) {
  const testTranscript = 'This is a test transcript to verify the API key works correctly.';

  try {
    let result;
    switch (provider) {
      case 'openai':
        result = await summarize(testTranscript, apiKey, { maxTokens: 50 });
        break;
      case 'claude':
        result = await summarize(testTranscript, apiKey, { maxTokens: 50 });
        break;
      case 'gemini':
        result = await summarize(testTranscript, apiKey, { maxTokens: 50 });
        break;
      default:
        return { success: false, error: 'Invalid provider' };
    }

    return result;

  } catch (error) {
    return {
      success: false,
      error: `API key test failed: ${error.message}`
    };
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Summora SW] onInstalled event:', details.reason);
  if (details.reason === 'install') {
    // Set default provider on first install
    chrome.storage.sync.set({ provider: 'openai' });
    console.log('[Summora SW] ✅ Summora installed successfully, default provider set to OpenAI');
  } else if (details.reason === 'update') {
    console.log('[Summora SW] Extension updated');
  }
});

console.log('[Summora SW] ========================================');
console.log('[Summora SW] ✅ Service worker fully initialized and ready');
console.log('[Summora SW] ========================================');
