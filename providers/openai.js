/**
 * OpenAI Provider for Summora
 * Handles communication with OpenAI's Chat Completions API
 */

const OPENAI_CONFIG = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini', // Cost-effective and fast
  maxTokens: 500,
  temperature: 0.7
};

const SUMMARY_PROMPT = `You are a helpful assistant that creates concise summaries of YouTube video transcripts.

Format your response EXACTLY as follows:
- First line: A clear, descriptive title for the video content
- Then list 5-8 key points, each starting with a bullet point (•)
- End with a brief conclusion (1-2 sentences) under "Conclusion:"

Keep the summary concise and focus on the main ideas and takeaways.`;

/**
 * Summarizes transcript using OpenAI API
 * @param {string} transcript - The video transcript text
 * @param {string} apiKey - OpenAI API key
 * @param {Object} options - Additional options
 * @returns {Promise<{success: boolean, summary?: string, error?: string}>}
 */
async function summarize(transcript, apiKey, options = {}) {
  try {
    console.log('[OpenAI] Starting summarization...');
    console.log('[OpenAI] Transcript length:', transcript.length, 'characters');
    console.log('[OpenAI] API key present:', !!apiKey);
    console.log('[OpenAI] API key prefix:', apiKey ? apiKey.substring(0, 8) + '...' : 'none');

    // Truncate very long transcripts to avoid token limits
    const maxTranscriptLength = 12000; // ~3000 tokens
    const truncatedTranscript = transcript.length > maxTranscriptLength
      ? transcript.substring(0, maxTranscriptLength) + '...'
      : transcript;

    console.log('[OpenAI] Using transcript length:', truncatedTranscript.length, 'characters');

    const requestBody = {
      model: options.model || OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: SUMMARY_PROMPT
        },
        {
          role: 'user',
          content: `Please summarize this YouTube video transcript:\n\n${truncatedTranscript}`
        }
      ],
      max_tokens: options.maxTokens || OPENAI_CONFIG.maxTokens,
      temperature: options.temperature || OPENAI_CONFIG.temperature
    };

    console.log('[OpenAI] Request config:', {
      endpoint: OPENAI_CONFIG.endpoint,
      model: requestBody.model,
      max_tokens: requestBody.max_tokens,
      temperature: requestBody.temperature
    });

    console.log('[OpenAI] Sending request to:', OPENAI_CONFIG.endpoint);

    const response = await fetch(OPENAI_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[OpenAI] Response status:', response.status, response.statusText);
    console.log('[OpenAI] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('[OpenAI] Request failed with status:', response.status);

      const errorText = await response.text();
      console.error('[OpenAI] Error response body:', errorText);

      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('[OpenAI] Could not parse error response as JSON');
      }

      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      // Handle specific error cases
      if (response.status === 401) {
        console.error('[OpenAI] Authentication failed - invalid API key');
        return { success: false, error: 'Invalid API key. Please check your OpenAI API key in settings.' };
      } else if (response.status === 429) {
        console.error('[OpenAI] Rate limit exceeded');
        return { success: false, error: 'Rate limit exceeded. Please try again later.' };
      } else if (response.status === 500 || response.status === 503) {
        console.error('[OpenAI] Server error');
        return { success: false, error: 'OpenAI service is temporarily unavailable. Please try again.' };
      }

      return { success: false, error: `OpenAI API error: ${errorMessage}` };
    }

    const responseText = await response.text();
    console.log('[OpenAI] Response body length:', responseText.length);
    console.log('[OpenAI] Response body preview:', responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('[OpenAI] Response parsed successfully');
    } catch (e) {
      console.error('[OpenAI] Failed to parse response JSON:', e.message);
      return { success: false, error: 'Failed to parse OpenAI response' };
    }

    console.log('[OpenAI] Response structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasFirstChoice: !!data.choices?.[0],
      hasMessage: !!data.choices?.[0]?.message
    });

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[OpenAI] Unexpected response format');
      console.error('[OpenAI] Full response:', JSON.stringify(data, null, 2));
      return { success: false, error: 'Unexpected response format from OpenAI' };
    }

    const summary = data.choices[0].message.content.trim();
    console.log('[OpenAI] Summary extracted, length:', summary.length);
    console.log('[OpenAI] Summary preview:', summary.substring(0, 100));
    console.log('[OpenAI] ✅ Summarization successful!');

    return { success: true, summary };

  } catch (error) {
    console.error('[OpenAI] Exception occurred:', error);
    console.error('[OpenAI] Error name:', error.name);
    console.error('[OpenAI] Error message:', error.message);
    console.error('[OpenAI] Error stack:', error.stack);

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
