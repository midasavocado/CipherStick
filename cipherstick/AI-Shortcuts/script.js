// --- State ---
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
let currentProject = null;
let projects = JSON.parse(localStorage.getItem('flux_projects')) || [];
let lastGeneratedPlist = null;

// --- DOM Elements ---
const projectsView = document.getElementById('projects-view');
const workspaceView = document.getElementById('workspace-view');
const projectsGrid = document.getElementById('projects-grid');
const messagesContainer = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('btn-send');
const visualizerContent = document.getElementById('visualizer-content');
const settingsModal = document.getElementById('settings-modal');
const exportModal = document.getElementById('export-modal');
const workspaceProjectName = document.getElementById('workspace-project-name');

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Global Init
    if (window.location.pathname.includes('app.html')) {
        initApp();
    } else if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        initLanding();
    }

    // Event Listeners
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSend);
    }
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
    }
});

// --- App Logic ---
function initApp() {
    // Check for initial prompt from landing page
    const urlParams = new URLSearchParams(window.location.search);
    const initialPrompt = urlParams.get('prompt');
    const id = urlParams.get('id'); // Keep id for loading specific projects
    const isNew = urlParams.get('new'); // Keep isNew for potential welcome messages

    // Check if first login for tutorial
    const isFirstLogin = localStorage.getItem('flux_first_login') === 'true';
    const tutorialComplete = localStorage.getItem('flux_tutorial_complete') === 'true';

    if (id) {
        loadProject(id);
    } else if (initialPrompt) {
        createNewProject(initialPrompt);
    } else if (projects.length > 0) {
        showProjectsView();
    } else {
        checkOnboarding();
    }

    // Show tutorial if first login and not complete
    if (isFirstLogin && !tutorialComplete) {
        localStorage.removeItem('flux_first_login');
        setTimeout(() => {
            startTutorial();
        }, 1000);
    }

    // Load available templates (assuming this function exists elsewhere)
    loadTemplates();

    if (isNew === 'true') {
        // Maybe show a welcome message or focus input
    }
}

// --- Navigation ---
function showProjectsView() {
    workspaceView.classList.add('hidden');
    projectsView.classList.remove('hidden');
    renderProjectsGrid();

    // Hide workspace topbar controls
    const topbarControls = document.getElementById('workspace-topbar-controls');
    if (topbarControls) topbarControls.style.display = 'none';

    // Clear URL params
    window.history.replaceState({}, '', 'app.html');
    currentProject = null;
}

function showWorkspaceView() {
    projectsView.classList.add('hidden');
    workspaceView.classList.remove('hidden');

    // Show workspace topbar controls
    const topbarControls = document.getElementById('workspace-topbar-controls');
    if (topbarControls) topbarControls.style.display = 'flex';

    // Sync project name to topbar
    syncProjectName();
}

function syncProjectName() {
    const topbarName = document.getElementById('topbar-project-name');
    if (topbarName && currentProject) {
        topbarName.value = currentProject.name || 'Untitled Project';
        topbarName.addEventListener('blur', () => {
            if (currentProject) {
                currentProject.name = topbarName.value || 'Untitled Project';
                saveProjects();
            }
        });
    }
}

