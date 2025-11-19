const API_ENDPOINT = 'https://ai-shortcuts.midasavocado.workers.dev';

// --- Configuration ---
const MODELS = [
    { id: 'auto', name: 'Auto (Default)', desc: 'Smart selection', tier: 'auto' },
    { id: 'google/gemma-7b-it:free', name: 'Gemma 7B (Free)', desc: 'Fast & Free', tier: 'free' },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', desc: 'Reliable & Free', tier: 'free' },
    { id: 'openai/gpt-4o', name: 'GPT-5.1 (Pro)', desc: 'High Intelligence', tier: 'pro' },
    { id: 'x-ai/grok-1', name: 'Grok 4.1 (Pro)', desc: 'Real-time Knowledge', tier: 'pro' },
    { id: 'anthropic/claude-3-opus', name: 'Claude Sonic 4.5 (Pro)', desc: 'Complex Logic', tier: 'pro' }
];

const ACTIONS_DB = [
    "is.workflow.actions.gettext", "is.workflow.actions.comment", "is.workflow.actions.alert",
    "is.workflow.actions.openurl", "is.workflow.actions.runworkflow", "is.workflow.actions.conditional",
    "is.workflow.actions.repeat.count", "is.workflow.actions.ask", "is.workflow.actions.setvariable",
    "is.workflow.actions.getvariable", "is.workflow.actions.url", "is.workflow.actions.downloadurl",
    "is.workflow.actions.choosefrommenu", "is.workflow.actions.exit", "is.workflow.actions.math",
    "is.workflow.actions.date", "is.workflow.actions.format.date", "is.workflow.actions.getclipboard",
    "is.workflow.actions.setclipboard", "is.workflow.actions.wifi.set", "is.workflow.actions.bluetooth.set"
];

// --- State ---
let currentProject = null;
let projects = JSON.parse(localStorage.getItem('flux_projects')) || [];
let constraints = [];
let subscriptionTier = localStorage.getItem('flux_subscription') || 'free';
let lastGeneratedPlist = null; // Store for export

// --- DOM Elements ---
const messagesContainer = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('btn-send');
const visualizerContent = document.getElementById('visualizer-content');
const btnAddAction = document.getElementById('btn-add-action');
const forceMenu = document.getElementById('force-menu');
const actionPicker = document.getElementById('action-picker');
const actionList = document.getElementById('action-list');
const activeConstraintsDiv = document.getElementById('active-constraints');
const settingsModal = document.getElementById('settings-modal');
const exportModal = document.getElementById('export-modal');
const sidebarProjectList = document.getElementById('sidebar-project-list');
const projectNameInput = document.getElementById('project-name-input');
const modelSelect = document.getElementById('model-select');

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Global Init
    renderModelOptions();

    // Page Specific Init
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        initLanding();
        initCanvas();
    } else if (window.location.pathname.includes('app.html')) {
        initApp();
    }

    // Global Event Listeners
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSend);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
    }

    if (btnAddAction) {
        btnAddAction.addEventListener('click', (e) => {
            e.stopPropagation();
            forceMenu.classList.toggle('hidden');
        });
    }

    if (projectNameInput) {
        projectNameInput.addEventListener('change', () => {
            if (currentProject) {
                updateProject(currentProject.id, { name: projectNameInput.value });
                renderSidebarProjects();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (forceMenu && !forceMenu.contains(e.target) && e.target !== btnAddAction) {
            forceMenu.classList.add('hidden');
        }
        if (actionPicker && !actionPicker.contains(e.target) && !forceMenu.contains(e.target)) {
            actionPicker.classList.add('hidden');
        }
    });
});

function renderModelOptions() {
    if (!modelSelect) return;
    modelSelect.innerHTML = '';
    MODELS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        modelSelect.appendChild(opt);
    });
}

