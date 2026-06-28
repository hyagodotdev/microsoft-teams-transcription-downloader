# Microsoft Teams Transcription Downloader

Browser extension for **Google Chrome** and Chromium-based browsers. It collects the transcript from a **post-meeting recording** in Microsoft Teams and lets you:

- Download as **TXT**
- Download as **Markdown** (optimized for AI tools)
- Optionally **send the transcript to an API** (webhook)

Useful when you can view the transcript in Teams but do not have permission to use the built-in download option.

## How it works

The extension does not call a Microsoft API. It reads the transcript from the page DOM while automatically scrolling through the virtualized transcript panel, deduplicates entries, sorts them chronologically, and exports the result.

## Requirements

- Google Chrome or a Chromium-based browser (Edge, Brave, etc.)
- Access to a **Teams meeting recording** with the **transcript panel open and visible**
- Microsoft Teams web app (`teams.microsoft.com`)

## Installation (developer mode)

1. Clone or download this repository.
2. Open `chrome://extensions` in your browser.
3. Enable **Developer mode** (top-right corner).
4. Click **Load unpacked**.
5. Select the project folder (`microsoft-teams-transcription-downloader`).

The extension icon will appear in the browser toolbar.

## How to use

### 1. Open the correct page

1. Go to the **post-meeting recording** in Microsoft Teams.
2. Open the **transcript** panel so speech entries are visible on screen.

### 2. Open the extension popup

Click the extension icon in the toolbar.

- If you are on the wrong page, a warning is shown asking you to open the recording page with the transcript visible.
- On the correct page, the popup shows the **meeting title** and the available actions.

### 3. Download locally

| Button | Description |
|--------|-------------|
| **Download TXT** | Plain text file with meeting metadata and timestamped lines |
| **Download Markdown (AI)** | Markdown file structured for summarization and AI workflows |

Files are saved as:

```text
{meeting-title}_{YYYY-MM-DD}.txt
{meeting-title}_{YYYY-MM-DD}.md
```

### 4. Send to API (optional)

API delivery is **not required**. Downloads work without any configuration.

1. Click **Configure API**.
2. Fill in:
   - **URL** — endpoint that will receive the transcript
   - **HTTP method** — `POST`, `PUT`, or `PATCH`
   - **Headers** — JSON object (e.g. authentication and `Content-Type`)
3. Click **Save**.
4. The **Send for API** button is enabled only after a URL is saved.
5. Click **Send for API** to collect the transcript and send it to your endpoint (Markdown format).

Settings are stored locally in the browser (`chrome.storage.local`).

#### Example headers

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer your-token-here"
}
```

#### API payload

When you use **Send for API**, the extension sends a request with a JSON body like:

```json
{
  "format": "md",
  "filename": "Weekly Sync_2026-06-15.md",
  "metadata": {
    "title": "Weekly Sync",
    "date": "2026-06-15T14:30:00.000Z",
    "duration": "45 min"
  },
  "entryCount": 128,
  "content": "# Weekly Sync\n\n..."
}
```

## Output formats

### TXT

```text
Meeting: Weekly Sync
Date: 2026-06-15T14:30:00.000Z
Duration: 45 min

---

[00:12] - [Maria] : Good morning everyone.
[00:28] - [John] : We have a blocker on the integration item.
```

### Markdown (AI)

```markdown
# Weekly Sync

## Meeting details

- **Date:** June 15, 2026
- **Duration:** 45 min

## Transcript

### Maria *(00:12)*

Good morning everyone.

### John *(00:28)*

We have a blocker on the integration item.
```

Consecutive lines from the same speaker are grouped into a single block to reduce noise and token usage in AI tools.

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Warning about wrong page | Open the recording and make sure the transcript panel is visible before opening the popup |
| No speech entries found | Scroll the transcript manually once, then try again |
| Missing lines | Long meetings take longer; wait until the status message confirms completion |
| Send for API disabled | Open **Configure API** and save a valid URL |
| Webhook request failed | Check URL, method, headers, CORS, and server logs |
| API settings not saved | Headers must be valid JSON with string values only |

## Permissions

| Permission | Why it is needed |
|------------|------------------|
| `activeTab` | Access the current Teams tab when you open the popup or click an action |
| `scripting` | Inject the transcript collection script into the page |
| `storage` | Persist API settings locally |
| `<all_urls>` | Send requests to user-configured API endpoints |

The extension only runs on the tab you interact with. It does not run in the background on other sites.

## Project structure

```text
microsoft-teams-transcription-downloader/
├── manifest.json    # Extension manifest (Manifest V3)
├── popup.html       # Popup UI
├── popup.css        # Popup styles
├── popup.js         # Transcript collection, download, and popup logic
├── settings.js      # API settings and webhook delivery
└── README.md
```

## Development

There is no build step. After changing the code:

1. Go to `chrome://extensions`
2. Click **Reload** on the extension card
3. Test again on a Teams recording page

## Disclaimer

This extension is an independent tool and is not affiliated with Microsoft. Use it in accordance with your organization’s policies and Teams terms of use. You are responsible for how exported transcripts and API integrations are handled.
