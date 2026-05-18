# Privacy Policy — 1Cookie

**Effective date:** 2026-05-18

---

## Overview

1Cookie is a Chrome extension that reads and exports cookies from browser tabs. This policy explains what data is handled and how.

---

## Data Collected

1Cookie accesses cookies from the current browser tab automatically when the popup is opened, and again when the user clicks the Query button.

The following cookie fields are read:

- `name`, `value`, `domain`, `path`
- `secure`, `httpOnly`, `session`, `sameSite`
- `expirationDate`

---

## Where Data Is Stored

**No data is stored.** All cookie data is held in memory only for the duration the popup is open.

- No data is written to `chrome.storage.local` or any other storage.
- No data is transmitted to any external server.
- No data is shared with third parties.
- No analytics or tracking of any kind is performed.

When the popup is closed, all data is discarded.

---

## User Control

- The user decides which cookies to copy or export by checking or unchecking items.
- Exported files are saved to the user's local device via the browser's standard download mechanism.
- Uninstalling the extension removes it completely with no residual data.

---

## Permissions Used

| Permission | Reason |
|------------|--------|
| `cookies` | Read cookies from the current tab |
| `tabs` | Get the URL and ID of the active tab |
| `scripting` | Collect origins from all frames including nested iframes |
| `host_permissions: <all_urls>` | Access cookies across any domain the user visits |

---

## Contact

For questions or concerns, please open an issue at:  
https://github.com/wonkyungup/1cookie/issues