// --- Project Management ---
function createProject() {
    const id = 'proj_' + Date.now();
    const newProject = {
        id: id,
        name: 'Untitled Project',
        visibility: 'public',
        customInstructions: '',
        created: Date.now(),
        updated: Date.now(),
        history: [],
        code: null
    };
    projects.unshift(newProject);
    saveProjects();
    return id;
}

function saveProjects() {
    localStorage.setItem('flux_projects', JSON.stringify(projects));
}

function getProject(id) {
    return projects.find(p => p.id === id);
}

function updateProject(id, updates) {
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
        projects[idx] = { ...projects[idx], ...updates, updated: Date.now() };
        saveProjects();
        currentProject = projects[idx];
    }
}

function createNewProject() {
    const id = createProject();
    // Redirect with new flag
    window.location.href = `app.html?id=${id}&new=true`;
}

// --- Landing Page Logic ---
function initLanding() {
    const user = localStorage.getItem('flux_user');
    const navCta = document.getElementById('nav-cta');

    if (user) {
        if (navCta) {
            navCta.textContent = 'Go to Workspace';
            navCta.href = 'app.html';
        }
    } else {
        if (navCta) {
            navCta.textContent = 'Get Started';
            navCta.href = 'javascript:login()';
        }
    }
}

function login() {
    localStorage.setItem('flux_user', 'true');
    window.location.reload();
}

// --- App Page Logic ---
function initApp() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const isNew = params.get('new');
    const prompt = params.get('prompt');

    // Sidebar Default Collapsed
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.add('collapsed');

    if (id) {
        currentProject = getProject(id);
    }

    if (!currentProject) {
        const newId = createProject();
        window.history.replaceState({}, '', `app.html?id=${newId}&new=true`);
        currentProject = getProject(newId);
        toggleSettings(); // Open settings for new project
    } else if (isNew === 'true') {
        toggleSettings();
    }

    // Load State
    if (projectNameInput) projectNameInput.value = currentProject.name;
    if (currentProject.history) {
        currentProject.history.forEach(msg => addMessageToUI(msg.role, msg.content));
    }

    renderSidebarProjects();

    // Handle prompt from landing
    if (prompt) {
        chatInput.value = prompt;
        handleSend();
    }

    // Check Tour
    const tourShown = localStorage.getItem('flux_tour_shown');
    if (!tourShown) {
        startGuidedTour();
    }
}

// --- Guided Tour ---
function startGuidedTour() {
    const steps = [
        { el: '#app-sidebar', title: 'Your Workspace', text: 'Access all your projects here. Hover to expand.', pos: 'right' },
        { el: '.chat-input-wrapper', title: 'Describe It', text: 'Type what you want to build in plain English.', pos: 'top' },
        { el: '.visualizer-panel', title: 'Visualize It', text: 'Watch your shortcut logic appear here in real-time.', pos: 'left' },
        { el: '#btn-export', title: 'Export', text: 'Download or publish your shortcut.', pos: 'bottom' }
    ];

    let currentStep = 0;

    function showStep(index) {
        // Cleanup
        document.querySelectorAll('.tour-box').forEach(e => e.remove());
        document.querySelectorAll('.highlight-element').forEach(e => e.classList.remove('highlight-element'));

        if (index >= steps.length) {
            localStorage.setItem('flux_tour_shown', 'true');
            return;
        }

        const step = steps[index];
        const el = document.querySelector(step.el);
        if (!el) return showStep(index + 1);

        el.classList.add('highlight-element');

        const box = document.createElement('div');
        box.className = `tour-box ${step.pos}`;
        box.innerHTML = `
      <div class="tour-content">
        <h4>${step.title}</h4>
        <p>${step.text}</p>
      </div>
      <div class="tour-actions">
        <button class="tour-btn skip" onclick="endTour()">Skip</button>
        <button class="tour-btn next" onclick="nextTourStep(${index})">Next</button>
      </div>
    `;

        document.body.appendChild(box);

        // Positioning
        const rect = el.getBoundingClientRect();
        if (step.pos === 'right') {
            box.style.top = rect.top + 'px';
            box.style.left = (rect.right + 10) + 'px';
        } else if (step.pos === 'left') {
            box.style.top = rect.top + 'px';
            box.style.left = (rect.left - 270) + 'px';
        } else if (step.pos === 'top') {
            box.style.top = (rect.top - 120) + 'px';
            box.style.left = rect.left + 'px';
        } else if (step.pos === 'bottom') {
            box.style.top = (rect.bottom + 10) + 'px';
            box.style.left = (rect.left - 100) + 'px';
        }
    }

    window.nextTourStep = (idx) => showStep(idx + 1);
    window.endTour = () => {
        document.querySelectorAll('.tour-box').forEach(e => e.remove());
        document.querySelectorAll('.highlight-element').forEach(e => e.classList.remove('highlight-element'));
        localStorage.setItem('flux_tour_shown', 'true');
    };

    showStep(0);
}

