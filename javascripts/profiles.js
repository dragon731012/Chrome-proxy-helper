// Profile-aware storage helpers shared by background.js, popup.js, options.js.
// Loaded via <script> in pages and via importScripts() in the service worker.

var PROFILES_SCHEMA_VERSION = 2;

var DEFAULT_PROFILE_FIELDS = {
    mode: 'direct',
    pac_script_url: { http: '', https: '', file: '' },
    pac_type: 'file://',
    pac_data: '',
    http_host: '', http_port: '',
    https_host: '', https_port: '',
    socks_host: '', socks_port: '', socks_type: 'socks5',
    bypasslist: '<local>,192.168.0.0/16,172.16.0.0/12,169.254.0.0/16,10.0.0.0/8',
    proxy_rule: 'singleProxy',
    internal: '',
    auth: { enable: '', user: '', pass: '' },
    rules_mode: 'Whitelist'
};

function _profileNewId() {
    return 'p_' + Math.random().toString(36).slice(2, 9);
}

function _profileDeepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function _profileDefault(id, name) {
    var p = _profileDeepCopy(DEFAULT_PROFILE_FIELDS);
    p.id = id;
    p.name = name;
    return p;
}

function _profileUniqueArray(arr) {
    var seen = {}, out = [];
    for (var i = 0; i < arr.length; i++) {
        if (!seen[arr[i]]) { seen[arr[i]] = true; out.push(arr[i]); }
    }
    return out;
}

function i18nMessage(key, fallback) {
    var m;
    try { m = chrome.i18n.getMessage(key); } catch (e) {}
    return m || fallback;
}

function _profileDefaultName() {
    return i18nMessage('profile_default_name', 'Default');
}

// Legacy localized values used as the default profile name in earlier builds.
var _LEGACY_DEFAULT_NAMES = { '默认': true, 'proxy': true };

function _renameLegacyDefault(profiles, cb) {
    var p = profiles && profiles['default'];
    if (!p || !_LEGACY_DEFAULT_NAMES[p.name]) { cb && cb(); return; }
    p.name = _profileDefaultName();
    chrome.storage.local.set({ profiles: profiles }, function() { cb && cb(); });
}

function ensureMigrated(cb) {
    chrome.storage.local.get(null, function(result) {
        if (result.schemaVersion === PROFILES_SCHEMA_VERSION && result.profiles) {
            _renameLegacyDefault(result.profiles, function() { cb && cb(); });
            return;
        }

        var profile = _profileDefault('default', _profileDefaultName());
        if (result.proxySetting) {
            try {
                var v1 = JSON.parse(result.proxySetting);
                Object.assign(profile, v1);
                profile.id = 'default';
                profile.name = _profileDefaultName();
                profile.mode = result.proxyInfo || 'direct';
            } catch (e) {}
        }

        var update = {
            schemaVersion: PROFILES_SCHEMA_VERSION,
            activeProfileId: 'default',
            profiles: { 'default': profile }
        };
        if (!result.chinaList) {
            update.chinaList = JSON.stringify(['*.cn']);
        }

        chrome.storage.local.set(update, function() {
            chrome.storage.local.remove(['proxySetting', 'proxyInfo'], function() {
                cb && cb();
            });
        });
    });
}

function listProfiles(cb) {
    chrome.storage.local.get(['profiles', 'activeProfileId'], function(r) {
        cb(r.profiles || {}, r.activeProfileId || null);
    });
}

function getProfile(id, cb) {
    chrome.storage.local.get(['profiles'], function(r) {
        cb((r.profiles && r.profiles[id]) || null);
    });
}

function getActiveProfile(cb) {
    chrome.storage.local.get(['profiles', 'activeProfileId'], function(r) {
        cb((r.profiles && r.profiles[r.activeProfileId]) || null, r.activeProfileId || null);
    });
}

function saveProfile(id, profile, cb) {
    chrome.storage.local.get(['profiles'], function(r) {
        var profiles = r.profiles || {};
        profile.id = id;
        profiles[id] = profile;
        chrome.storage.local.set({ profiles: profiles }, function() { cb && cb(); });
    });
}

function createProfile(name, fromId, cb) {
    chrome.storage.local.get(['profiles'], function(r) {
        var profiles = r.profiles || {};
        var id = _profileNewId();
        var src = fromId && profiles[fromId];
        var p = src ? _profileDeepCopy(src) : _profileDefault(id, name);
        p.id = id;
        p.name = name;
        profiles[id] = p;
        chrome.storage.local.set({ profiles: profiles }, function() {
            cb && cb(id, p);
        });
    });
}

