/**
 * Summora Content Script
 * Runs on YouTube pages to extract video transcripts
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Summora] Received message:', request.action);

  if (request.action === 'GET_TRANSCRIPT') {
    console.log('[Summora] Starting transcript extraction...');
    extractTranscript()
      .then(result => {
        console.log('[Summora] Transcript extraction result:', result.success ? 'SUCCESS' : 'FAILED');
        if (result.success) {
          console.log('[Summora] Transcript length:', result.transcript?.length, 'characters');
        } else {
          console.log('[Summora] Error:', result.error);
        }
        sendResponse(result);
      })
      .catch(error => {
        console.error('[Summora] Unexpected error:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to extract transcript'
        });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'CHECK_YOUTUBE_PAGE') {
    const isYT = isYouTubePage();
    const vidId = getVideoId();
    console.log('[Summora] Page check - isYouTube:', isYT, 'videoId:', vidId);
    sendResponse({
      success: true,
      isYouTube: isYT,
      videoId: vidId
    });
    return false;
  }
});

/**
 * Checks if current page is a YouTube watch page
 * @returns {boolean}
 */
function isYouTubePage() {
  return window.location.hostname === 'www.youtube.com' &&
         window.location.pathname === '/watch';
}

/**
 * Extracts video ID from URL
 * @returns {string|null}
 */
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Extracts video title from page
 * @returns {string}
 */
function getVideoTitle() {
  const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
  return titleElement ? titleElement.textContent.trim() : 'Unknown Video';
}

/**
 * Main function to extract transcript from YouTube video
 * @returns {Promise<{success: boolean, transcript?: string, videoTitle?: string, error?: string}>}
 */
async function extractTranscript() {
  try {
    console.log('[Summora] extractTranscript() called');

    const videoId = getVideoId();
    console.log('[Summora] Video ID:', videoId);

    if (!videoId) {
      console.warn('[Summora] No video ID found');
      return { success: false, error: 'No video ID found. Please open a YouTube video.' };
    }

    const videoTitle = getVideoTitle();
    console.log('[Summora] Video title:', videoTitle);

    // Try multiple methods to get transcript
    let transcript = null;

    // Method 1: Try to get from ytInitialPlayerResponse
    console.log('[Summora] Attempting Method 1: ytInitialPlayerResponse');
    transcript = await getTranscriptFromPlayerResponse(videoId);

    if (transcript) {
      console.log('[Summora] ✅ Method 1 succeeded! Transcript length:', transcript.length);
    } else {
      console.log('[Summora] ❌ Method 1 failed, trying Method 2');
    }

    // Method 2: If that fails, try to click the transcript button and scrape
    if (!transcript) {
      console.log('[Summora] Attempting Method 2: UI scraping');
      transcript = await getTranscriptFromUI();

      if (transcript) {
        console.log('[Summora] ✅ Method 2 succeeded! Transcript length:', transcript.length);
      } else {
        console.log('[Summora] ❌ Method 2 failed');
      }
    }

    if (!transcript) {
      console.error('[Summora] All methods failed - no transcript available');
      return {
        success: false,
        error: 'No transcript available for this video. The video may not have captions enabled.'
      };
    }

    console.log('[Summora] 🎉 Transcript extracted successfully!');
    return {
      success: true,
      transcript: transcript,
      videoTitle: videoTitle
    };

  } catch (error) {
    console.error('[Summora] Error extracting transcript:', error);
    return {
      success: false,
      error: error.message || 'Failed to extract transcript'
    };
  }
}

/**
 * Attempts to extract transcript from ytInitialPlayerResponse
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<string|null>}
 */
