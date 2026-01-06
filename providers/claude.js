/**
 * Anthropic Claude Provider for Summora
 * Handles communication with Anthropic's Messages API
 */

const CLAUDE_CONFIG = {
  endpoint: 'https://api.anthropic.com/v1/messages',
  model: 'claude-3-5-haiku-20241022', // Fast and affordable
  maxTokens: 500,
  apiVersion: '2023-06-01'
};

const SUMMARY_PROMPT = `You are a helpful assistant that creates concise summaries of YouTube video transcripts.

Format your response EXACTLY as follows:
- First line: A clear, descriptive title for the video content
- Then list 5-8 key points, each starting with a bullet point (•)
- End with a brief conclusion (1-2 sentences) under "Conclusion:"

Keep the summary concise and focus on the main ideas and takeaways.`;

/**
 * Summarizes transcript using Anthropic Claude API
 * @param {string} transcript - The video transcript text
 * @param {string} apiKey - Anthropic API key
 * @param {Object} options - Additional options
 * @returns {Promise<{success: boolean, summary?: string, error?: string}>}
 */
async function summarize(transcript, apiKey, options = {}) {
  try {
    console.log('[Claude] Starting summarization...');
    console.log('[Claude] Transcript length:', transcript.length, 'characters');
    console.log('[Claude] API key present:', !!apiKey);
    console.log('[Claude] API key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');

    // Truncate very long transcripts to avoid token limits
    const maxTranscriptLength = 12000; // ~3000 tokens
    const truncatedTranscript = transcript.length > maxTranscriptLength
      ? transcript.substring(0, maxTranscriptLength) + '...'
      : transcript;

    console.log('[Claude] Using transcript length:', truncatedTranscript.length, 'characters');
    console.log('[Claude] Sending request to:', CLAUDE_CONFIG.endpoint);

    const response = await fetch(CLAUDE_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_CONFIG.apiVersion
      },
      body: JSON.stringify({
        model: options.model || CLAUDE_CONFIG.model,
        max_tokens: options.maxTokens || CLAUDE_CONFIG.maxTokens,
        system: SUMMARY_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Please summarize this YouTube video transcript:\n\n${truncatedTranscript}`
          }
        ]
      })
    });

    console.log('[Claude] Response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('[Claude] Request failed with status:', response.status);
      const errorText = await response.text();
      console.error('[Claude] Error response body:', errorText);

      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('[Claude] Could not parse error response as JSON');
      }
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      // Handle specific error cases
      if (response.status === 401) {
        return { success: false, error: 'Invalid API key. Please check your Claude API key in settings.' };
      } else if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' };
      } else if (response.status === 500 || response.status === 503) {
        return { success: false, error: 'Claude service is temporarily unavailable. Please try again.' };
      }

      return { success: false, error: `Claude API error: ${errorMessage}` };
    }

    const responseText = await response.text();
    console.log('[Claude] Response body length:', responseText.length);
    console.log('[Claude] Response body preview:', responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('[Claude] Response parsed successfully');
    } catch (e) {
      console.error('[Claude] Failed to parse response JSON:', e.message);
      return { success: false, error: 'Failed to parse Claude response' };
    }

    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('[Claude] Unexpected response format');
      console.error('[Claude] Full response:', JSON.stringify(data, null, 2));
      return { success: false, error: 'Unexpected response format from Claude' };
    }

    const summary = data.content[0].text.trim();
    console.log('[Claude] Summary extracted, length:', summary.length);
    console.log('[Claude] ✅ Summarization successful!');

    return { success: true, summary };

  } catch (error) {
    console.error('[Claude] Exception occurred:', error);
    console.error('[Claude] Error message:', error.message);
    console.error('[Claude] Error stack:', error.stack);
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
