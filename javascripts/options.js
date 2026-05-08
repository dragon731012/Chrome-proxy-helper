// Chrome Proxy helper - options page
// Profile-aware: every form binds to the *editing* profile in #profile-select.
// Saves silently unless the editing profile is also the active one.

var currentEditingId = null;
var activeProfileId = null;
var allProfiles = {};

function refreshProfileSelect() {
    var $sel = $('#profile-select').empty();
    Object.keys(allProfiles).forEach(function(id) {
        var p = allProfiles[id];
        $sel.append($('<option>').val(id).text(p.name));
    });
    $sel.val(currentEditingId);
    updateActiveBadge();
}

function updateActiveBadge() {
    var isActive = currentEditingId === activeProfileId;
    $('#active-indicator').toggle(isActive);
    $('#profile-set-active').toggle(!isActive);
}

function availableModes(p) {
    var avail = { direct: true, system: true, auto_detect: true };
    if (p.http_host && p.http_port) avail.http = true;
    if (p.https_host && p.https_port) avail.https = true;
    if (p.socks_host && p.socks_port) avail.socks = true;
    if (p.pac_data) avail.pac_data = true;
    var pacProto = (p.pac_type || '').split(':')[0];
    if (p.pac_script_url && p.pac_script_url[pacProto]) avail.pac_url = true;
    return avail;
}

function applyModeRadioVisibility(p) {
    var avail = availableModes(p);
    $('.mode-radios label[data-mode]').each(function() {
        $(this).toggle(!!avail[$(this).attr('data-mode')]);
    });
}

function loadProxyDataFor(id) {
    var p = allProfiles[id];
    if (!p) return;

    $('#socks-host').val(p.socks_host || '');
    $('#socks-port').val(p.socks_port || '');
    $('#http-host').val(p.http_host || '');
    $('#http-port').val(p.http_port || '');
    $('#https-host').val(p.https_host || '');
    $('#https-port').val(p.https_port || '');
    $('#pac-type').val(p.pac_type || 'file://');
    $('#pac-data').val(p.pac_data || '');
    $('#bypasslist').val(p.bypasslist || '');
    $('#proxy-rule').val(p.proxy_rule || 'singleProxy');
    $('#username').val((p.auth && p.auth.user) || '');
    $('#password').val((p.auth && p.auth.pass) || '');

    try {
        var type = (p.pac_type || 'file://').split(':')[0];
        $('#pac-script-url').val((p.pac_script_url && p.pac_script_url[type]) || '');
    } catch (e) {}

    $('#socks5').prop('checked', p.socks_type === 'socks5');
    $('#socks4').prop('checked', p.socks_type === 'socks4');
    $('#china-list').prop('checked', p.internal === 'china');

    var radioMode = (p.mode === 'socks4' || p.mode === 'socks5') ? 'socks' : (p.mode || 'direct');
    $('input[name="mode"]').prop('checked', false);
    $('#mode-' + radioMode).prop('checked', true);

    applyModeRadioVisibility(p);
}

function readFormIntoProfile(p) {
    p.http_host = $('#http-host').val() || '';
    p.http_port = $('#http-port').val() || '';
    p.https_host = $('#https-host').val() || '';
    p.https_port = $('#https-port').val() || '';
    p.socks_host = $('#socks-host').val() || '';
    p.socks_port = $('#socks-port').val() || '';
    p.pac_type = $('#pac-type').val() || 'file://';
    p.pac_data = $('#pac-data').val() || '';
    p.bypasslist = $('#bypasslist').val() || '';
    p.proxy_rule = $('#proxy-rule').val() || 'singleProxy';

    if (!p.auth) p.auth = { enable: '', user: '', pass: '' };
    p.auth.user = $('#username').val() || '';
    p.auth.pass = $('#password').val() || '';

    if ($('#socks5').is(':checked')) p.socks_type = 'socks5';
    if ($('#socks4').is(':checked')) p.socks_type = 'socks4';

    p.internal = $('#china-list').is(':checked') ? 'china' : '';

    var modeChoice = $('input[name="mode"]:checked').val();
    if (modeChoice === 'socks') {
        p.mode = p.socks_type || 'socks5';
    } else if (modeChoice) {
        p.mode = modeChoice;
    }

    try {
        var pacType = (p.pac_type || 'file://').split(':')[0];
        if (!p.pac_script_url) p.pac_script_url = { http: '', https: '', file: '' };
        p.pac_script_url[pacType] = $('#pac-script-url').val() || '';
    } catch (e) {}

    return p;
}

