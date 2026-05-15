# Chrome Proxy Helper

A Manifest V3 Chrome extension that switches Chrome's proxy independently of
the operating system. By default Chrome inherits the system proxy (IE
settings on Windows); this extension uses the native `chrome.proxy` API so
you can route Chrome traffic through a different proxy without touching the
rest of the OS.

# Features

* SOCKS4, SOCKS5, HTTP, and HTTPS proxies
* PAC script via URL or inline data, plus WPAD auto-detect
* Per-scheme proxy rules (`singleProxy` or split HTTP / HTTPS / FTP)
* Multi-profile support — one profile per environment (Work, Home, Travel)
* Whitelist and Blacklist rules modes (bypass list / proxy list)
* Proxy authentication (handled through `chrome.webRequest.onAuthRequired`)
* Toolbar icon reflects the active mode; `Alt+O` opens options, `Alt+P` cycles profiles
* Localized UI: English, 日本語, Русский, 简体中文

# Install

* **Stable** — from the Chrome Web Store:
  [Proxy Helper](https://chrome.google.com/webstore/detail/proxy-helper/mnloefcpaepkpmhaoipjkpikbnkmbnic)
* **From source** — clone and load unpacked:

```
git clone https://github.com/henices/Chrome-proxy-helper.git
```

Then in Chrome: `chrome://extensions` → enable *Developer mode* → *Load
unpacked* → select the cloned directory. There is no build step.

# Usage

* Click the toolbar icon for the quick switcher (popup). Entries with no
  configured host are hidden.
* Open the options page (toolbar icon → *Options*, or `Alt+O`) to edit
  hosts, ports, bypass list, PAC sources, and authentication.

## Profile-based proxy switching

Each profile is a complete, independent proxy configuration — hosts, ports,
PAC settings, rules list, and auth — so you can keep one for Work, one for
Home, one for Travel, etc., and switch between them in one click.

* **Manage profiles** — the bar at the top of the options page:
  **New**, **Rename**, **Duplicate**, **Delete**. Duplicate is useful when
  a new environment differs only slightly from an existing one.
* **Switch the active profile** — open the popup, click a profile to expand
  it, then click a proxy type. That profile becomes active and the chosen
  proxy is applied immediately.
* The active profile is remembered across browser restarts. The popup
  reflects whichever profile is currently driving Chrome's proxy.

## Whitelist and Blacklist rules

The **Rules Mode** dropdown on the options page chooses how the
comma-separated rules list is interpreted. Rules apply to the HTTP / HTTPS /
SOCKS proxy modes only; PAC URL and PAC Script bring their own routing
logic and ignore this setting.

* **Whitelist** *(default)* — the field is a **Bypass List**. Every
  request goes through the proxy *except* hosts that match an entry, which
  go direct. This uses Chrome's native `chrome.proxy.settings` bypass list.
* **Blacklist** — the field is a **Proxy List**. *Only* hosts matching an
  entry go through the proxy; everything else goes direct. Chrome's proxy
  API has no native blacklist, so this mode is implemented as a
  synthesized PAC script.

Both lists are stored separately, so toggling Rules Mode does not erase the
other list. Pattern syntax accepted in either list:

| Pattern | Matches |
| --- | --- |
| `example.com` | the host and all subdomains (`api.example.com`, …) |
| `*.example.com` | subdomains *and* the apex `example.com` |
| `*foobar.com:99` | shell-style wildcards via `shExpMatch` |
| `192.168.0.0/16` | any IPv4 in the CIDR range |
| `<local>` | plain hostnames with no dot (e.g. `intranet`) |

## Using a PAC script

An example PAC script is provided:
[example.pac](https://raw.githubusercontent.com/henices/Chrome-proxy-helper/refs/heads/master/example.pac).

1. Options page → **PAC** → **PAC script**, select `example.pac`.
2. Popup → **PAC Script**.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Alt+O` | Open the options page |
| `Alt+P` | Cycle to the next profile and apply it |

These are the defaults; rebind or clear them at
`chrome://extensions/shortcuts`.

# FAQ

See the [FAQ](https://github.com/henices/Chrome-proxy-helper/wiki/FAQ) on
the wiki.

# License

This program is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation, either version 2 of the License, or (at your option)
any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
for more details.

You should have received a copy of the GNU General Public License along
with this program. If not, see <http://www.gnu.org/licenses/>.