async function getTranscriptFromPlayerResponse(videoId) {
  try {
    console.log('[Summora Method 1] Searching for ytInitialPlayerResponse...');

    // Look for ytInitialPlayerResponse in page scripts
    const scripts = document.querySelectorAll('script');
    console.log('[Summora Method 1] Found', scripts.length, 'script tags on page');

    let playerResponse = null;

    for (const script of scripts) {
      const content = script.textContent;
      if (content.includes('ytInitialPlayerResponse')) {
        console.log('[Summora Method 1] Found ytInitialPlayerResponse in script');

        // Try multiple patterns to extract the JSON
        let match = content.match(/var ytInitialPlayerResponse\s*=\s*({.+?});var/s);
        if (!match) {
          match = content.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]+?});(?:var|<\/script>)/);
        }
        if (!match) {
          // Try finding the object by counting braces
          const startIndex = content.indexOf('ytInitialPlayerResponse');
          if (startIndex !== -1) {
            const jsonStart = content.indexOf('{', startIndex);
            if (jsonStart !== -1) {
              let braceCount = 0;
              let jsonEnd = jsonStart;
              for (let i = jsonStart; i < content.length; i++) {
                if (content[i] === '{') braceCount++;
                if (content[i] === '}') braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
              if (jsonEnd > jsonStart) {
                const jsonStr = content.substring(jsonStart, jsonEnd);
                console.log('[Summora Method 1] Extracted JSON string, length:', jsonStr.length);
                try {
                  playerResponse = JSON.parse(jsonStr);
                  console.log('[Summora Method 1] Successfully parsed player response');
                  break;
                } catch (e) {
                  console.warn('[Summora Method 1] Failed to parse JSON:', e.message);
                }
              }
            }
          }
        } else {
          console.log('[Summora Method 1] Matched ytInitialPlayerResponse with regex');
          try {
            playerResponse = JSON.parse(match[1]);
            console.log('[Summora Method 1] Successfully parsed player response');
            break;
          } catch (e) {
            console.warn('[Summora Method 1] Failed to parse JSON:', e.message);
          }
        }
      }
    }

    if (!playerResponse) {
      console.warn('[Summora Method 1] No playerResponse found');
      return null;
    }

    // Navigate through the response to find caption tracks
    console.log('[Summora Method 1] Looking for captions in playerResponse...');
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      console.warn('[Summora Method 1] No caption tracks found');
      console.log('[Summora Method 1] playerResponse.captions:', playerResponse?.captions);
      return null;
    }

    console.log('[Summora Method 1] Found', captions.length, 'caption track(s)');
    console.log('[Summora Method 1] Available languages:', captions.map(c => c.languageCode).join(', '));

    // Prefer English captions, or take the first available
    let captionTrack = captions.find(track => track.languageCode === 'en') || captions[0];
    console.log('[Summora Method 1] Selected caption track:', captionTrack.languageCode);

    const captionUrl = captionTrack.baseUrl;

    if (!captionUrl) {
      console.warn('[Summora Method 1] No caption URL found in track');
      return null;
    }

    console.log('[Summora Method 1] Caption URL found, fetching...');
    console.log('[Summora Method 1] URL:', captionUrl.substring(0, 100) + '...');

    // Add format parameter to get XML format explicitly
    const urlWithFormat = captionUrl.includes('?')
      ? `${captionUrl}&fmt=srv3`
      : `${captionUrl}?fmt=srv3`;

    // Fetch the caption data
    const response = await fetch(urlWithFormat);
    console.log('[Summora Method 1] Fetch response status:', response.status);

    if (!response.ok) {
      console.error('[Summora Method 1] Failed to fetch captions, status:', response.status);
      return null;
    }

    const captionData = await response.text();
    console.log('[Summora Method 1] Received caption data, length:', captionData.length, 'bytes');

    if (captionData.length === 0) {
      console.error('[Summora Method 1] Caption data is empty - YouTube may be blocking the request');
      return null;
    }

    // Parse the XML/JSON caption format
    console.log('[Summora Method 1] Parsing caption data...');
    const transcript = parseCaptionData(captionData);

    if (transcript) {
      console.log('[Summora Method 1] Successfully parsed transcript, length:', transcript.length, 'chars');
      console.log('[Summora Method 1] First 100 chars:', transcript.substring(0, 100) + '...');
    } else {
      console.warn('[Summora Method 1] Failed to parse caption data');
    }

    return transcript;

  } catch (error) {
    console.error('[Summora Method 1] Error:', error.message);
    console.error('[Summora Method 1] Stack:', error.stack);
    return null;
  }
}

/**
 * Parses caption data (XML or JSON format) into plain text
 * @param {string} data - Caption data in XML or JSON format
 * @returns {string}
 */
function parseCaptionData(data) {
  try {
    console.log('[Summora Parser] Parsing caption data...');
    console.log('[Summora Parser] Data preview:', data.substring(0, 200));

    // Try to parse as JSON first (JSON3 format)
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      console.log('[Summora Parser] Detected JSON format, parsing...');
      try {
        const jsonData = JSON.parse(data);
        console.log('[Summora Parser] JSON parsed successfully');

        let transcript = '';

        // Handle different JSON structures
        if (jsonData.events) {
          // JSON3 format
          transcript = jsonData.events
            .filter(event => event.segs)
            .map(event => event.segs.map(seg => seg.utf8).join(''))
            .join(' ');
        } else if (Array.isArray(jsonData)) {
          transcript = jsonData
            .map(item => item.text || item.utf8 || '')
            .join(' ');
        }

        if (transcript) {
          console.log('[Summora Parser] Successfully extracted transcript from JSON');
          return transcript.replace(/\s+/g, ' ').trim();
        }
      } catch (jsonError) {
        console.log('[Summora Parser] Not valid JSON, trying XML...');
      }
    }

    // Parse as XML (srv3 format)
    console.log('[Summora Parser] Parsing as XML...');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('[Summora Parser] XML parsing error:', parseError.textContent);
      return null;
    }

    const textNodes = xmlDoc.querySelectorAll('text');
    console.log('[Summora Parser] Found', textNodes.length, 'text nodes in XML');

    if (textNodes.length === 0) {
      console.warn('[Summora Parser] No <text> nodes found in XML');
      return null;
    }

    const transcript = Array.from(textNodes)
      .map(node => {
        // Decode HTML entities
        const text = node.textContent;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
      })
      .join(' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    console.log('[Summora Parser] Successfully created transcript from XML');
    return transcript;

  } catch (error) {
    console.error('[Summora Parser] Error:', error.message);
    return null;
  }
}

