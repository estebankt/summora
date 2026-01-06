/**
 * Google Gemini Provider for Summora
 * Handles communication with Google's Generative AI API
 */

const GEMINI_CONFIG = {
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  model: 'gemini-1.5-flash', // Fast with free tier
  maxTokens: 500,
  temperature: 0.7
};

const SUMMARY_PROMPT = `You are a helpful assistant that creates concise summaries of YouTube video transcripts.

Format your response EXACTLY as follows:
- First line: A clear, descriptive title for the video content
- Then list 5-8 key points, each starting with a bullet point (•)
- End with a brief conclusion (1-2 sentences) under "Conclusion:"

Keep the summary concise and focus on the main ideas and takeaways.

Please summarize this YouTube video transcript:`;

/**
 * Summarizes transcript using Google Gemini API
 * @param {string} transcript - The video transcript text
 * @param {string} apiKey - Google API key
 * @param {Object} options - Additional options
 * @returns {Promise<{success: boolean, summary?: string, error?: string}>}
 */
async function summarize(transcript, apiKey, options = {}) {
  try {
    console.log('[Gemini] Starting summarization...');
    console.log('[Gemini] Transcript length:', transcript.length, 'characters');
    console.log('[Gemini] API key present:', !!apiKey);
    console.log('[Gemini] API key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');

    // Truncate very long transcripts to avoid token limits
    const maxTranscriptLength = 12000; // ~3000 tokens
    const truncatedTranscript = transcript.length > maxTranscriptLength
      ? transcript.substring(0, maxTranscriptLength) + '...'
      : transcript;

    console.log('[Gemini] Using transcript length:', truncatedTranscript.length, 'characters');

    // Gemini uses API key as query parameter
    const url = `${GEMINI_CONFIG.endpoint}?key=${apiKey}`;
    console.log('[Gemini] Sending request to:', url.replace(/key=.+$/, 'key=***'));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SUMMARY_PROMPT}\n\n${truncatedTranscript}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || GEMINI_CONFIG.temperature,
          maxOutputTokens: options.maxTokens || GEMINI_CONFIG.maxTokens
        }
      })
    });

    console.log('[Gemini] Response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('[Gemini] Request failed with status:', response.status);
      const errorText = await response.text();
      console.error('[Gemini] Error response body:', errorText);

      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('[Gemini] Could not parse error response as JSON');
      }
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      // Handle specific error cases
      if (response.status === 400 && errorMessage.includes('API_KEY')) {
        return { success: false, error: 'Invalid API key. Please check your Gemini API key in settings.' };
      } else if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' };
      } else if (response.status === 500 || response.status === 503) {
        return { success: false, error: 'Gemini service is temporarily unavailable. Please try again.' };
      }

      return { success: false, error: `Gemini API error: ${errorMessage}` };
    }

    const responseText = await response.text();
    console.log('[Gemini] Response body length:', responseText.length);
    console.log('[Gemini] Response body preview:', responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('[Gemini] Response parsed successfully');
    } catch (e) {
      console.error('[Gemini] Failed to parse response JSON:', e.message);
      return { success: false, error: 'Failed to parse Gemini response' };
    }

    // Gemini response structure: candidates[0].content.parts[0].text
    if (!data.candidates ||
        !data.candidates[0] ||
        !data.candidates[0].content ||
        !data.candidates[0].content.parts ||
        !data.candidates[0].content.parts[0] ||
        !data.candidates[0].content.parts[0].text) {
      console.error('[Gemini] Unexpected response format');
      console.error('[Gemini] Full response:', JSON.stringify(data, null, 2));
      return { success: false, error: 'Unexpected response format from Gemini' };
    }

    const summary = data.candidates[0].content.parts[0].text.trim();
    console.log('[Gemini] Summary extracted, length:', summary.length);
    console.log('[Gemini] ✅ Summarization successful!');

    return { success: true, summary };

  } catch (error) {
    console.error('[Gemini] Exception occurred:', error);
    console.error('[Gemini] Error message:', error.message);
    console.error('[Gemini] Error stack:', error.stack);
    // Network or other errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { success: false, error: 'Network error. Please check your internet connection.' };
    }
    return { success: false, error: `Error: ${error.message}` };
  }
}

// Export for use in service worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { summarize };
}
