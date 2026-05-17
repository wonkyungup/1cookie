# Privacy Policy — 1Cookie

**Effective date:** 2026-05-17

---

## Overview

1Cookie is a Chrome extension that saves and restores cookies from browser tabs. This policy explains what data is handled and how.

---

## Data Collected

1Cookie accesses cookies from the current browser tab **only when the user explicitly clicks the Query or Save button.**

The following cookie fields are stored:

- `name`, `value`, `domain`, `path`
- `secure`, `httpOnly`, `hostOnly`, `session`, `sameSite`
- `storeId`, `expirationDate`
- `savedAt` (timestamp of when the user saved the cookie)

---

## Where Data Is Stored

All data is stored exclusively in **`chrome.storage.local`** on the user's own device.

- No data is transmitted to any external server.
- No data is shared with third parties.
- No analytics or tracking of any kind is performed.

---

## User Control

- The user decides which cookies to save by checking or unchecking items.
- Saved cookies can be removed at any time by unchecking and saving again.
- Uninstalling the extension removes all stored data.

---

## Permissions Used

| Permission | Reason |
|------------|--------|
| `cookies` | Read and write cookies on the current tab |
| `storage` | Store cookie snapshots locally on the device |
| `tabs` | Get the URL and ID of the active tab |
| `scripting` | Collect origins from all frames including nested iframes |
| `host_permissions: <all_urls>` | Access cookies across any domain the user visits |

---

## Contact

For questions or concerns, please open an issue at:  
https://github.com/wonkyungup/1cookie/issues
