// Chrome Proxy helper - popup
// Profile-list switcher: each row is a profile, click to activate.
// All mode/host/auth configuration lives in the options page.

document.documentElement.lang = chrome.i18n.getUILanguage();

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