// --- Project Management ---
function generateProjectName() {
    const adjectives = ['Quick', 'Smart', 'Daily', 'Morning', 'Evening', 'Easy', 'Power', 'Turbo', 'Auto', 'Pro'];
    const nouns = ['Helper', 'Workflow', 'Task', 'Action', 'Flow', 'Tool', 'Assistant', 'Manager', 'Organizer', 'Builder'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective} ${noun}`;
}

function createNewProject(initialPrompt = null) {
    const id = 'proj_' + Date.now();
    const newProject = {
        id: id,
        name: generateProjectName(),
        created: Date.now(),
        updated: Date.now(),
        history: [],
        code: null
    };

    if (initialPrompt) {
        newProject.history.push({ role: 'user', content: initialPrompt });
        // In a real app, we'd trigger the AI here too
    }

    projects.unshift(newProject);
    saveProjects();
    loadProject(id);
}

function loadProject(id) {
    currentProject = projects.find(p => p.id === id);
    if (!currentProject) {
        showProjectsView();
        return;
    }

    // Update UI
    workspaceProjectName.textContent = currentProject.name;
    messagesContainer.innerHTML = '';

    // Load History
    if (currentProject.history) {
        currentProject.history.forEach(msg => addMessageToUI(msg.content, msg.role));
    } else {
        // Welcome message
        addMessageToUI("Ready to build. What's on your mind?", 'assistant');
    }

    // Update URL
    window.history.replaceState({}, '', `app.html?id=${id}`);

    showWorkspaceView();
    renderVisualizer();
}

function saveProjects() {
    localStorage.setItem('flux_projects', JSON.stringify(projects));
}

function updateProject(id, updates) {
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
        projects[idx] = { ...projects[idx], ...updates, updated: Date.now() };
        saveProjects();
        currentProject = projects[idx];

        if (updates.name) {
            workspaceProjectName.textContent = updates.name;
        }
    }
}

function deleteCurrentProject() {
    if (!currentProject) return;
    FluxUI.confirm('Are you sure you want to delete this project?', 'Delete Project', () => {
        projects = projects.filter(p => p.id !== projectId);
        localStorage.setItem('flux_projects', JSON.stringify(projects));
        renderProjectsGrid();
    });
    return;

    projects = projects.filter(p => p.id !== currentProject.id);
    saveProjects();
    toggleSettings(); // Close modal
    showProjectsView();
}

function renderProjectsGrid() {
    if (!projectsGrid) return;

    // Keep the "Create New" card
    const createCard = projectsGrid.querySelector('.new-project-card');
    projectsGrid.innerHTML = '';
    if (createCard) projectsGrid.appendChild(createCard);

    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.onclick = (e) => {
            // Prevent click if clicking actions
            if (e.target.closest('.project-actions')) return;
            loadProject(p.id);
        };

        const date = new Date(p.updated).toLocaleDateString();

        card.innerHTML = `
            <h3>${p.name}</h3>
            <div class="project-meta">
                <span>${date}</span>
                <span>${p.history ? p.history.length : 0} messages</span>
            </div>
            <div class="project-actions">
                <button class="icon-btn" onclick="deleteProjectFromGrid(event, '${p.id}')" title="Delete">🗑️</button>
            </div>
        `;

        // Insert after "Create New"
        projectsGrid.appendChild(card);
    });
}

function deleteProjectFromGrid(e, id) {
    e.stopPropagation();
    FluxUI.confirm('Delete this project and all its data?', 'Delete Project', () => {
        const projectId = currentProject.id;
        projects = projects.filter(p => p.id !== projectId);
        localStorage.setItem('flux_projects', JSON.stringify(projects));
        showProjectsView();
    });
    return;

    projects = projects.filter(p => p.id !== id);
    saveProjects();
    renderProjectsGrid();
}

// --- Chat Logic ---
function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessageToUI(text, 'user');
    chatInput.value = '';

    // Save to history
    if (currentProject) {
        if (!currentProject.history) currentProject.history = [];
        currentProject.history.push({ role: 'user', content: text });
        saveProjects();
    }

    // Simulate AI
    showTypingIndicator();
    setTimeout(() => {
        removeTypingIndicator();
        const response = "I've updated the workflow based on your request.";
        addMessageToUI(response, 'assistant');

        if (currentProject) {
            currentProject.history.push({ role: 'assistant', content: response });
            saveProjects();
        }

        renderVisualizer();
    }, 1000);
}

function addMessageToUI(text, role) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `<div class="message-bubble">${text}</div>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'message assistant typing';
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="message-bubble">Thinking...</div>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

// --- Visualizer (Base44 Vibe) ---
let currentActions = [
    { id: 1, title: 'Get Clipboard', meta: 'System Action', icon: 'clipboard' },
    { id: 2, title: 'Split Text', meta: 'Separator: New Lines', icon: 'split' },
    { id: 3, title: 'Show Alert', meta: 'Title: Results', icon: 'bell' }
];

function renderVisualizer() {
    const visualizerContent = document.getElementById('visualizer-content');
    if (!visualizerContent) {
        // Not on workspace page, silently return
        return;
    }

    visualizerContent.innerHTML = '';

    currentActions.forEach((action, index) => {
        const node = document.createElement('div');
        node.className = 'action-node';
        node.draggable = true;
        node.dataset.id = action.id;

        // Add conditional styling for If/Else
        if (action.title.toLowerCase().includes('if') || action.type === 'if_else') {
            node.classList.add('action-conditional');
        }

        node.innerHTML = `
            <span class="node-handle">⋮⋮</span>
            <div class="node-icon">${getActionIcon(action.icon)}</div>
            <div class="node-content">
                <div class="node-title">${action.title}</div>
                <div class="node-meta">${action.meta}</div>
            </div>
            <div class="node-actions">
                <button class="icon-btn-sm" onclick="editAction(${action.id})" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="icon-btn-sm" onclick="deleteAction(${action.id})" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `;

        // Drag handlers
        node.addEventListener('dragstart', handleDragStart);
        node.addEventListener('dragover', handleDragOver);
        node.addEventListener('drop', handleDrop);
        node.addEventListener('dragend', handleDragEnd);

        visualizerContent.appendChild(node);

        // Add connecting line (except for last node)
        if (index < currentActions.length - 1) {
            const line = document.createElement('div');
            line.className = 'connection-line';
            line.style.height = '2rem';
            visualizerContent.appendChild(line);
        }
    });
}

function getActionIcon(type) {
    const icons = {
        clipboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
        split: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><line x1="12" y1="15" x2="12" y2="3"/><line x1="7.5" y1="19.79" x2="16.5" y2="14.6"/><circle cx="12" cy="12" r="10"/></svg>',
        bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
        link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        database: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
        branch: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>'
    };
    return icons[type] || icons.clipboard;
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target.closest('.action-node');
    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.action-node');

    if (dropTarget && draggedElement !== dropTarget) {
        const draggedId = parseInt(draggedElement.dataset.id);
        const targetId = parseInt(dropTarget.dataset.id);

        // Reorder actions array
        const draggedIndex = currentActions.findIndex(a => a.id === draggedId);
        const targetIndex = currentActions.findIndex(a => a.id === targetId);

        const [removed] = currentActions.splice(draggedIndex, 1);
        currentActions.splice(targetIndex, 0, removed);

        renderVisualizer();
    }
}

function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
}