function renderSidebarProjects() {
    if (!sidebarProjectList) return;
    sidebarProjectList.innerHTML = '';

    projects.forEach(p => {
        const item = document.createElement('div');
        item.className = `project-item ${currentProject && currentProject.id === p.id ? 'active' : ''}`;
        item.onclick = () => window.location.href = `app.html?id=${p.id}`;
        item.innerHTML = `
      <span class="project-icon">⚡️</span>
      <span class="project-name-list">${p.name}</span>
    `;
        sidebarProjectList.appendChild(item);
    });
}

// --- Settings Modal ---
function toggleSettings() {
    if (settingsModal) settingsModal.classList.toggle('hidden');
    if (!settingsModal.classList.contains('hidden')) {
        document.getElementById('setting-name').value = currentProject.name;
        document.getElementById('setting-instructions').value = currentProject.customInstructions || '';
        updateVisibilityUI(currentProject.visibility);
    }
}

function setProjectVisibility(vis) {
    if (vis === 'private' && subscriptionTier !== 'pro') {
        alert('Private projects are a Pro feature.');
        return;
    }
    updateVisibilityUI(vis);
}

function updateVisibilityUI(vis) {
    const opts = document.querySelectorAll('.vis-option');
    opts.forEach(o => o.classList.remove('selected'));
    if (vis === 'public') opts[0].classList.add('selected');
    if (vis === 'private') opts[1].classList.add('selected');
}

function saveSettings() {
    const name = document.getElementById('setting-name').value;
    const instructions = document.getElementById('setting-instructions').value;
    const isPrivate = document.getElementById('vis-private').classList.contains('selected');
    updateProject(currentProject.id, {
        name: name,
        customInstructions: instructions,
        visibility: isPrivate ? 'private' : 'public'
    });
    if (projectNameInput) projectNameInput.value = name;
    renderSidebarProjects();
    toggleSettings();
}

// --- Export Modal ---
function toggleExport() {
    if (exportModal) exportModal.classList.toggle('hidden');
}

function handleExport(type) {
    if (!lastGeneratedPlist) {
        alert('Please generate a shortcut first.');
        return;
    }

    if (type === 'publish') {
        // Set to public and save
        updateProject(currentProject.id, { visibility: 'public' });
        alert('Project published to community!');
    }

    // Always download
    downloadPlist(lastGeneratedPlist, currentProject.name);
    toggleExport();
}

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    sidebar.classList.toggle('collapsed');
}

// --- Canvas Animation (Preserved) ---
function initCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    function resize() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; }
    class Particle {
        constructor() { this.x = Math.random() * width; this.y = Math.random() * height; this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5; this.size = Math.random() * 2; }
        update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > width) this.vx *= -1; if (this.y < 0 || this.y > height) this.vy *= -1; }
        draw() { ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); }
    }
    function initParticles() { particles = []; for (let i = 0; i < 50; i++) particles.push(new Particle()); }
    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update(); p.draw();
            particles.forEach(p2 => {
                const dx = p.x - p2.x; const dy = p.y - p2.y; const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) { ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 - dist / 1500})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
            });
        });
        requestAnimationFrame(animate);
    }
    window.addEventListener('resize', resize); resize(); initParticles(); animate();
}

