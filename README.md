<div align="center">
  <img width="80" alt="1Cookie" src="./docs/icon.png">
  <h1>1Cookie</h1>
  <p>A Chrome extension to save, restore, and copy cookies from the current tab.</p>
</div>

---

### Features

- **Query** — Collects cookies from all frames (including nested iframes) in the current tab, grouped by origin
- **Save** — Saves checked cookies per origin to `chrome.storage.local`
- **Restore** — Injects saved cookies back into the current tab and reloads the page
- **Copy** — Copies saved or checked cookies to the clipboard, grouped by origin
- **Saved badge** — Shows a "Saved" badge on origins and a timestamp chip on individual cookies that have been saved
- **i18n** — Supports 8 languages: Korean, English, Simplified Chinese, Traditional Chinese, Japanese, Russian, Indonesian, German

---

### How to Use

1. Navigate to the site you want to save cookies for
2. Open the extension popup → click **Query**
3. Check the cookies you want to save → click **Save**
4. On your next visit, open the popup → click **Restore**
5. Saved cookies are injected and the page reloads automatically

> **Tip:** You can use Restore without querying first — it will inject all saved cookies for the current origin.

---

### Permissions

| Permission | Purpose |
|------------|---------|
| `cookies` | Read and write cookies |
| `storage` | Store cookie snapshots locally |
| `tabs` | Get the current tab's URL and ID |
| `scripting` | Collect origins from all frames including iframes |
| `host_permissions` | Access cookies across all domains |

---

### Storage Structure

Cookies are stored in `chrome.storage.local` with the following shape:

```ts
{
  [tabOrigin: string]: {
    [cookieOrigin: string]: {
      cookies: SavedCookie[];
      savedAt: string; // ISO 8601
    }
  }
}
```

---

### Known Behaviors

- Opaque origins (`"null"`) from sandboxed iframes are filtered out and skipped
- `hostOnly` cookies (no dot prefix on domain) are injected without the `domain` field to preserve their host-only status
- Auto-injection on tab navigation was intentionally removed — restore is manual only

---

### Build

```bash
# Production build
npm run build

# Development (watch mode)
npm start
```

Load the `dist/` folder as an unpacked extension in `chrome://extensions`.

---

### Security Note

Cookies may contain sensitive data such as session tokens. All data is stored in `chrome.storage.local` and never leaves the browser. HttpOnly cookies are accessible only via the `chrome.cookies` API and cannot be read by JavaScript.

---

<a href="https://github.com/wonkyungup/1cookie">GitHub</a>
