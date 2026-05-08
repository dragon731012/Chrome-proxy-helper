# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chrome Proxy Helper — a Manifest V3 Chrome extension that drives `chrome.proxy.settings` so the user can switch Chrome's proxy independently of the OS. Supports SOCKS4/5, HTTP(S), PAC URL, PAC data, WPAD auto-detect, system, and direct modes, plus a bypass list and proxy authentication.

There is **no build, bundler, test runner, or linter**. Everything is plain HTML/CSS/vanilla JS + jQuery 3.6 loaded straight from disk. The "build" is the repo itself.

## Common workflows

- **Load locally**: `chrome://extensions` → enable Developer mode → "Load unpacked" → select the repo root.
- **Reload after edits**: hit the reload icon on the extension card (or `Ctrl+R` while focused on it). Service-worker logs appear under "Inspect views: service worker"; popup/options have their own DevTools.
- **Release**: bump `manifest.json` `"version"` and add a `CHANGELOG` entry. The store update is published via `update_url` already in the manifest.
- **Diagnose proxy state**: the options page has a "Diagnosis" button that opens `chrome://net-internals/#proxy`.

## Architecture

The extension keeps a single source of truth — a `proxySetting` object — in `chrome.storage.local`, and reads/writes it from three runtime contexts: the MV3 service worker, the popup, and the options page.

### State model

Two keys live in `chrome.storage.local`:

- `proxySetting` (JSON string) — full user configuration: hosts/ports for each scheme, PAC URL/data, bypass list, `proxy_rule` (`singleProxy` / `proxyForHttp` / …), `auth`, `internal` (`"china"` toggles the bundled `data/cn.bypasslist`), etc. The default shape is defined at the top of `background.js`.
- `proxyInfo` (string) — which mode is *currently active* (`http`, `https`, `socks4`, `socks5`, `pac_url`, `pac_data`, `direct`, `system`, `auto_detect`). `reloadProxy()` in `options.js` dispatches on this when reapplying settings after a save.

MV3 service workers don't have a real `window.localStorage`, so `background.js` declares `var localStorage = {}` as an in-memory mirror and rehydrates it via `getLocalStorage()` on demand. The options/popup pages run in a normal page context where `localStorage` *is* the DOM API — they only use `chrome.storage.local` for the initial hydration in `options.js`'s bootstrap block. Be careful: the variable name `localStorage` means different things in different files.

### Entry points

- `background.js` (service worker) — sets the toolbar icon based on the live `chrome.proxy.settings`, listens for `chrome.webRequest.onAuthRequired` and supplies stored credentials, handles the `authUpdate` message from the options page, registers the `Alt+O` command, and on first install of an updated build spawns an offscreen document to run the MV2→MV3 migration.
- `popup.html` + `javascripts/popup.js` — quick switcher. Each `<li>` click handler builds a `chrome.proxy.settings` config from `proxySetting` and calls `set()`, then updates `proxyInfo` and the icon. Items with no host configured are hidden on load.
- `options.html` + `javascripts/options.js` + `javascripts/options-ui.js` — full settings UI. `options-ui.js` is purely the tab/menu animation; `options.js` owns load/save/apply. Any `input`, `textarea`, or relevant `<select>` change auto-fires `save()`, which serializes `proxySetting`, calls `reloadProxy()`, and (if auth changed) sends `authUpdate` to the service worker. `loadOldInfo()` only runs on first launch (`!localStorage.firstime`) to import whatever Chrome already has configured.
- `migration.html` + `javascripts/migration.js` — runs **only** inside the offscreen document spawned by `background.js` on update. It reads MV2-era `window.localStorage`, forwards auth to the SW via `authUpdate`, then sends `migrationDone` so the SW can close the offscreen document.

### Cross-context messages

Two `chrome.runtime` actions are in use; grep both contexts when changing either:

- `authUpdate` — options/migration → service worker. Persists new credentials and refreshes the in-memory mirror so `onAuthRequired` returns the right values.
- `migrationDone` — migration offscreen doc → service worker. Triggers `chrome.offscreen.closeDocument()`.

### i18n

`_locales/{en,ja,ru,zh_CN}/messages.json` are the message catalogs. HTML uses `data-i18n-content="<key>"` and a `$('[data-i18n-content]').each(...)` loop in `popup.js` / `options-ui.js` swaps in `chrome.i18n.getMessage(key)` at DOMContentLoaded. When adding a UI string, add the key to **all four** locale files (English is the `default_locale`, so a missing key falls back to English).

### Bundled data

`data/cn.bypasslist` and `data/cn.zone` are the "China internal" bypass list. The `getBypass()` fetch from GitHub in `background.js` is currently commented out; the in-memory default is just `['*.cn']` until the user toggles the option, after which the file is read by the options page.

## Gotchas

- `manifest.json` is MV3 with `minimum_chrome_version: 88`. There's no content script and no `web_accessible_resources` — keep it that way unless a feature actually needs them.
- The `quic` scheme listed in `README.md` was removed (commit `963ff6f`). Don't reintroduce it as an option in the UI.
- `chrome.proxy.settings.set` is asynchronous but the codebase passes empty callbacks — if you need the post-set state, query `chrome.proxy.settings.get` rather than chaining off the set.
- The popup reads `proxySetting` at top-level (module load), so popup state is a snapshot from when it opened. Any edits made while it's open won't reflect until reopen.