/**
 * Attempts to extract transcript by interacting with YouTube's transcript UI
 * @returns {Promise<string|null>}
 */
async function getTranscriptFromUI() {
  try {
    console.log('[Summora Method 2] Looking for transcript button...');

    // First, check if transcript panel is already open
    let transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');

    if (transcriptPanel && transcriptPanel.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED') {
      console.log('[Summora Method 2] Transcript panel already open!');
    } else {
      console.log('[Summora Method 2] Transcript panel not open, looking for button...');

      // Try to find the "Show transcript" button (below video description)
      let transcriptButton = null;

      // Method A: Look for button in description area
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        const text = button.textContent.toLowerCase();
        const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
        if (text.includes('transcript') || ariaLabel.includes('transcript')) {
          console.log('[Summora Method 2] Found transcript button:', button.textContent.trim());
          transcriptButton = button;
          break;
        }
      }

      // Method B: Try specific selector for transcript button
      if (!transcriptButton) {
        transcriptButton = document.querySelector('button[aria-label*="Show transcript"]');
        if (transcriptButton) {
          console.log('[Summora Method 2] Found transcript button via aria-label');
        }
      }

      // Method C: Look in the description toggle buttons
      if (!transcriptButton) {
        const descriptionButtons = document.querySelectorAll('#description-inline-expander button, ytd-structured-description-content-renderer button');
        for (const button of descriptionButtons) {
          const text = button.textContent.toLowerCase();
          if (text.includes('transcript')) {
            console.log('[Summora Method 2] Found transcript button in description area');
            transcriptButton = button;
            break;
          }
        }
      }

      if (!transcriptButton) {
        console.warn('[Summora Method 2] Transcript button not found');
        return null;
      }

      // Click the transcript button
      console.log('[Summora Method 2] Clicking transcript button...');
      transcriptButton.click();
      await sleep(1500); // Wait for panel to open and load

      // Re-query the panel after clicking
      transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
    }

    // Extract transcript from the panel
    console.log('[Summora Method 2] Looking for transcript panel...');

    // If panel wasn't found earlier, try multiple selectors now
    if (!transcriptPanel) {
      transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
    }

    if (!transcriptPanel) {
      console.log('[Summora Method 2] Trying alternate panel selector...');
      transcriptPanel = document.querySelector('#panels ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]');
    }

    if (!transcriptPanel) {
      console.warn('[Summora Method 2] Transcript panel not found');
      return null;
    }

    console.log('[Summora Method 2] Found transcript panel, extracting segments...');

    // Try multiple selectors for transcript segments
    let transcriptSegments = transcriptPanel.querySelectorAll('yt-formatted-string.segment-text');
    console.log('[Summora Method 2] Found', transcriptSegments.length, 'transcript segments (yt-formatted-string.segment-text)');

    if (transcriptSegments.length === 0) {
      transcriptSegments = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
      console.log('[Summora Method 2] Found', transcriptSegments.length, 'transcript segments (ytd-transcript-segment-renderer)');
    }

    if (!transcriptSegments || transcriptSegments.length === 0) {
      console.warn('[Summora Method 2] No transcript segments found');
      return null;
    }

    const transcript = Array.from(transcriptSegments)
      .map(segment => segment.textContent.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('[Summora Method 2] Extracted transcript, length:', transcript.length, 'chars');

    // Close the transcript panel
    const closeButton = transcriptPanel.querySelector('button[aria-label*="Close"]');
    if (closeButton) {
      console.log('[Summora Method 2] Closing transcript panel...');
      closeButton.click();
    }

    return transcript;

  } catch (error) {
    console.error('[Summora Method 2] Error:', error.message);
    console.error('[Summora Method 2] Stack:', error.stack);
    return null;
  }
}

/**
 * Utility function to sleep/wait
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Log that content script is loaded
console.log('Summora content script loaded');
