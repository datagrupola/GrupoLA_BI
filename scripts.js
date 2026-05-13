function switchView(viewKey) {
    const views = {
        larousse: {
            src: "https://datastudio.google.com/embed/reporting/055e6005-5133-498d-8a93-4960dbc60f1b/page/aSIvF",
            link: "https://datastudio.google.com/reporting/055e6005-5133-498d-8a93-4960dbc60f1b"
        },
        chino: {
            src: "https://datastudio.google.com/embed/reporting/b3a1b8a4-311e-4d54-acc3-c6d323a8ba19/page/p_638aevo82d",
            link: "https://datastudio.google.com/reporting/b3a1b8a4-311e-4d54-acc3-c6d323a8ba19"
        }
    };

    const data = views[viewKey];
    document.getElementById('main-frame').src = data.src;
    document.getElementById('external-link').href = data.link;

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarStatus', isCollapsed ? 'closed' : 'open');
}

window.addEventListener('load', () => {
    if (localStorage.getItem('sidebarStatus') === 'closed') {
        document.getElementById('sidebar').classList.add('collapsed');
    }
});