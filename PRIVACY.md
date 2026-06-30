# Privacy Policy

**Microsoft Teams Transcription Downloader**  
Last updated: June 30, 2026

This privacy policy describes how the browser extension **Microsoft Teams Transcription Downloader** ("the extension") handles information. The extension is an independent tool and is not affiliated with Microsoft.

## Summary

- We do **not** collect, store, or receive your data on any server operated by the extension developer.
- We do **not** sell, rent, or share your data with third parties for marketing or analytics.
- All core functionality runs **locally in your browser**.
- Optional API delivery sends data **only** to an endpoint **you** configure, when **you** choose to send it.

## What the extension does

When you use the extension on a Microsoft Teams meeting recording page with the transcript panel visible, it may:

1. Read meeting metadata (such as title, date, and duration) from the page.
2. Read transcript text displayed on the page.
3. Generate a local file download (TXT or Markdown).
4. Optionally send the transcript to an API or webhook URL that you configure.

The extension does not call a Microsoft API. It reads content from the page only after you open the extension or click an action button.

## Data we do not collect

The extension developer does **not**:

- Operate backend servers that receive your transcripts or browsing data
- Use analytics, advertising, or tracking services
- Collect account credentials for Microsoft Teams
- Access tabs in the background without your interaction

## Data stored on your device

The extension uses `chrome.storage.local` (or the equivalent storage API in Chromium-based browsers) to save settings on your device only:

- Optional API settings (URL, HTTP method, headers)
- Transcript categories you create
- Your selected category

This information stays in your browser unless you use **Send for API**, in which case transcript data is sent to the URL you configured.

You can remove stored settings by clearing the extension's data in your browser or uninstalling the extension.

## Optional API delivery

If you configure an API endpoint and click **Send for API**, the extension sends a JSON payload containing the transcript and related metadata to that endpoint. You are responsible for:

- Choosing the destination URL
- Any authentication headers you add
- How that service stores, processes, or protects the data

The extension developer has no control over third-party services you choose to use.

## Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access the current tab when you interact with the extension |
| `scripting` | Read the transcript and meeting metadata from the Teams page |
| `storage` | Save your local settings and categories |
| Host access (`<all_urls>`) | Send requests only to the API URL you configure (optional feature) |

## Children's privacy

The extension is not directed at children under 13, and we do not knowingly collect personal information from children.

## Changes to this policy

We may update this privacy policy from time to time. The "Last updated" date at the top will reflect the most recent revision. Continued use of the extension after changes means you accept the updated policy.

## Contact

If you have questions about this privacy policy, open an issue in the extension's source repository or contact the publisher through the Chrome Web Store listing.
