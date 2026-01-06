# Summora Debugging Guide

## Console Logging Overview

All console logs are prefixed with `[Summora ...]` for easy filtering. The extension has detailed logging in:

1. **Content Script** (YouTube page console)
2. **Service Worker** (background console)
3. **Popup** (popup DevTools console)

---

## 📍 Where to Find Logs

### 1. Content Script Logs (YouTube Page)

**Location**: YouTube video page console

**How to Access**:
```
1. Open YouTube video
2. Press F12 (or Cmd+Option+I on Mac)
3. Go to Console tab
4. Filter by: [Summora]
```

**What You'll See**:
```
[Summora] Summora content script loaded
[Summora] Received message: GET_TRANSCRIPT
[Summora] Starting transcript extraction...
[Summora] extractTranscript() called
[Summora] Video ID: aircAruvnKk
[Summora] Video title: But what is a neural network?
[Summora] Attempting Method 1: ytInitialPlayerResponse
[Summora Method 1] Searching for ytInitialPlayerResponse...
[Summora Method 1] Found 47 script tags on page
[Summora Method 1] Found ytInitialPlayerResponse in script
[Summora Method 1] Looking for captions in playerResponse...
[Summora Method 1] Found 2 caption track(s)
[Summora Method 1] Available languages: en, es
[Summora Method 1] Selected caption track: en
[Summora Method 1] Caption URL found, fetching...
[Summora Method 1] Fetch response status: 200
[Summora Method 1] Received caption data, length: 45678 bytes
[Summora Parser] Parsing caption XML...
[Summora Parser] Found 234 text nodes
[Summora Method 1] Successfully parsed transcript, length: 12345 chars
[Summora] ✅ Method 1 succeeded! Transcript length: 12345
[Summora] 🎉 Transcript extracted successfully!
```

### 2. Service Worker Logs (Background)

**Location**: Extension background context

**How to Access**:
```
1. Go to: chrome://extensions/
2. Find Summora
3. Click "service worker" link (under "Inspect views")
4. Console tab opens automatically
```

**What You'll See**:
```
[Summora SW] Received message: SUMMARIZE
[Summora SW] Handling summarize request - Transcript length: 12345
[Summora SW] Loading settings...
[Summora SW] Provider: openai
[Summora SW] API key found, calling openai API...
[Summora SW] Transcript length: 12345 characters
[Summora SW] Calling OpenAI summarize...
[Summora SW] Provider response: SUCCESS
[Summora SW] Summary length: 456 characters
[Summora SW] Summarize result: SUCCESS
```

### 3. Popup Logs

**Location**: Extension popup DevTools

**How to Access**:
```
1. Right-click Summora extension icon
2. Select "Inspect popup"
3. Console tab in DevTools
```

**What You'll See**:
```
[Summora Popup] Summarize button clicked
[Summora Popup] Checking API key configuration...
[Summora Popup] Provider: openai | Has API key: true
[Summora Popup] Setting loading state...
[Summora Popup] Requesting transcript from content script...
[Summora Popup] Received transcript response: SUCCESS
[Summora Popup] Transcript received - Length: 12345 | Title: Video Title
[Summora Popup] Sending to service worker for summarization...
[Summora Popup] Received summary response: SUCCESS
[Summora Popup] Summary received, displaying...
```

---

## 🔍 Debugging Specific Issues

### Issue: No Transcript Found

**Check Content Script Console**:
```
[Summora Method 1] No caption tracks found
[Summora Method 1] playerResponse.captions: undefined
```

**What it means**: Video has no captions
**Solution**: Try a different video with captions enabled

---

### Issue: API Call Failing

**Check Service Worker Console**:
```
[Summora SW] Provider response: FAILED
[Summora SW] Provider error: Invalid API key
```

**What it means**: API key is incorrect or invalid
**Solution**: Check API key in settings

---

### Issue: Transcript Extraction Stuck

**Check Content Script Console for**:
```
[Summora Method 1] Fetch response status: 403
```

**What it means**: Caption URL fetch failed
**Solution**: YouTube may be blocking the request, try refreshing page

---

### Issue: JSON Parsing Error

**Check Content Script Console**:
```
[Summora Method 1] Matched ytInitialPlayerResponse, parsing JSON...
SyntaxError: Unexpected token...
```