function renameProfile(id, newName, cb) {
    chrome.storage.local.get(['profiles'], function(r) {
        var profiles = r.profiles || {};
        if (!profiles[id]) { cb && cb(); return; }
        profiles[id].name = newName;
        chrome.storage.local.set({ profiles: profiles }, function() { cb && cb(); });
    });
}

function deleteProfile(id, cb) {
    chrome.storage.local.get(['profiles', 'activeProfileId'], function(r) {
        var profiles = r.profiles || {};
        var ids = Object.keys(profiles);
        if (ids.length <= 1 || !profiles[id]) {
            cb && cb(r.activeProfileId || null);
            return;
        }
        var wasActive = r.activeProfileId === id;
        delete profiles[id];
        var newActive = wasActive ? Object.keys(profiles)[0] : r.activeProfileId;
        chrome.storage.local.set({ profiles: profiles, activeProfileId: newActive }, function() {
            if (wasActive) {
                applyProfile(newActive, function() { cb && cb(newActive); });
            } else {
                cb && cb(newActive);
            }
        });
    });
}

function setActiveProfile(id, cb) {
    chrome.storage.local.set({ activeProfileId: id }, function() { cb && cb(); });
}

function _profileSetIcon(mode) {
    var path = (mode === 'direct' || mode === 'system') ? 'images/off.png' : 'images/on.png';
    try { chrome.action.setIcon({ path: path }); } catch (e) {}
}

function _profileBuildFixedServers(profile, chinaList) {
    var rule = profile.proxy_rule;
    var proxy = { type: '', host: '', port: 0 };

    switch (profile.mode) {
        case 'http':
            proxy = { type: 'http', host: profile.http_host, port: parseInt(profile.http_port) };
            if (rule === 'fallbackProxy') rule = 'singleProxy';
            break;
        case 'https':
            proxy = { type: 'https', host: profile.https_host, port: parseInt(profile.https_port) };
            break;
        case 'socks4':
            proxy = { type: 'socks4', host: profile.socks_host, port: parseInt(profile.socks_port) };
            break;
        case 'socks5':
            proxy = { type: 'socks5', host: profile.socks_host, port: parseInt(profile.socks_port) };
            break;
    }

    var bypass;
    if (profile.internal === 'china' && chinaList && chinaList.length) {
        bypass = chinaList.concat((profile.bypasslist || '').split(','));
    } else {
        bypass = profile.bypasslist ? profile.bypasslist.split(',') : ['<local>'];
    }

    var config = {
        mode: 'fixed_servers',
        rules: { bypassList: _profileUniqueArray(bypass) }
    };
    config.rules[rule] = { scheme: proxy.type, host: proxy.host, port: proxy.port };
    return config;
}

function _profileBuildConfig(p, chinaList) {
    switch (p.mode) {
        case 'direct':      return { mode: 'direct' };
        case 'system':      return { mode: 'system' };
        case 'auto_detect': return { mode: 'auto_detect' };
        case 'pac_data':
            return { mode: 'pac_script', pacScript: { data: p.pac_data || '' } };
        case 'pac_url':
            var proto = (p.pac_type || 'http://').split(':')[0];
            return {
                mode: 'pac_script',
                pacScript: { url: (p.pac_type || '') + ((p.pac_script_url && p.pac_script_url[proto]) || '') }
            };
        default:
            return _profileBuildFixedServers(p, chinaList);
    }
}

function _applyProfileObj(p, chinaList, cb) {
    if (!p) { cb && cb(); return; }
    var config = _profileBuildConfig(p, chinaList || []);
    chrome.proxy.settings.set({ value: config, scope: 'regular' }, function() {
        _profileSetIcon(p.mode);
        cb && cb();
    });
}

function applyProfile(id, cb) {
    chrome.storage.local.get(['profiles', 'chinaList'], function(r) {
        var p = r.profiles && r.profiles[id];
        var chinaList = [];
        try { chinaList = r.chinaList ? JSON.parse(r.chinaList) : []; } catch (e) {}
        _applyProfileObj(p, chinaList, cb);
    });
}

function applyMode(id, mode, cb) {
    chrome.storage.local.get(['profiles', 'chinaList'], function(r) {
        var profiles = r.profiles || {};
        if (!profiles[id]) { cb && cb(); return; }
        profiles[id].mode = mode;
        var chinaList = [];
        try { chinaList = r.chinaList ? JSON.parse(r.chinaList) : []; } catch (e) {}
        chrome.storage.local.set({ profiles: profiles }, function() {
            _applyProfileObj(profiles[id], chinaList, cb);
        });
    });
}

function setActiveAndApply(id, cb) {
    setActiveProfile(id, function() {
        applyProfile(id, cb);
    });
}
