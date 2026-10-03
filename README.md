# Duly Noted

**capture creativity**

Galaxy Brain can receive a full-page web clip: click **Clip page** to save cleaned HTML with the page's headings, lists, tables, links, and image references instead of only a viewport screenshot. The clipper removes scripts, forms, and embedded executables before upload.

A Chrome extension that lets you quickly capture voice notes, screenshots, page elements, and console logs — then send them to GitHub Issues, GitHub Projects, Notion, or save locally as drafts. Never lose a great idea again.

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/DavinciDreams/duly-noted/releases/tag/v1.2.0)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Features & Screenshots

<table>
<tr>
<td width="50%">

### Voice Recording & Transcription
- **Real-time transcription** using Web Speech API
- **Always-editable note box** - type a note, record voice, or both
- **Circular radial audio visualizer** - reactive to your voice in real-time
- **High accuracy** speech-to-text conversion
- **AI smart titles** - auto-generates issue titles from your content

</td>
<td width="50%">

![Recording Interface](assets/Screenshot%202026-02-14%20062435.png)

</td>
</tr>
<tr>
<td width="50%">

### Quick Capture Tools
- **Screenshot** - capture the visible tab with one click
- **Element Selector** - hover and click to capture any DOM element (CSS selector, XPath, computed styles)
- **Console Logs** - intercept and capture console output, errors, and unhandled rejections
- **Mix and match** - combine voice, typed notes, screenshots, elements, and logs in a single note
- **No recording required** - capture a screenshot or element and send it without ever pressing record

</td>
<td width="50%">

### Destination Chooser
- **Choose your destination** - GitHub, Notion, or Draft
- **Preview your note** before sending
- **Quick actions** for each destination
- **Smart routing** to the right tool

</td>
</tr>
</table>

![Destination Chooser](assets/Screenshot%202026-02-14%20063151.png)

### GitHub Integration
- **Create GitHub Issues** directly from voice notes, typed notes, or captures
- **Screenshots uploaded** to `.github/screenshots/` in your repo and embedded as images
- **Element data** included as a markdown table (tag, classes, dimensions, selector)
- **Console logs** included as formatted code blocks
- **Add to GitHub Projects** with custom fields
- **OAuth authentication** - secure, no tokens to manage
- **Repository selection** - choose from all your repos
- **Clickable history** - links open issues/projects in new tabs

![GitHub Integration](assets/Screenshot%202026-02-14%20063434.png)

### Notion Integration
- **Send to Notion databases** or create child pages
- **Screenshots uploaded** via Notion File Upload API and embedded as image blocks
- **Element & console data** included as code blocks
- **OAuth authentication** - secure workspace connection
- **Auto-formatting** - first line becomes title
- **Smart detection** - finds all accessible databases and pages
- **Clickable history** - links open Notion pages in new tabs

![Notion Integration](assets/Screenshot%202026-02-14%20063601.png)

### History & Organization
- **Dedicated history screen** with filtering and search
- **Click to open** - direct links to GitHub/Notion
- **Persistent storage** - never lose your notes
- **Metadata tracking** - timestamps, destinations, and more

![History View](assets/Screenshot%202026-02-14%20063750.png)

## Quick Start

### Install from zip (friends & beta testers)

No build step, no API keys, no accounts to create. Just:

1. Download the latest `duly-noted-v*-friends.zip` from [Releases](https://github.com/DavinciDreams/duly-noted/releases)
2. Unzip to a permanent folder (e.g. `C:\duly-noted` or `~/duly-noted`)
   - Don't delete this folder — Chrome reads from it directly
3. Open your browser and go to the extensions page:
   - **Chrome:** `chrome://extensions/`
   - **Edge:** `edge://extensions/`
   - **Brave:** `brave://extensions/`
4. Enable **Developer mode** (toggle in top-right corner)
5. Click **Load unpacked** and select the unzipped folder
6. Pin the extension to your toolbar for easy access
7. Click the Duly Noted icon to open the side panel
8. Go to **Settings** (gear icon) to connect your GitHub and/or Notion accounts

> **Why does this work?** The friends zip includes a public key in the manifest that gives every install the same extension ID. OAuth redirects go through our shared Cloudflare Worker — you authenticate with *your own* GitHub/Notion accounts, and tokens are stored locally on your machine. No secrets are shared.

### Browser compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| **Chrome** | Fully supported | Recommended |
| **Edge** | Fully supported | Same engine as Chrome |
| **Brave** | Works with config | Disable Brave Shields on the side panel for Web Speech API |
| **Firefox** | Not supported | No Web Speech API or side panel API |
| **Safari** | Not supported | Limited extension API support |

### First use

1. Click the Duly Noted icon in your toolbar (or press `Alt+Shift+V`)
2. Grant microphone permission when prompted
3. You'll see the home screen with the audio visualizer, a note box, and Quick Capture tools
4. **To record voice:** Click **Start Recording**, speak, then click **Stop**. Your transcription appears in the note box — edit it if needed.
5. **To type a note:** Just start typing in the note box. No recording required.
6. **To capture a screenshot:** Click the camera icon under Quick Capture.
7. **To select an element:** Click the crosshair icon, hover over an element on the page, and click to capture it.
8. **To capture console logs:** Click the terminal icon to start monitoring, then fetch logs when ready.
9. When you have any content (text, screenshots, elements, or logs), click **Choose Destination** to send.

### Connecting GitHub

1. Click the **Settings** gear icon (or the clock icon for history)
2. Scroll to "GitHub Integration"
3. Click **Sign in with GitHub**
4. Authorize the app — you'll be redirected back automatically
5. You can now send notes to GitHub Issues and Projects

### Connecting Notion

1. Click the **Settings** gear icon
2. Scroll to "Notion Integration"
3. Click **Sign in with Notion**
4. Select your workspace and authorize
5. **Important:** In Notion, open a page > **...** menu > **Add connections** > select **Duly Noted** to grant access

## Development

### Install from source

```
git clone https://github.com/DavinciDreams/duly-noted.git
cd duly-noted
npm install
```

Then load unpacked in Chrome (same steps as above, pointing at the repo folder).

There is **no build step** — the extension runs plain JS modules directly. Just edit and reload.

### Architecture

```
src/
├── sidepanel/          # Main UI (HTML, CSS, JS)
├── service-worker/     # Background service worker
├── offscreen/          # Offscreen document (audio recording, clipboard)
├── content-scripts/    # Page context (element inspector, console interceptor)
├── lib/                # Shared libraries (storage, transcription, GitHub, Notion, OAuth)
├── utils/              # Utility functions
├── permission/         # Microphone permission popup
├── oauth/              # OAuth callback page
└── fonts/              # Local fonts
```

### Packaging

**For Chrome Web Store:**
```
npm run package
```

**For friends/beta testers:**
```
npm run package -- --friends
```
The `--friends` flag injects a public key into the manifest so every unpacked install gets the same extension ID, making the shared OAuth apps work without per-user setup.

### Debugging

- **Service Worker Console:** Go to `chrome://extensions/` > click "service worker" link under Duly Noted
- **Side Panel Console:** Right-click inside the side panel > "Inspect"
- **Content Script Console:** Open DevTools on any page > Console tab (content scripts log here)

## Privacy & Security

- **Local Storage:** All voice notes are stored locally in Chrome's storage
- **No Cloud Recording:** Audio is processed in-browser only (Web Speech API)
- **Screenshots in memory only:** Captured screenshots are held in JS memory, not persisted to storage
- **OAuth Tokens:** Stored securely in `chrome.storage.local`, never shared
- **No Analytics:** We don't track your usage
- **Token Exchange:** OAuth token exchange handled via a secure Cloudflare Worker — client secrets never touch the browser
- **Permissions:** `tabs` and `activeTab` for screenshot capture; `scripting` for element/console inspection; `clipboardWrite` for copy-to-clipboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- GitHub API via [GitHub REST API](https://docs.github.com/en/rest)
- Notion API via [Notion API](https://developers.notion.com/)
- OAuth token exchange via [Cloudflare Workers](https://workers.cloudflare.com/)
- AI titles via [Chrome Prompt API](https://developer.chrome.com/docs/extensions/ai/prompt-api) (Gemini Nano)

---

**Version:** 1.2.0 | **Updated:** 2026-02-17

Made with Claude Code
