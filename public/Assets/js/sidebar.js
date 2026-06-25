// ============ SHARED SIDEBAR + TOPBAR COMPONENT ============
(function createSidebar() {
    var style = document.createElement('style');
    style.textContent = [
        '.sn-hamburger { position:fixed; top:20px; left:20px; z-index:200; width:42px; height:42px; background:rgba(5,8,22,0.95); border:1px solid rgba(255,79,163,0.35); border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.2s; }',
        '.sn-hamburger:hover { border-color:#FF4FA3; background:rgba(255,79,163,0.08); }',
        '.sn-hamburger .material-icons { font-size:24px; color:white; }',
        '.sn-hamburger.hidden { display:none !important; visibility:hidden !important; }',
        '.sn-hamburger:hover { border-color:#FF4FA3; background:rgba(255,79,163,0.08); }',
        '.sn-hamburger .material-icons { font-size:24px; color:white; }',
        '.sn-hamburger.hidden { display:none !important; visibility:hidden !important; }',
        '.sn-sidebar { position:fixed; top:0; left:0; width:250px; height:100vh; background:rgba(8,8,24,0.98); border-right:1px solid rgba(255,255,255,0.06); z-index:180; padding:25px 0; transform:translateX(-100%); transition:transform 0.3s ease; display:flex; flex-direction:column; backdrop-filter:blur(12px); }',
        '.sn-sidebar.open { transform:translateX(0); }',
        '.sn-overlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:170; }',
        '.sn-overlay.show { display:block; }',
        '.sn-sidebar-header { display:flex; justify-content:space-between; align-items:center; padding:0 20px 25px; }',
        '.sn-sidebar-logo { font-size:22px; font-weight:bold; color:#FF4FA3; cursor:pointer; }',
        '.sn-sidebar-close { background:none; border:none; cursor:pointer; padding:5px; }',
        '.sn-sidebar-close .material-icons { font-size:22px; color:#ff4d4d; transition:0.2s; }',
        '.sn-sidebar-close:hover .material-icons { color:white; }',
        '.sn-nav-item { padding:12px 25px; color:#8892b0; cursor:pointer; display:flex; align-items:center; gap:12px; font-size:14px; transition:0.2s; border-left:3px solid transparent; text-decoration:none; }',
        '.sn-nav-item:hover { color:white; background:rgba(255,255,255,0.03); border-left-color:#FF4FA3; }',
        '.sn-nav-item.active { color:white; background:rgba(255,79,163,0.05); border-left-color:#FF4FA3; }',
        '.sn-nav-item .material-icons { font-size:20px; }',
        '.sn-nav-divider { height:1px; background:rgba(255,255,255,0.06); margin:12px 20px; }',
        '.topnav .topnav-logo { padding-left:50px; }',
        '.container > .page-header { padding-left:60px; }',
        '.panel-header { padding-left:65px !important; }',
        '.sn-topright { position:fixed; top:18px; right:20px; z-index:9999; display:flex; align-items:center; gap:16px; }',
        '.sn-topright .material-icons { font-size:22px; color:#8892b0; cursor:pointer; transition:0.2s; }',
        '.sn-topright .material-icons:hover { color:#FF4FA3; }',
        '.sn-topright .sn-av { width:34px; height:34px; border-radius:50%; background:linear-gradient(45deg,#FF4FA3,#A855F7); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold; cursor:pointer; color:white; }',
        '.sn-dd { display:none; position:absolute; top:42px; right:0; min-width:200px; background:rgba(12,12,30,0.98); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:8px 0; box-shadow:0 10px 40px rgba(0,0,0,0.5); }',
        '.sn-dd.show { display:block; animation:snddIn 0.2s ease; }',
        '@keyframes snddIn { from{opacity:0;transform:translateY(-8px);} to{opacity:1;transform:translateY(0);} }',
        '.sn-dd-title { padding:10px 16px; font-size:13px; color:#8892b0; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.06); }',
        '.sn-dd-empty { padding:15px 16px; font-size:13px; color:#555; text-align:center; }',
        '.sn-dd-link { display:flex; align-items:center; gap:10px; padding:10px 16px; color:#ccc; font-size:13px; cursor:pointer; transition:0.2s; text-decoration:none; }',
        '.sn-dd-link:hover { background:rgba(255,79,163,0.05); color:white; }',
        '.sn-dd-link .material-icons { font-size:18px; color:#8892b0; }',
        '.sn-dd-divider { height:1px; background:rgba(255,255,255,0.06); margin:4px 0; }',
        '.sn-dd-logout { color:#ff4d4d !important; }',
        '.sn-dd-logout .material-icons { color:#ff4d4d !important; }'
    ].join('\n');
    document.head.appendChild(style);

    // Determine active page
    var path = window.location.pathname;
    var page = path.split('/').pop().replace('.html', '') || 'index';

    // Build nav items
    var navItems = [
        { href: 'home.html', icon: 'home', label: 'Home', id: 'home' },
        { href: 'dashboard.html', icon: 'dashboard', label: 'Dashboard', id: 'dashboard' },
        { href: 'action.html', icon: 'videocam', label: 'Sessions', id: 'action' },
        { href: 'messages.html', icon: 'chat', label: 'Messages', id: 'messages' },
        { href: 'profile.html', icon: 'person', label: 'Profile', id: 'profile' }
    ];
    var aiItems = [
        { href: 'ai-mentor.html', icon: 'smart_toy', label: 'AI Mentor', id: 'ai-mentor' },
        { href: 'ai-roadmap.html', icon: 'map', label: 'AI Roadmap', id: 'ai-roadmap' },
        { href: 'arena.html', icon: 'emoji_events', label: 'Skill Arena', id: 'arena' },
        { href: 'interview.html', icon: 'psychology', label: 'Interview Prep', id: 'interview' },
        { href: 'resume-review.html', icon: 'description', label: 'Resume Review', id: 'resume-review' }
    ];

    var navHTML = navItems.map(function (item) {
        var cls = (page === item.id) ? 'sn-nav-item active' : 'sn-nav-item';
        return '<a class="' + cls + '" href="' + item.href + '"><span class="material-icons">' + item.icon + '</span> ' + item.label + '</a>';
    }).join('');
    navHTML += '<div class="sn-nav-divider"></div>';
    navHTML += aiItems.map(function (item) {
        var cls = (page === item.id) ? 'sn-nav-item active' : 'sn-nav-item';
        return '<a class="' + cls + '" href="' + item.href + '"><span class="material-icons">' + item.icon + '</span> ' + item.label + '</a>';
    }).join('');

    // Create overlay
    var overlay = document.createElement('div');
    overlay.className = 'sn-overlay';
    overlay.id = 'snOverlay';
    document.body.appendChild(overlay);

    // Create sidebar
    var sidebar = document.createElement('div');
    sidebar.className = 'sn-sidebar';
    sidebar.id = 'snSidebar';
    sidebar.innerHTML = '<div class="sn-sidebar-header"><div class="sn-sidebar-logo" onclick="window.location.href=\'home.html\'">SkillNest</div><button class="sn-sidebar-close" id="snClose"><span class="material-icons">close</span></button></div>' + navHTML;
    document.body.appendChild(sidebar);

    // Create hamburger
    var hamburger = document.createElement('div');
    hamburger.className = 'sn-hamburger';
    hamburger.id = 'snHamburger';
    hamburger.innerHTML = '<span class="material-icons">menu</span>';
    document.body.appendChild(hamburger);

    // Create top-right bell + avatar (on ALL pages)
    var userName = (function () {
        var s = localStorage.getItem('currentUser');
        if (s) { try { return JSON.parse(s).name || 'User'; } catch (e) { } }
        return 'User';
    })();
    var userInitial = userName.charAt(0).toUpperCase();

    // Only add if page doesn't already have the dropdown (action.html has its own)
    if (!document.querySelector('.avatar-wrap') && !document.querySelector('.sn-topright')) {
        var topright = document.createElement('div');
        topright.className = 'sn-topright';
        topright.innerHTML = '<div style="position:relative;"><span class="material-icons" onclick="snToggleNotif()">notifications</span><div class="sn-dd" id="snNotifDrop"><div class="sn-dd-title">Notifications</div><div class="sn-dd-empty">No new notifications</div></div></div><div style="position:relative;"><div class="sn-av" onclick="snToggleAvatar()">' + userInitial + '</div><div class="sn-dd" id="snAvatarDrop"><div class="sn-dd-title">' + userName + '</div><a class="sn-dd-link" href="profile.html"><span class="material-icons">person</span> My Profile</a><a class="sn-dd-link" href="dashboard.html"><span class="material-icons">dashboard</span> Dashboard</a><div class="sn-dd-divider"></div><div class="sn-dd-link" onclick="snLogout()"><span class="material-icons">swap_horiz</span> Switch Account</div><div class="sn-dd-link sn-dd-logout" onclick="snLogout()"><span class="material-icons">logout</span> Log Out</div></div></div>';
        document.body.appendChild(topright);
    }

    // Push topnav logo if topnav exists
    var topnav = document.querySelector('.topnav');
    if (topnav) {
        var logo = topnav.querySelector('.topnav-logo');
        if (logo) logo.style.paddingLeft = '50px';
    }

    // Toggle logic
    function openSN() {
        sidebar.classList.add('open');
        overlay.classList.add('show');
        hamburger.classList.add('hidden');
    }
    function closeSN() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        hamburger.classList.remove('hidden');
    }

    hamburger.addEventListener('click', openSN);
    overlay.addEventListener('click', closeSN);
    document.getElementById('snClose').addEventListener('click', closeSN);

    // Hide old sidebar/hamburger from dashboard
    var oldSidebar = document.querySelector('.sidebar');
    if (oldSidebar) oldSidebar.style.display = 'none';
    var oldHams = document.querySelectorAll('.hamburger');
    oldHams.forEach(function (h) { h.style.display = 'none'; h.style.visibility = 'hidden'; });
    window.toggleSidebar = function () { openSN(); };
})();

