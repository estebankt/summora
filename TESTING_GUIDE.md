# Summora - Local Testing Guide

## Prerequisites

Before testing, you'll need:
- ✅ Google Chrome (version 88+)
- ✅ API key from at least one provider:
  - [OpenAI API Key](https://platform.openai.com/api-keys)
  - [Claude API Key](https://console.anthropic.com/)
  - [Gemini API Key](https://makersuite.google.com/app/apikey)

## Step 1: Load Extension in Chrome

### Open Chrome Extensions Page

**Option A**: Type in address bar
```
chrome://extensions/
```

**Option B**: Menu navigation
1. Click the three dots (⋮) in top-right corner
2. More tools → Extensions

### Enable Developer Mode

Toggle the "Developer mode" switch in the **top-right corner** of the extensions page.

### Load Unpacked Extension

1. Click **"Load unpacked"** button (top-left area)
2. Navigate to and select:
   ```
   /Users/marioguillen/Projects/Code/summora
   ```
3. Click **"Select"**

### Verify Installation

You should see:
- ✅ Summora extension card appears
- ✅ Purple gradient icon visible
- ✅ Version 1.0.0
- ✅ "Errors" button not present (no errors)

### Pin Extension (Optional but Recommended)

1. Click the puzzle piece icon (🧩) in Chrome toolbar
2. Find "Summora"
3. Click the pin icon (📌) to keep it visible

## Step 2: Configure API Key

### Open Extension Popup

Click the Summora icon in your Chrome toolbar.

You'll see a message: "⚠️ Please open a YouTube video to use Summora"

### Access Settings

1. Click the **gear icon** (⚙️) in the top-right of the popup
2. You'll see the Settings view

### Add Your API Key

**For OpenAI** (default):
1. Provider dropdown should show "OpenAI (GPT-4)"
2. Paste your OpenAI API key (starts with `sk-`)
   - Get one at: https://platform.openai.com/api-keys
3. Click **"Save Settings"**

**For Claude**:
1. Select "Anthropic (Claude)" from dropdown
2. Paste your Claude API key (starts with `sk-ant-`)
   - Get one at: https://console.anthropic.com/
3. Click **"Save Settings"**

**For Gemini**:
1. Select "Google (Gemini)" from dropdown
2. Paste your Gemini API key (starts with `AIza`)
   - Get one at: https://makersuite.google.com/app/apikey
3. Click **"Save Settings"**

### Verify Settings Saved

You should see: ✅ "Settings saved successfully!"

## Step 3: Test on YouTube

### Open a Test Video

Navigate to a YouTube video with captions. Here are good test videos:

**Short Videos** (~5 min):
```
https://www.youtube.com/watch?v=aircAruvnKk
(3Blue1Brown - Neural Networks)
```

**Medium Videos** (~10-15 min):
```
https://www.youtube.com/watch?v=kCc8FmEb1nY
(Tech conference talk)
```

**Verify Video Has Captions**:
1. Click the "CC" button in the YouTube player
2. If captions appear, the video is compatible

### Run Summarization

1. Click the **Summora extension icon** in toolbar
2. The popup should show "Summarize Video" button
3. Click **"Summarize Video"**
4. Wait 5-15 seconds (you'll see a loading spinner)

### View Results

**Success**:
- ✅ Green success message appears
- ✅ Summary container displays with:
  - Video title
  - 5-8 bullet points
  - Conclusion
- ✅ Copy icon visible

**Test Copy Function**:
1. Click the **copy icon** (📋) in summary header
2. Paste in a text editor to verify

## Step 4: Test Edge Cases

### Test Different Providers

1. Open Settings
2. Switch to different provider (Claude or Gemini)
3. Save settings
4. Summarize the same video
5. Compare output quality

### Test Error Scenarios

**No Captions Available**:
1. Find a video without captions (try user uploads)
2. Try to summarize
3. Expected: ❌ "No transcript available for this video"

**Invalid API Key**:
1. Go to Settings
2. Enter invalid key (e.g., "test123")
3. Save and try to summarize
4. Expected: ❌ "Invalid API key" error

**Non-YouTube Page**:
1. Go to any non-YouTube website
2. Click extension icon
3. Expected: ⚠️ "Please open a YouTube video to use Summora"

**Very Long Video**:
1. Try a 1+ hour video
2. Transcript will be truncated to ~12,000 characters
3. Summary should still generate successfully

## Step 5: Debugging

### View Console Logs

**Extension Background Console**:
1. Go to `chrome://extensions/`
2. Find Summora
3. Click **"service worker"** link (under "Inspect views")
4. Console shows service worker logs

**Content Script Console**:
1. Open YouTube video page
2. Press **F12** (or Cmd+Option+I on Mac)
3. Go to **Console** tab
4. Look for "Summora content script loaded"

**Popup Console**:
1. Right-click the Summora extension icon
2. Click **"Inspect popup"**
3. Console shows popup script logs

### Common Issues

**"No transcript available"**:
- Video doesn't have captions enabled
- Try a different video
- Check if captions work in YouTube player

**Extension not appearing**:
- Refresh Chrome extensions page
- Check for errors in extension card
- Reload the extension (circular arrow icon)

**Popup shows blank/broken**:
- Check popup console for errors
- Verify all files exist in folders
- Reload extension

**API errors**:
- Check API key is correct
- Verify account has available credits
- Check network tab for API response

### Reload Extension After Changes

If you modify any code:

1. Go to `chrome://extensions/`
2. Find Summora card
3. Click the **circular arrow icon** (🔄)
4. Test again

## Step 6: Testing Checklist

Use this checklist to verify everything works:

**Installation**:
- [ ] Extension loads without errors
- [ ] Icon appears in toolbar
- [ ] Popup opens when clicked

**Settings**:
- [ ] Can switch between providers
- [ ] Can save API keys
- [ ] Settings persist after closing popup

**Core Functionality**:
- [ ] Detects YouTube video pages
- [ ] Shows warning on non-YouTube pages
- [ ] Extracts transcript successfully
- [ ] Generates summary (5-15 seconds)
- [ ] Displays formatted summary
- [ ] Copy to clipboard works

**Error Handling**:
- [ ] Handles videos without captions
- [ ] Handles invalid API keys
- [ ] Shows loading states
- [ ] Displays error messages clearly

**UI/UX**:
- [ ] Settings view switches smoothly
- [ ] Back button returns to main view
- [ ] Loading spinner appears during processing
- [ ] Status messages are readable
- [ ] Summary is scrollable if long

**Multi-Provider**:
- [ ] OpenAI works correctly
- [ ] Claude works correctly
- [ ] Gemini works correctly
- [ ] Can switch providers mid-session

## Tips for Best Results

1. **Start with short videos** (< 10 min) for faster testing
2. **Use educational/tutorial videos** - they summarize better than vlogs
3. **Check captions exist** before testing
4. **Keep DevTools open** to catch any errors
5. **Test each provider** to see quality differences

## Quick Test Command

Check extension files are all present:

```bash
cd /Users/marioguillen/Projects/Code/summora
ls -R
```

Expected output should include:
- manifest.json
- background/service_worker.js
- content/content.js
- popup/popup.html, popup.js, popup.css
- providers/openai.js, claude.js, gemini.js
- icons/icon16.png, icon48.png, icon128.png

## Need Help?

**Extension not loading?**
- Check Chrome version (must be 88+)
- Ensure all files are in correct folders
- Look for syntax errors in browser console

**API not working?**
- Verify API key is valid
- Check account has credits
- Test API key directly with curl:

```bash
# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"

# Test Claude
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-haiku-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'

# Test Gemini
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

**Still stuck?**
- Check README.md troubleshooting section
- Review browser console for specific errors
- Ensure YouTube page is fully loaded before testing
