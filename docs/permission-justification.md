# Permission Justification — 1Cookie

## `host_permissions: <all_urls>`

### Why this permission is needed

1Cookie saves and restores cookies from any website the user chooses to use it on. The target domain is not known in advance — it depends entirely on which tab the user has open.

The following APIs require host permissions for the target domain:

- **`chrome.cookies.getAll({ url })`** — reads cookies for a given origin
- **`chrome.cookies.set({ url, ... })`** — writes (restores) cookies to a given origin
- **`chrome.scripting.executeScript({ target: { tabId, allFrames: true } })`** — collects frame origins from pages that may include third-party iframes

Because the user can open the extension on any website, `<all_urls>` is required. Restricting to specific domains would make the extension non-functional for most use cases.

### How the permission is used responsibly

- Cookies are **only accessed when the user explicitly clicks Query or Save.**
- All stored data stays in `chrome.storage.local` on the user's device.
- No data is ever sent to an external server.
- The extension does not run automatically in the background or inject scripts without user action.

### Alternatives considered

Requesting permissions dynamically per domain (`chrome.permissions.request`) was considered, but would require the user to approve a permission dialog on every new domain, significantly degrading usability for a tool designed for quick cookie management across environments.