// ====== GLOBAL FUNCTIONS ======
function snToggleNotif() {
    var el = document.getElementById('snNotifDrop');
    if (el) el.classList.toggle('show');
    var av = document.getElementById('snAvatarDrop');
    if (av) av.classList.remove('show');
}
function snToggleAvatar() {
    var el = document.getElementById('snAvatarDrop');
    if (el) el.classList.toggle('show');
    var nf = document.getElementById('snNotifDrop');
    if (nf) nf.classList.remove('show');
}
function snLogout() {
    fetch('/api/auth/logout', { method: 'POST' }).catch(function () { });
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}
document.addEventListener('click', function (e) {
    if (!e.target.closest('.sn-topright') && !e.target.closest('.notif-wrap') && !e.target.closest('.avatar-wrap')) {
        var n = document.getElementById('snNotifDrop');
        var a = document.getElementById('snAvatarDrop');
        if (n) n.classList.remove('show');
        if (a) a.classList.remove('show');
    }
});


// ====== USER-SPECIFIC STORAGE HELPER ======
function snGetDataKey() {
    var stored = localStorage.getItem('currentUser');
    var email = 'default';
    if (stored) { try { email = JSON.parse(stored).email || 'default'; } catch (e) { } }
    return 'skillnest_data_' + email;
}
function snGetUserData() {
    var raw = localStorage.getItem(snGetDataKey());
    if (raw) return JSON.parse(raw);
    return { streak: 0, sessions: 0, skills: [], mentors: 0, progress: [], upcomingSessions: [], activity: [], weeklyHours: 0, weeklySessions: 0, milestones: 0, lastVisit: null };
}
function snSaveUserData(data) {
    localStorage.setItem(snGetDataKey(), JSON.stringify(data));
}