function save() {
    if (!currentEditingId) return;
    var p = allProfiles[currentEditingId];
    if (!p) return;

    readFormIntoProfile(p);
    applyModeRadioVisibility(p);
    saveProfile(currentEditingId, p, function() {
        if (currentEditingId === activeProfileId) {
            applyProfile(currentEditingId);
        }
    });
}

function reloadAndRender(selectId, cb) {
    listProfiles(function(profiles, active) {
        allProfiles = profiles;
        activeProfileId = active;
        if (selectId && allProfiles[selectId]) {
            currentEditingId = selectId;
        } else if (!allProfiles[currentEditingId]) {
            currentEditingId = activeProfileId || Object.keys(allProfiles)[0];
        }
        refreshProfileSelect();
        loadProxyDataFor(currentEditingId);
        cb && cb();
    });
}

function onSelectProfile() {
    var id = $('#profile-select').val();
    currentEditingId = id;
    loadProxyDataFor(id);
    updateActiveBadge();
}

function onNewProfile() {
    var name = window.prompt(i18nMessage('profile_name_prompt', 'Profile name:'), '');
    if (!name) return;
    createProfile(name, null, function(newId) {
        reloadAndRender(newId);
    });
}

function onRenameProfile() {
    if (!currentEditingId) return;
    var current = allProfiles[currentEditingId];
    var name = window.prompt(i18nMessage('profile_name_prompt', 'Profile name:'), current ? current.name : '');
    if (!name) return;
    renameProfile(currentEditingId, name, function() {
        reloadAndRender(currentEditingId);
    });
}

function onDuplicateProfile() {
    if (!currentEditingId) return;
    var current = allProfiles[currentEditingId];
    var defaultName = current ? current.name + ' (copy)' : '';
    var name = window.prompt(i18nMessage('profile_name_prompt', 'Profile name:'), defaultName);
    if (!name) return;
    createProfile(name, currentEditingId, function(newId) {
        reloadAndRender(newId);
    });
}

function onDeleteProfile() {
    if (!currentEditingId) return;
    if (Object.keys(allProfiles).length <= 1) {
        window.alert(i18nMessage('cannot_delete_last_profile', 'At least one profile must exist.'));
        return;
    }
    if (!window.confirm(i18nMessage('delete_profile_confirm', 'Delete this profile? This cannot be undone.'))) return;
    var idToDelete = currentEditingId;
    deleteProfile(idToDelete, function(newActive) {
        reloadAndRender(newActive);
    });
}

function onSetActive() {
    if (!currentEditingId) return;
    setActiveAndApply(currentEditingId, function() {
        activeProfileId = currentEditingId;
        updateActiveBadge();
    });
}

function readSingleFile(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        $('#pac-data').val(ev.target.result);
        save();
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', function() {
    $('#diagnosis').click(function() {
        chrome.tabs.create({ url: 'chrome://net-internals/#proxy' });
    });

    $('#profile-select').on('change', onSelectProfile);
    $('#profile-new').on('click', onNewProfile);
    $('#profile-rename').on('click', onRenameProfile);
    $('#profile-duplicate').on('click', onDuplicateProfile);
    $('#profile-delete').on('click', onDeleteProfile);
    $('#profile-set-active').on('click', onSetActive);

    $('.mainview input, .mainview textarea, .mainview select').not('#pac-type').on('change', save);

    $('#pac-type').on('change', function() {
        var type = $('#pac-type').val().split(':')[0];
        var p = allProfiles[currentEditingId];
        if (p && p.pac_script_url) {
            $('#pac-script-url').val(p.pac_script_url[type] || '');
        }
        save();
    });

    var pacFile = document.getElementById('pac-file');
    if (pacFile) pacFile.addEventListener('change', readSingleFile, false);

    ensureMigrated(function() {
        reloadAndRender(null);
    });
});
