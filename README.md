# Summora - AI-Powered YouTube Summarizer

A production-ready Chrome Extension that extracts YouTube video transcripts and generates concise, structured summaries using AI.

## Features

- ✨ **One-Click Summarization**: Extract and summarize YouTube videos instantly
- 🤖 **Multiple AI Providers**: Choose between OpenAI, Anthropic Claude, or Google Gemini
- 🔐 **Secure & Private**: Your API keys are stored locally and never shared
- 📋 **Structured Output**: Get clean summaries with title, key points, and conclusion
- 🎨 **Modern UI**: Clean, intuitive interface with real-time status updates

## Installation

### Load as Unpacked Extension (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `summora` directory

### From Chrome Web Store

_Coming soon..._

## Setup

1. Click the Summora extension icon in your Chrome toolbar
2. Click the settings (gear) icon
3. Select your preferred AI provider
4. Enter your API key:
   - **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Claude**: Get from [Anthropic Console](https://console.anthropic.com/)
   - **Gemini**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
5. Click "Save Settings"

## Usage

1. Navigate to any YouTube video (e.g., `https://www.youtube.com/watch?v=...`)
2. Click the Summora extension icon
3. Click "Summarize Video"
4. Wait for the AI to process the transcript (usually 5-15 seconds)
5. View your structured summary with key points
6. Click the copy icon to copy the summary to your clipboard

## Summary Format

Summaries are generated in the following format:

```
[Video Title]

Key Points:
• Main point 1
• Main point 2
• Main point 3
...

Conclusion:
[Brief wrap-up of the content]
```

## Architecture

### Folder Structure

```
summora/
├── manifest.json              # Extension configuration
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                     # Extension popup UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/                   # Content script
│   └── content.js            # YouTube transcript extraction
├── background/                # Service worker
│   └── service_worker.js     # API orchestration
└── providers/                 # AI provider implementations
    ├── openai.js
    ├── claude.js
    └── gemini.js
```

### How It Works

1. **Content Script** (`content.js`):
   - Runs on YouTube watch pages
   - Extracts video ID and title
   - Retrieves transcript from YouTube's native caption system
   - Sends transcript to service worker

2. **Service Worker** (`service_worker.js`):
   - Receives transcript from content script
   - Loads user settings (API key, provider)
   - Routes request to selected AI provider
   - Returns formatted summary

3. **AI Providers** (`providers/*.js`):
   - Implements common interface: `summarize(transcript, apiKey, options)`
   - Handles provider-specific API calls and error handling
   - Returns structured summary

4. **Popup UI** (`popup/*`):
   - Main view: Trigger summarization, display results
   - Settings view: Configure API keys and provider
   - Message passing between content script and service worker

## Permissions

The extension requires the following permissions:

- **activeTab**: Access current YouTube tab content
- **storage**: Store API keys and settings securely
- **scripting**: Inject content script into YouTube pages
- **host_permissions** (`https://www.youtube.com/*`): Run on YouTube

## Privacy & Security

- ✅ API keys are stored locally using `chrome.storage.sync` (encrypted by Chrome)
- ✅ No data collection or analytics
- ✅ No external servers (direct browser → AI provider communication)
- ✅ Transcripts and summaries are never stored permanently
- ✅ All API calls use HTTPS
- ✅ Compliant with Chrome Web Store policies

## Browser Compatibility

- ✅ Chrome 88+ (Manifest V3 required)
- ✅ Microsoft Edge 88+
- ✅ Brave (Chromium-based browsers)
- ❌ Firefox (uses different extension API)

## Troubleshooting

### "No transcript available for this video"

- The video may not have captions enabled
- Try videos with auto-generated or manual captions
- Some age-restricted or private videos may not work

### "Invalid API key"

- Check that you've entered the correct API key for your selected provider
- Ensure the key has proper permissions
- Verify your account has available credits/quota

### Extension not working on YouTube

- Refresh the YouTube page
- Ensure the extension is enabled in `chrome://extensions/`
- Check browser console for errors (F12 → Console tab)

### Summary is too short or incomplete

- Some providers may have different output lengths
- Very short videos (< 1 minute) may have limited content
- Try a different AI provider for comparison

## Development

### Prerequisites

- Node.js (optional, for icon generation)
- Chrome browser
- API key from at least one provider

### Icon Generation

If you need to regenerate icons:

**Option 1**: Open `create_icons.html` in a browser and download

**Option 2**: Use Python script (requires Pillow):
```bash
pip install Pillow
python3 generate_icons.py
```

**Option 3**: Convert SVG manually:
```bash
# macOS
sips -s format png -z 16 16 icons/icon.svg --out icons/icon16.png
sips -s format png -z 48 48 icons/icon.svg --out icons/icon48.png
sips -s format png -z 128 128 icons/icon.svg --out icons/icon128.png
```

### Testing

1. Load the extension as unpacked
2. Configure a test API key
3. Navigate to a YouTube video with captions
4. Test summarization with each provider
5. Verify error handling (invalid keys, no transcript, etc.)

## Cost Estimates

Approximate costs per 10-minute video (with ~2000 word transcript):

- **OpenAI (GPT-4o-mini)**: ~$0.001 - $0.002
- **Claude (Haiku)**: ~$0.001 - $0.002
- **Gemini (Flash)**: Free tier available, then ~$0.0001

_Costs vary based on transcript length and provider pricing._

## Limitations

- Only works on YouTube videos with captions
- Transcript extraction depends on YouTube's page structure
- Long videos (>1 hour) may be truncated to fit API limits
- Requires valid API key with available quota
- Rate limits apply per provider

## Contributing

This is a demonstration project. To customize:

1. Fork the repository
2. Modify provider configurations in `providers/*.js`
3. Adjust summary format in provider system prompts
4. Customize UI in `popup/*` files
5. Test thoroughly before publishing

## License

MIT License - feel free to use and modify for your projects.

## Disclaimer

This extension is not affiliated with YouTube, Google, OpenAI, Anthropic, or any AI provider. Users are responsible for their own API usage and costs.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review browser console for error messages
- Ensure API keys are valid and have quota
- Verify YouTube video has captions enabled

## Changelog

### v1.0.0 (Initial Release)
- YouTube transcript extraction
- Multi-provider support (OpenAI, Claude, Gemini)
- Settings management
- Structured summary generation
- Copy to clipboard functionality
