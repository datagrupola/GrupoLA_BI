const views = {
    global: {
        src: "https://datastudio.google.com/embed/reporting/f65fb799-b645-42a5-beb4-8a824fb86613/page/lZNyF",
        link: "https://datastudio.google.com/reporting/f65fb799-b645-42a5-beb4-8a824fb86613"
    },
    afluencia: {
        src: "https://datastudio.google.com/embed/reporting/11d460ed-ed72-4543-a143-4bdcf611f580/page/KU01F",
        link: "https://datastudio.google.com/reporting/11d460ed-ed72-4543-a143-4bdcf611f580"
    },
    larousse: {
        src: "https://datastudio.google.com/embed/reporting/055e6005-5133-498d-8a93-4960dbc60f1b/page/aSIvF",
        link: "https://datastudio.google.com/reporting/055e6005-5133-498d-8a93-4960dbc60f1b"
    },
    larousse_encuestas: {
        src: "https://datastudio.google.com/embed/reporting/0f76e3dc-4f94-495b-86f4-0de5a6e63e2a/page/hOjyF",
        link: "https://datastudio.google.com/reporting/0f76e3dc-4f94-495b-86f4-0de5a6e63e2a"
    },
    chino: {
        src: "https://datastudio.google.com/embed/reporting/b9b8ec77-cf71-4fe2-a950-c099f02eef72/page/p_du10sayh4d",
        link: "https://datastudio.google.com/reporting/b9b8ec77-cf71-4fe2-a950-c099f02eef72"
    },
    pacas: {
        src: "https://datastudio.google.com/embed/reporting/28f7b91d-43c2-4f58-a87c-0dbbfa8f07d6/page/FE0xF",
        link: "https://datastudio.google.com/reporting/28f7b91d-43c2-4f58-a87c-0dbbfa8f07d6"
    }
};

const ACCESS_PASSWORD = 'GrupoLA2026';
const UNLOCK_STORAGE_KEY = 'biDashboardUnlocked';

function switchView(viewKey, activeButton) {
    const data = views[viewKey];
    if (!data) return;

    document.getElementById('main-frame').src = data.src;
    document.getElementById('external-link').href = data.link;

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    activeButton.classList.add('active');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarStatus', isCollapsed ? 'closed' : 'open');
}

function initializePasswordProtection() {
    const gate = document.getElementById('password-gate');
    const shell = document.getElementById('app-shell');
    const form = document.getElementById('password-form');
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');

    if (!gate || !shell || !form || !input || !error) return;

    if (localStorage.getItem(UNLOCK_STORAGE_KEY) === 'true') {
        gate.hidden = true;
        shell.hidden = false;
        return;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const submittedPassword = input.value.trim();

        if (submittedPassword === ACCESS_PASSWORD) {
            localStorage.setItem(UNLOCK_STORAGE_KEY, 'true');
            gate.hidden = true;
            shell.hidden = false;
            error.textContent = '';
            return;
        }

        error.textContent = 'Contraseña incorrecta';
        input.value = '';
        input.focus();
    });
}

window.addEventListener('load', () => {
    initializePasswordProtection();

    if (localStorage.getItem('sidebarStatus') === 'closed') {
        document.getElementById('sidebar').classList.add('collapsed');
    }

    document.querySelectorAll('.nav-btn[data-view]').forEach((button) => {
        button.addEventListener('click', () => {
            switchView(button.dataset.view, button);
        });
    });

    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
});