// --- Modals ---
function toggleSettings() {
    settingsModal.classList.toggle('active');
    if (settingsModal.classList.contains('active') && currentProject) {
        document.getElementById('setting-name').value = currentProject.name;
    }
}

function saveSettings() {
    const name = document.getElementById('setting-name').value;
    if (currentProject && name) {
        updateProject(currentProject.id, { name });
    }
}
// --- Download & Publishing ---
const WORKER_ENDPOINT = 'https://secrets.cipherstick.tech/generate';

function toggleExport() {
    toggleDownload();
}

function toggleDownload() {
    const modal = document.getElementById('download-modal');
    if (!modal) return;
    modal.classList.toggle('active');
}

function closePublishModal() {
    const modal = document.getElementById('publish-modal');
    if (modal) modal.classList.remove('active');
}

async function handleDownloadPrivate() {
    toggleDownload();

    if (!currentProject || !currentActions.length) {
        FluxUI.alert('Please add some actions to your shortcut first.', 'No Actions');
        return;
    }

    // Show generating status
    FluxUI.alert('Generating your shortcut...', 'Download');

    try {
        const result = await generateShortcut(false);
        if (result.success) {
            downloadFile(result.data, `${currentProject.name || 'Shortcut'}.shortcut`);
            FluxUI.alert('Shortcut downloaded successfully!', 'Success');
        }
    } catch (error) {
        if (isDev) console.error('Download error:', error);
        FluxUI.alert('Failed to generate shortcut. Please try again.', 'Error');
    }
}