**What it means**: Failed to parse YouTube's player response
**Solution**: YouTube's page structure may have changed

---

## 🎯 Step-by-Step Debugging Workflow

### Step 1: Open All Console Windows

```bash
# Terminal command to help remember steps
cat << 'EOF'
1. YouTube page: F12 → Console
2. Service worker: chrome://extensions/ → Summora → "service worker"
3. Popup: Right-click icon → "Inspect popup"
EOF
```

### Step 2: Filter Logs

In each console, use the filter box:
```
Filter: [Summora]
```

### Step 3: Click Summarize

Watch logs appear in this order:

1. **Popup Console**:
   - Button clicked
   - Checking API key
   - Requesting transcript

2. **Content Script Console** (YouTube):
   - Received GET_TRANSCRIPT
   - Extracting transcript
   - Method 1/2 attempts
   - Parser logs

3. **Service Worker Console**:
   - Received SUMMARIZE
   - Calling AI provider
   - Provider response

4. **Popup Console**:
   - Received summary
   - Displaying result

---

## 📊 Log Prefixes

| Prefix | Location | Purpose |
|--------|----------|---------|
| `[Summora]` | Content Script | General content script logs |
| `[Summora Method 1]` | Content Script | ytInitialPlayerResponse extraction |
| `[Summora Method 2]` | Content Script | UI-based extraction |
| `[Summora Parser]` | Content Script | XML caption parsing |
| `[Summora SW]` | Service Worker | Background processing |
| `[Summora Popup]` | Popup | UI interactions |

---

## 🐛 Common Error Patterns

### Pattern 1: Missing Content Script
```
[Summora Popup] Content script error: Could not establish connection
```
**Fix**: Refresh the YouTube page

### Pattern 2: No Player Response
```
[Summora Method 1] No playerResponse found
[Summora Method 1] ❌ Method 1 failed, trying Method 2
```
**Fix**: Normal - will try Method 2

### Pattern 3: Network Error
```
[Summora SW] Provider error: Network error. Please check your internet connection.
```
**Fix**: Check internet connection and firewall

### Pattern 4: Rate Limit
```
[Summora SW] Provider error: Rate limit exceeded. Please try again later.
```
**Fix**: Wait a few minutes before trying again

---

## 💡 Tips

1. **Clear Logs Between Tests**:
   - Click the 🚫 icon in Console to clear logs
   - Easier to see new log entries

2. **Copy Full Log Output**:
   ```
   Right-click in console → "Save as..."
   ```

3. **Search Logs**:
   - Use Cmd+F (Mac) or Ctrl+F (Windows)
   - Search for: `ERROR`, `FAILED`, `❌`

4. **Check Timestamps**:
   - Enable timestamps: Console Settings → Show timestamps
   - Helps identify slow operations

5. **Export Logs for Support**:
   ```
   Right-click console → "Save as" → Send to developer
   ```

---

## 🎬 Quick Test Command

After reloading extension:

```bash
# Open test video
open "https://www.youtube.com/watch?v=aircAruvnKk"

# Then:
# 1. F12 → Console → Filter: [Summora]
# 2. Click extension → Summarize
# 3. Watch logs flow through all consoles
```

---

## ✅ Successful Run Example

A successful run will show this sequence:

```
[YouTube Console]
[Summora] Summora content script loaded
[Summora] Received message: GET_TRANSCRIPT
[Summora] Video ID: aircAruvnKk
[Summora Method 1] Found ytInitialPlayerResponse
[Summora Method 1] Found 2 caption track(s)
[Summora Method 1] Fetch response status: 200
[Summora Parser] Found 234 text nodes
[Summora] ✅ Method 1 succeeded!
[Summora] 🎉 Transcript extracted successfully!

[Service Worker Console]
[Summora SW] Received message: SUMMARIZE
[Summora SW] Provider: openai
[Summora SW] Calling OpenAI summarize...
[Summora SW] Provider response: SUCCESS
[Summora SW] Summarize result: SUCCESS

[Popup Console]
[Summora Popup] Summarize button clicked
[Summora Popup] Received transcript response: SUCCESS
[Summora Popup] Received summary response: SUCCESS
[Summora Popup] Summary received, displaying...
```

All green checkmarks ✅ mean success!