// --- Chat & API Logic (Preserved) ---
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    addMessageToUI('user', text);
    chatInput.value = '';
    if (currentProject) {
        currentProject.history.push({ role: 'user', content: text });
        updateProject(currentProject.id, { history: currentProject.history });
    }
    const loadingId = 'loading-' + Date.now();
    addMessageToUI('assistant', 'Thinking...', loadingId);
    try {
        const response = await fetch(`${API_ENDPOINT}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text, model: 'openai/gpt-3.5-turbo', constraints: constraints.map(c => c.value).join('\n'), context: currentProject ? currentProject.history.slice(-5) : [] })
        });
        const data = await response.json();
        const loadingMsg = document.getElementById(loadingId);
        if (data.plist) {
            loadingMsg.innerHTML = `Generated <strong>${data.name}</strong>`;
            if (currentProject) {
                currentProject.history.push({ role: 'assistant', content: `Generated ${data.name}` });
                updateProject(currentProject.id, { history: currentProject.history });
            }
            updateVisualizer(data.json);
            lastGeneratedPlist = data.plist; // Store for export
        } else { loadingMsg.textContent = 'Error: ' + (data.error || 'Unknown error'); }
    } catch (e) { document.getElementById(loadingId).textContent = 'Network Error'; }
}

function addMessageToUI(role, content, id = null) {
    const div = document.createElement('div'); div.className = `message-row ${role}`; if (id) div.id = id;
    const avatar = role === 'user' ? '👤' : '⚡️';
    div.innerHTML = `<div class="avatar">${avatar}</div><div class="message-content">${content}</div>`;
    messagesContainer.appendChild(div); messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateVisualizer(program) {
    if (!visualizerContent) return; visualizerContent.innerHTML = ''; if (!program || !program.actions) return;
    program.actions.forEach((action, index) => {
        const card = document.createElement('div'); card.className = 'action-card'; card.style.animationDelay = `${index * 0.05}s`;
        const type = action.type.split('.').pop(); const name = type.charAt(0).toUpperCase() + type.slice(1);
        card.innerHTML = `<div class="action-icon-box">⚡️</div><div class="action-details"><div class="action-name">${name}</div><div class="action-desc">${JSON.stringify(action.parameters).slice(0, 60)}...</div></div>`;
        visualizerContent.appendChild(card);
    });
}

function downloadPlist(plistContent, name) {
    const blob = new Blob([plistContent], { type: 'application/x-apple-aspen-xml' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${name}.shortcut`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// Force Actions Logic
window.showActionPicker = () => { forceMenu.classList.add('hidden'); actionPicker.classList.remove('hidden'); renderActionList(); };
function renderActionList() { actionList.innerHTML = ''; ACTIONS_DB.forEach(action => { const div = document.createElement('div'); div.className = 'action-item'; div.textContent = action.split('.').pop(); div.onclick = () => { addConstraint(action, 'action'); actionPicker.classList.add('hidden'); }; actionList.appendChild(div); }); }
function addConstraint(value, type) { constraints.push({ value, type }); renderConstraints(); }
function removeConstraint(index) { constraints.splice(index, 1); renderConstraints(); }
function renderConstraints() { activeConstraintsDiv.innerHTML = ''; constraints.forEach((c, i) => { const pill = document.createElement('div'); pill.className = 'constraint-pill'; pill.innerHTML = `<span class="type-icon">${c.type === 'action' ? '⚡️' : '📝'}</span><span class="text">${c.value.split('.').pop()}</span><span class="remove" onclick="removeConstraint(${i})">×</span>`; activeConstraintsDiv.appendChild(pill); }); }