async function handleDownloadPublish() {
    toggleDownload();

    if (!currentProject || !currentActions.length) {
        FluxUI.alert('Please add some actions to your shortcut first.', 'No Actions');
        return;
    }

    // Show publish modal
    const modal = document.getElementById('publish-modal');
    const titleInput = document.getElementById('publish-title');
    const descInput = document.getElementById('publish-description');

    // Auto-generate title and description
    titleInput.value = currentProject.name || 'My Shortcut';
    descInput.value = 'Generating description...';

    modal.classList.add('active');

    // Generate AI description in background
    generateAIDescription().then(desc => {
        if (desc) descInput.value = desc;
    }).catch(() => {
        descInput.value = 'A useful shortcut created with Flux AI.';
    });
}

async function submitPublish() {
    const titleInput = document.getElementById('publish-title');
    const descInput = document.getElementById('publish-description');
    const status = document.getElementById('publish-status');
    const statusText = document.getElementById('publish-status-text');
    const submitBtn = document.getElementById('publish-submit-btn');

    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    if (!title || !description) {
        FluxUI.alert('Please provide both title and description.', 'Missing Info');
        return;
    }

    // Show progress
    status.style.display = 'block';
    submitBtn.disabled = true;

    try {
        statusText.textContent = 'Generating shortcut...';
        const result = await generateShortcut(true, { title, description });

        if (result.success) {
            statusText.textContent = 'Signing shortcut...';
            await new Promise(resolve => setTimeout(resolve, 500));

            statusText.textContent = 'Downloading...';
            downloadFile(result.data, `${title}.shortcut`);

            statusText.textContent = 'Publishing to marketplace...';
            await publishToMarketplace({ title, description, shortcut: result.data });

            closePublishModal();
            FluxUI.alert('Shortcut published successfully!', 'Success');
        }
    } catch (error) {
        if (isDev) console.error('Publish error:', error);
        FluxUI.alert('Failed to publish shortcut. Please try again.', 'Error');
    } finally {
        status.style.display = 'none';
        submitBtn.disabled = false;
    }
}

async function generateShortcut(forPublish = false, metadata = {}) {
    const prompt = currentProject.history.map(h => h.role === 'user' ? h.content : '').filter(Boolean).join(' ');

    const payload = {
        prompt: prompt || 'Create a simple shortcut',
        name: metadata.title || currentProject.name || 'Untitled Shortcut',
        followUp: false,
        mode: 'plan'
    };

    const response = await fetch(WORKER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('Generation failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let finalData = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'final' && data.plist) {
                        finalData = data.plist;
                    }
                } catch (e) {
                    if (isDev) console.error('Parse error:', e);
                }
            }
        }
    }

    if (!finalData) {
        throw new Error('No shortcut data received');
    }

    return { success: true, data: finalData };
}

async function generateAIDescription() {
    const actions = currentActions.map(a => a.title).join(', ');

    // Simple description generation
    return `Auto-generates shortcuts using AI. Actions: ${actions}`;
}

async function publishToMarketplace(data) {
    // This would call your backend API to save to marketplace
    if (isDev) console.log('Publishing to marketplace:', data);
    return { success: true };
}

