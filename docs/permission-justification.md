# Permission Justification — 1Cookie

## `host_permissions: <all_urls>`

### Why this permission is needed

1Cookie reads and exports cookies from any website the user chooses to use it on. The target domain is not known in advance — it depends entirely on which tab the user has open.

The following APIs require host permissions for the target domain:

- **`chrome.cookies.getAll({ url })`** — reads cookies for a given origin
- **`chrome.scripting.executeScript({ target: { tabId, allFrames: true } })`** — collects frame origins from pages that may include third-party iframes

Because the user can open the extension on any website, `<all_urls>` is required. Restricting to specific domains would make the extension non-functional for most use cases.

### How the permission is used responsibly

- Cookies are **read automatically when the popup opens**, and again only when the user explicitly clicks the Query button.
- No cookies are written or modified.
- All data is held in memory only for the duration the popup is open — nothing is stored locally or transmitted externally.
- The extension does not run in the background or inject scripts without user interaction.

### Alternatives considered

Requesting permissions dynamically per domain (`chrome.permissions.request`) was considered, but would require the user to approve a permission dialog on every new domain, significantly degrading usability for a tool designed for quick cookie inspection across environments.
