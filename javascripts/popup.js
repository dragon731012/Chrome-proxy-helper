// Chrome Proxy helper - popup
// Profile-list switcher: each row is a profile, click to activate.
// All mode/host/auth configuration lives in the options page.

document.documentElement.lang = chrome.i18n.getUILanguage();

function _normalizeMode(mode) {
    return (mode === 'socks4' || mode === 'socks5') ? 'socks' : mode;
}

var MODE_LABEL_KEYS = {
    direct: 'direct_proxy',
    system: 'system_proxy',
    auto_detect: 'auto_detect_set',
    http: 'http_proxy_set',
    https: 'https_proxy_set',
    socks: 'socks_proxy_set',
    pac_url: 'pac_url_set',
    pac_data: 'pac_data_set'
};

function modeLabel(mode) {
    var key = MODE_LABEL_KEYS[_normalizeMode(mode)];
    return key ? i18nMessage(key, mode) : mode;
}

var MODE_ICONS = {
    pac_data:    '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    pac_url:     '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
    socks:       '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
    http:        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
    https:       '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    auto_detect: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5z"/></svg>',
    system:      '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    direct:      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>'
};

function modeIcon(mode) {
    return MODE_ICONS[_normalizeMode(mode)] || MODE_ICONS.direct;
}

function renderProfileList(profiles, activeId) {
    var $list = $('#profile-list').empty();
    Object.keys(profiles).forEach(function(id) {
        var p = profiles[id];
        var label = modeLabel(p.mode);
        var $li = $('<li>')
            .attr('data-profile-id', id)
            .attr('title', label);
        if (id === activeId) $li.addClass('selected');
        var $menu = $('<div>').addClass('menu');
        var $icon = $('<div>').addClass('icon').html(modeIcon(p.mode));
        $menu.append($icon);
        $menu.append($('<div>').addClass('profile-name').text(p.name));
        $li.append($menu);
        $list.append($li);
    });
}

function refresh() {
    listProfiles(function(profiles, active) {
        renderProfileList(profiles, active);
    });
}

function configProxy() {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#config-proxy').addEventListener('click', configProxy);

    $('#profile-list').on('click', 'li', function() {
        var id = $(this).attr('data-profile-id');
        if (!id) return;
        setActiveAndApply(id, refresh);
    });

    $('[data-i18n-content]').each(function() {
        var message = chrome.i18n.getMessage(this.getAttribute('data-i18n-content'));
        if (message) $(this).html(message);
    });

    ensureMigrated(refresh);
});

$(document).ready(function() {
    document.querySelector('.version').textContent = chrome.runtime.getManifest().version;
});