function downloadFile(data, filename) {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Onboarding ---
function checkOnboarding() {
    if (!localStorage.getItem('flux_onboarding_complete')) {
        const modal = document.getElementById('welcome-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('active');
        }
    }
}

function startOnboarding() {
    const modal = document.getElementById('welcome-modal');
    modal.classList.remove('active'); // Use active class
    localStorage.setItem('flux_onboarding_complete', 'true');

    // Create first project and open settings
    createNewProject();

    // Open settings after a short delay
    setTimeout(() => {
        toggleSettings();
        // Start tutorial after settings are closed
        const settingsCloseBtn = document.querySelector('#settings-modal .icon-btn');
        const saveBtn = document.querySelector('#settings-modal .btn-primary');

        const nextStep = () => {
            setTimeout(showTutorial, 500);
            settingsCloseBtn.removeEventListener('click', nextStep);
            saveBtn.removeEventListener('click', nextStep);
        };

        settingsCloseBtn.addEventListener('click', nextStep);
        saveBtn.addEventListener('click', nextStep);
    }, 300);
}

function skipOnboarding() {
    const modal = document.getElementById('welcome-modal');
    modal.classList.remove('active');
    localStorage.setItem('flux_onboarding_complete', 'true');
}

function showTutorial() {
    // Simple tutorial: Add a message to the chat
    addMessageToUI("👋 Welcome to your new workspace! Try typing 'Create a shortcut that logs my weight to Health' below.", 'assistant');

    // Highlight chat input
    const input = document.getElementById('chat-input');
    input.focus();
    input.parentElement.style.boxShadow = '0 0 0 4px var(--primary-color)';
    setTimeout(() => {
        input.parentElement.style.transition = 'box-shadow 1s ease';
        input.parentElement.style.boxShadow = 'none';
    }, 2000);
}

// --- New UI Controls ---
let reasoningEnabled = false;

function toggleReasoning() {
    reasoningEnabled = !reasoningEnabled;
    const btn = document.getElementById('thinking-toggle');
    if (btn) {
        btn.classList.toggle('active', reasoningEnabled);
    }
}

function toggleActionMenu() {
    const menu = document.getElementById('action-menu');
    if (!menu) {
        // Create menu if it doesn't exist
        createActionMenu();
    } else {
        menu.classList.toggle('hidden');
    }
}

function createActionMenu() {
    const menu = document.createElement('div');
    menu.id = 'action-menu';
    menu.className = 'action-menu';
    menu.innerHTML = `
        <div class="action-menu-header">
            <h4>Add Action</h4>
            <button class="icon-btn" onclick="toggleActionMenu()">×</button>
        </div>
        <div class="action-menu-search">
            <input type="text" placeholder="Search actions..." id="action-search" class="input-glass">
        </div>
        <div class="action-menu-list">
            ${getAvailableActions().map(action => `
                <div class="action-menu-item" onclick="addActionToWorkflow('${action.type}')">
                    <div class="node-icon">${getActionIcon(action.icon)}</div>
                    <div>
                        <div class="node-title">${action.title}</div>
                        <div class="node-meta">${action.description}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    document.body.appendChild(menu);
}

function getAvailableActions() {
    return [
        { type: 'clipboard', title: 'Get Clipboard', description: 'Retrieve clipboard content', icon: 'clipboard' },
        { type: 'split', title: 'Split Text', description: 'Split text by delimiter', icon: 'split' },
        { type: 'alert', title: 'Show Alert', description: 'Display an alert', icon: 'bell' },
        { type: 'get_url', title: 'Get URL', description: 'Fetch content from URL', icon: 'link' },
        { type: 'set_variable', title: 'Set Variable', description: 'Store a value', icon: 'database' },
        { type: 'if_else', title: 'If/Else', description: 'Conditional logic', icon: 'branch' }
    ];
}

function addActionToWorkflow(type) {
    const action = getAvailableActions().find(a => a.type === type);
    if (!action) return;

    const newAction = {
        id: Date.now(),
        title: action.title,
        meta: action.description,
        icon: action.icon,
        editable: true
    };

    currentActions.push(newAction);
    renderVisualizer();
    toggleActionMenu();
}

function editAction(id) {
    const action = currentActions.find(a => a.id === id);
    if (!action) return;

    // Find template if available
    const template = availableTemplates.find(t =>
        t.title.toLowerCase() === action.title.toLowerCase() ||
        t.type === action.type
    );

    if (template && template.params && Object.keys(template.params).length > 0) {
        // Multi-field editing for template parameters
        const params = template.params;
        const paramKeys = Object.keys(params).slice(0, 5); // Limit to 5 fields

        let currentValues = {};
        try {
            currentValues = action.meta ? JSON.parse(action.meta) : {};
        } catch {
            currentValues = {};
        }

        const fieldsHtml = paramKeys.map(key => {
            const value = currentValues[key] || '';
            const info = params[key];
            const label = key.replace(/([A-Z])/g, ' $1').trim();

            return `
                <div class="param-field">
                    <label>${label}</label>
                    <input type="text" id="param-${key}" value="${value}" placeholder="${typeof info === 'string' ? info : 'Enter value'}">
                    <small>${typeof info === 'string' ? info : ''}</small>
                </div>
            `;
        }).join('');

        FluxUI.prompt(
            `<div class="param-editor">
                <h4>Edit ${action.title}</h4>
                ${fieldsHtml}
            </div>`,
            '',
            'Edit Parameters',
            true // isHTML flag
        ).then(result => {
            if (result !== null) {
                // Collect values from fields
                const newParams = {};
                paramKeys.forEach(key => {
                    const input = document.getElementById(`param-${key}`);
                    if (input) newParams[key] = input.value;
                });
                action.meta = JSON.stringify(newParams);
                updateCurrentProject();
                renderVisualizer();
            }
        });
    } else {
        // Simple text editing fallback
        FluxUI.prompt(
            `Edit parameters for ${action.title}:`,
            action.meta || action.description || '',
            'Edit Action'
        ).then(newMeta => {
            if (newMeta !== null) {
                action.meta = newMeta;
                updateCurrentProject();
                renderVisualizer();
            }
        });
    }
}

function deleteAction(id) {
    FluxUI.confirm('Remove this action from the blueprint?', 'Delete Action', () => {
        currentActions = currentActions.filter(a => a.id !== id);
        renderVisualizer();
    });
}

// --- Template Loading ---
let availableTemplates = [];
let templateCache = new Map();

async function loadTemplates() {
    try {
        const response = await fetch('Templates/index.json');
        const templateList = await response.json();

        // Load first 20 templates immediately, rest lazily
        const immediateLoad = templateList.slice(0, 20);
        const lazyLoad = templateList.slice(20, 50);

        // Batch load immediate templates (4 batches of 5)
        for (let i = 0; i < immediateLoad.length; i += 5) {
            const batch = immediateLoad.slice(i, i + 5);
            const batchPromises = batch.map(async (filename) => {
                try {
                    const fileResponse = await fetch(`Templates/${filename}`);
                    const templateData = await fileResponse.json();

                    templateCache.set(filename, templateData);

                    return {
                        type: filename.replace('.json', '').toLowerCase(),
                        title: templateData.action || filename.replace('.json', '').replace(/([A-Z])/g, ' $1').trim(),
                        icon: 'clipboard',
                        description: 'Apple Shortcuts action',
                        params: templateData.params || {},
                        hasParamInfo: !!(templateData.params && typeof templateData.params === 'object'),
                        filename: filename
                    };
                } catch (e) {
                    if (isDev) console.error(`Failed to load ${filename}:`, e);
                    return null;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            availableTemplates.push(...batchResults.filter(t => t !== null));
        }

        if (isDev) console.log(`Loaded ${availableTemplates.length} templates immediately`);

        // Lazy load remaining templates in background
        setTimeout(async () => {
            for (let i = 0; i < lazyLoad.length; i += 5) {
                const batch = lazyLoad.slice(i, i + 5);
                const batchPromises = batch.map(async (filename) => {
                    try {
                        const fileResponse = await fetch(`Templates/${filename}`);
                        const templateData = await fileResponse.json();
                        templateCache.set(filename, templateData);
                        return {
                            type: filename.replace('.json', '').toLowerCase(),
                            title: templateData.action || filename.replace('.json', '').replace(/([A-Z])/g, ' $1').trim(),
                            icon: 'clipboard',
                            description: 'Apple Shortcuts action',
                            params: templateData.params || {},
                            hasParamInfo: !!(templateData.params && typeof templateData.params === 'object'),
                            filename: filename
                        };
                    } catch (e) {
                        return null;
                    }
                });
                const batchResults = await Promise.all(batchPromises);
                availableTemplates.push(...batchResults.filter(t => t !== null));
            }
            if (isDev) console.log(`Total templates loaded: ${availableTemplates.length}`);
        }, 1000);

    } catch (e) {
        if (isDev) console.error('Failed to load templates:', e);
        // Fallback to basic templates
        availableTemplates = getAvailableActionsOriginal();
    }
}

// Override getAvailableActions to include templates
function getAvailableActionsOriginal() {
    return [
        { type: 'clipboard', title: 'Get Clipboard', description: 'Retrieve clipboard content', icon: 'clipboard' },
        { type: 'split', title: 'Split Text', description: 'Split text by delimiter', icon: 'split' },
        { type: 'alert', title: 'Show Alert', description: 'Display an alert', icon: 'bell' },
        { type: 'get_url', title: 'Get URL', description: 'Fetch content from URL', icon: 'link' },
        { type: 'set_variable', title: 'Set Variable', description: 'Store a value', icon: 'database' },
        { type: 'if_else', title: 'If/Else', description: 'Conditional logic', icon: 'branch' }
    ];
}

// Now use templates if available
function getAvailableActions() {
    if (availableTemplates.length > 0) {
        return availableTemplates.slice(0, 50); // Limit to 50 for performance
    }
    return getAvailableActionsOriginal();
}

// --- Tutorial System ---
function startTutorial() {
    FluxUI.tutorial.start([
        {
            target: '#chat-input',
            title: 'Chat Input',
            message: 'Describe what you want your shortcut to do in natural language. Our AI will generate the actions for you.'
        },
        {
            target: '.visualizer-header button[title="Add Action"]',
            title: 'Force Action',
            message: 'Click here to manually add actions from our library of 100+ Apple Shortcuts templates.'
        },
        {
            target: '#visualizer-content',
            title: 'Blueprint',
            message: 'Your shortcut blueprint appears here. Drag actions to reorder them, and click to edit parameters.'
        },
        {
            target: '.visualizer-header button[title="Discuss"]',
            title: 'Discuss',
            message: 'Have questions or need help? Click here to discuss your shortcut with our AI assistant.'
        }
    ]);
}

// --- Discuss Functionality ---
function toggleDiscuss() {
    FluxUI.alert('Discuss feature coming soon! This will let you chat with AI about your shortcut in detail.', 'Discuss');
}

// --- Force Action Menu ---
function toggleForceMenu() {
    const menu = document.getElementById('force-menu');
    if (!menu) return;

    if (menu.style.display === 'none') {
        menu.style.display = 'block';
        // Close when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeForceMenuOutside);
        }, 0);
    } else {
        menu.style.display = 'none';
        document.removeEventListener('click', closeForceMenuOutside);
    }
}

function closeForceMenuOutside(e) {
    const menu = document.getElementById('force-menu');
    const btn = document.getElementById('force-menu-btn');
    if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeForceMenuOutside);
    }
}

function showProUpgrade(featureName) {
    FluxUI.alert(`${featureName} is a Pro feature. Upgrade to unlock manual action control and advanced AI reasoning.`, 'Upgrade to Pro');
    toggleForceMenu();
}

// --- Landing Page ---
function initLanding() {
    // Just simple redirects for now
}

