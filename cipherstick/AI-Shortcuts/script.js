// --- State ---
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
let currentProject = null;
let projects = JSON.parse(localStorage.getItem('flux_projects')) || [];
let lastGeneratedPlist = null;
let currentActions = [];
let reasoningEnabled = false;
let chatMode = 'normal'; // normal, thinking, discussion, force
const PLAN_KEY = 'flux_plan';
const PLAN_FREE = 'free';
const PLAN_PAID = 'paid';
let currentPlan = localStorage.getItem(PLAN_KEY) || PLAN_FREE;

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
const workspaceProjectName = document.getElementById('topbar-project-name') || document.getElementById('project-name-input');

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Global Init
    if (window.location.pathname.includes('app.html') || window.location.pathname.includes('workspace.html')) {
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

// --- Plan Helpers ---
function setPlan(plan) {
    currentPlan = plan === PLAN_PAID ? PLAN_PAID : PLAN_FREE;
    localStorage.setItem(PLAN_KEY, currentPlan);
    if (typeof FluxUI !== 'undefined' && FluxUI.toast) {
        FluxUI.toast(`Plan set to ${currentPlan === PLAN_PAID ? 'Paid' : 'Free'}`);
    }
}

function getPlan() {
    return currentPlan;
}

function isPaidPlan() {
    return currentPlan === PLAN_PAID;
}

// --- App Logic ---
function initApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const initialPrompt = urlParams.get('prompt');
    const id = urlParams.get('id');
    const hasWorkspaceView = projectsView && workspaceView;

    if (id) {
        loadProject(id);
    } else if (initialPrompt) {
        createNewProject(initialPrompt);
    } else {
        renderProjectsGrid();
        if (hasWorkspaceView) {
            showProjectsView();
        }
        checkOnboarding();
    }
    checkAuth();
    initResizeHandle();

    // Motivational Easter Egg

}

// --- Navigation ---
function showProjectsView() {
    if (!projectsView || !workspaceView) return;
    workspaceView.classList.add('hidden');
    projectsView.classList.remove('hidden');
}

function showWorkspaceView() {
    if (!projectsView || !workspaceView) return;
    projectsView.classList.add('hidden');
    workspaceView.classList.remove('hidden');
}

function syncProjectName() {
    const topbarName = workspaceProjectName;
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
        actions: [],
        code: null
    };

    if (initialPrompt) {
        newProject.history.push({ role: 'user', content: initialPrompt });
        // In a real app, we'd trigger the AI here too
    }

    // Show loading modal
    const loadingModal = document.getElementById('loading-modal');
    if (loadingModal) {
        loadingModal.classList.add('active');
        const titles = ['Spinning up instance...', 'Allocating resources...', 'Securing workspace...', 'Ready!'];
        const titleEl = document.getElementById('loading-title');
        let i = 0;

        const interval = setInterval(() => {
            if (i < titles.length && titleEl) {
                titleEl.textContent = titles[i];
                i++;
            }
        }, 800);

        setTimeout(() => {
            clearInterval(interval);
            loadingModal.classList.remove('active');

            projects.unshift(newProject);
            saveProjects();

            // Load the new project or navigate to the workspace view
            loadProject(id);
        }, 2500);
    } else {
        projects.unshift(newProject);
        saveProjects();

        loadProject(id);
    }
}

function loadProject(id) {
    currentProject = projects.find(p => p.id === id);

    if (!currentProject) {
        // Project not found, go back to projects grid if available
        renderProjectsGrid();
        currentActions = [];
        renderVisualizer();
        if (projectsView && workspaceView) showProjectsView();
        return;
    }

    if (!currentProject.actions) currentProject.actions = [];
    currentActions = [...currentProject.actions];

    // Update UI
    if (workspaceProjectName) workspaceProjectName.value = currentProject.name;
    if (messagesContainer) messagesContainer.innerHTML = '';

    // Load History
    if (currentProject.history && messagesContainer) {
        currentProject.history.forEach(msg => addMessageToUI(msg.content, msg.role));
    } else {
        // Welcome message
        addMessageToUI("Ready to build. What's on your mind?", 'assistant');
    }

    if (projectsView && workspaceView) showWorkspaceView();

    // Update URL if not already set
    const path = window.location.pathname.split('/').pop() || 'app.html';
    const targetPath = path.includes('app.html') || path.includes('workspace.html') ? path : 'app.html';
    if (!window.location.search.includes(id)) {
        window.history.replaceState({}, '', `${targetPath}?id=${id}`);
    }

    syncProjectName();
    renderVisualizer();
}

function saveProjects() {
    localStorage.setItem('flux_projects', JSON.stringify(projects));
}

function syncActionsToProject() {
    if (!currentProject) return;
    currentProject.actions = [...currentActions];
    saveProjects();
}

function updateProject(id, updates) {
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
        projects[idx] = { ...projects[idx], ...updates, updated: Date.now() };
        saveProjects();
        currentProject = projects[idx];

        if (updates.name && workspaceProjectName) {
            workspaceProjectName.value = updates.name;
        }
    }
}

function deleteCurrentProject() {
    if (!currentProject) return;
    FluxUI.confirm('Are you sure you want to delete this project?', 'Delete Project', () => {
        projects = projects.filter(p => p.id !== currentProject.id);
        saveProjects();
        window.location.href = 'app.html';
    });
}

function deleteProjectFromGrid(event, id) {
    event.stopPropagation(); // Prevent opening project
    FluxUI.confirm('Are you sure you want to delete this project?', 'Delete Project', () => {
        projects = projects.filter(p => p.id !== id);
        saveProjects();
        renderProjectsGrid();
    });
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
        const actionCount = p.actions ? p.actions.length : 0;

        card.innerHTML = `
            <h3>${p.name}</h3>
            <div class="project-meta">
                <span>${date}</span>
                <span>${actionCount} actions</span>
            </div>
            <div class="project-actions">
                <button class="icon-btn" onclick="deleteProjectFromGrid(event, '${p.id}')" title="Delete" style="color: #EF4444;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;

        // Insert after "Create New"
        projectsGrid.appendChild(card);
    });
}



// --- Chat Modes ---
function setChatMode(mode) {
    if (mode === 'thinking' && !isPaidPlan()) {
        toggleChatMenu();
        if (typeof FluxUI !== 'undefined' && FluxUI.alert) {
            FluxUI.alert('Thinking mode is a paid feature. Upgrade to access advanced reasoning.', 'Upgrade to Pro');
        }
        return;
    }
    chatMode = mode;
    toggleChatMenu(); // Close menu

    // Visual feedback on the input placeholder
    const input = document.getElementById('chat-input');
    if (input) {
        input.placeholder = 'Describe your shortcut...';
        input.style.borderColor = mode === 'force' ? '#EF4444' : 'var(--border-color)';
    }
}

// --- Command Palette (Force Action) ---
function openCommandPalette() {
    toggleChatMenu(); // Close menu
    const modal = document.getElementById('command-palette-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    const searchInput = document.getElementById('command-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        searchInput.oninput = (e) => renderCommandList(e.target.value);
    }

    // Load templates if not loaded
    if (!availableTemplates || availableTemplates.length === 0) {
        loadTemplates().then(() => renderCommandList());
    } else {
        renderCommandList();
    }
}

function closeCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    if (modal) modal.classList.add('hidden');
}

function renderCommandList(filter = '') {
    const list = document.getElementById('command-list');
    if (!list) return;

    list.innerHTML = '';

    const term = filter.toLowerCase();
    // Use availableTemplates or fallback
    const templates = availableTemplates.length > 0 ? availableTemplates : [
        { action: 'If', params: {} },
        { action: 'Repeat', params: {} },
        { action: 'Ask.ForInput', params: {} },
        { action: 'ShowResult', params: {} },
        { action: 'OpenURL', params: {} }
    ]; // Fallback if load fails

    const filtered = templates.filter(t => {
        const name = t.action || t.name || '';
        return name.toLowerCase().includes(term);
    });

    filtered.forEach(t => {
        const name = t.action || t.name;
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.style.justifyContent = 'space-between';
        item.style.padding = '0.8rem';
        item.style.border = '1px solid var(--border-color)';
        item.style.borderRadius = '8px';

        item.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="step-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--primary-color);">
                    ${getActionIcon(name)}
                </div>
                <span>${name}</span>
            </div>
            <button class="btn btn-sm btn-secondary">Add</button>
        `;

        item.onclick = () => forceAction(t);
        list.appendChild(item);
    });
}

function forceAction(template) {
    // Add the action immediately
    const newAction = {
        id: Date.now(),
        title: template.action || template.name,
        icon: template.action || template.name,
        meta: 'Added via Force Action',
        params: template.params || {}
    };

    currentActions.push(newAction);
    syncActionsToProject();
    renderVisualizer();
    closeCommandPalette();

    // Optional: Add a system message saying it was added
    addMessageToUI(`Forced action: ${newAction.title}`, 'assistant');
}

// --- Chat Logic ---
function handleSend() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    if (chatMode === 'thinking' && !isPaidPlan()) {
        setChatMode('normal');
        return;
    }

    addMessageToUI(text, 'user');
    chatInput.value = '';

    // Save to history
    if (currentProject) {
        if (!currentProject.history) currentProject.history = [];
        currentProject.history.push({ role: 'user', content: text });
        saveProjects();
    }

    // Simulate AI based on Mode
    showTypingIndicator();

    // Delay based on mode (Reasoning takes longer)
    const delay = chatMode === 'thinking' ? 2500 : 1000;

    setTimeout(() => {
        removeTypingIndicator();

        let response = "";
        let actionsChanged = false;

        if (chatMode === 'thinking') {
            response = "I've analyzed your request and optimized the logic. I've added the necessary actions to handle edge cases.";
            // Actually add some dummy actions if empty
            if (currentActions.length === 0) {
                currentActions = [
                    { id: Date.now(), title: 'Comment', icon: 'Comment', meta: 'Generated by Reasoning', params: { Text: 'Logic optimized' } }
                ];
                actionsChanged = true;
            }
        } else if (chatMode === 'discussion') {
            response = "That sounds like a good plan. Before I build it, should we handle errors gracefully, or just stop if something fails?";
        } else {
            // Standard
            response = getAIResponse(text);
        }

        addMessageToUI(response, 'assistant');

        if (currentProject) {
            if (!currentProject.history) currentProject.history = [];
            currentProject.history.push({ role: 'assistant', content: response });
            if (actionsChanged) {
                syncActionsToProject();
            } else {
                saveProjects();
            }
        }

        renderVisualizer();
    }, delay);
}

function getAIResponse(text) {
    if (chatMode === 'force') {
        return 'Executing command immediately. Workflow updated.';
    }
    if (reasoningEnabled || chatMode === 'thinking') {
        return 'Analyzing request... Logic structure optimized. I have added the necessary actions.';
    }
    return "I've updated the workflow based on your request.";
}

function addMessageToUI(text, role) {
    if (!messagesContainer) return;
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `<div class="message-bubble">${text}</div>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
    if (!messagesContainer) return;
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
// currentActions handled
// availableTemplates handled


// --- Sidebar Resize ---
function initResizeHandle() {
    const sidebar = document.getElementById('sidebar-left');
    const handle = document.getElementById('sidebar-resize-handle');

    if (!sidebar || !handle) return;

    let isResizing = false;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        handle.classList.add('active');
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        let newWidth = e.clientX;
        if (newWidth < 280) newWidth = 280;
        if (newWidth > 600) newWidth = 600;
        sidebar.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        handle.classList.remove('active');
        document.body.style.cursor = 'default';
    });
}

// --- Chat Menu ---
function toggleChatMenu() {
    const menu = document.getElementById('chat-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('chat-menu');
    const btn = e.target.closest('.chat-input-actions button');
    if (menu && menu.style.display === 'block' && !menu.contains(e.target) && !btn) {
        menu.style.display = 'none';
    }
});


function renderVisualizer() {
    const visualizerContent = document.getElementById('visualizer-content');
    if (!visualizerContent) {
        // Not on workspace page, silently return
        return;
    }

    visualizerContent.innerHTML = '';

    if (currentActions.length === 0) {
        visualizerContent.innerHTML = `
            <div class="zero-state fade-in" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">✨</div>
                <h3>Start Building</h3>
                <p>Describe your shortcut in the chat to get started.</p>
            </div>
        `;
        return;
    }

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

    const dropTarget = e.target.closest('.action-node');
    if (dropTarget && draggedElement && dropTarget !== draggedElement) {
        // Visual reordering preview
        const container = document.getElementById('visualizer-content');
        const children = Array.from(container.children).filter(c => c.classList.contains('action-node'));
        const draggedIndex = children.indexOf(draggedElement);
        const targetIndex = children.indexOf(dropTarget);

        if (draggedIndex < targetIndex) {
            container.insertBefore(draggedElement, dropTarget.nextSibling);
        } else {
            container.insertBefore(draggedElement, dropTarget);
        }

        // Update lines (simple redraw or just hide them during drag)
        // For now, let's just let the drop handler finalize the data model.
    }
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

        syncActionsToProject();
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
    if (!settingsModal) return;
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
const WORKER_ENDPOINT = 'https://secrets.mwsaulsbury.workers.dev/generate';

function toggleExport() {
    toggleDownload();
}

function toggleDownload() {
    const modal = document.getElementById('download-modal');
    if (!modal) return;
    modal.classList.toggle('active');
}

function checkDownloadLimit() {
    const today = new Date().toDateString();
    let usage = JSON.parse(localStorage.getItem('flux_daily_usage')) || { date: today, count: 0 };

    if (usage.date !== today) {
        usage = { date: today, count: 0 };
    }

    if (usage.count >= 5) {
        FluxUI.alert('You have reached your daily limit of 5 downloads. Please upgrade to Pro for unlimited access.', 'Limit Reached');
        return false;
    }

    usage.count++;
    localStorage.setItem('flux_daily_usage', JSON.stringify(usage));
    return true;
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

    // Free Tier Limit Check
    if (!checkDownloadLimit()) {
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
    const model = isPaidPlan() ? 'grok-4.1-fast' : 'openai/gpt-oss-120b:free';
    if (isDev) {
        console.log(`[Flux] Using model: ${model} (plan: ${getPlan()})`);
    }

    const payload = {
        prompt: prompt || 'Create a simple shortcut',
        name: metadata.title || currentProject.name || 'Untitled Shortcut',
        followUp: false,
        mode: 'plan',
        model,
        plan: getPlan()
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
    if (!input || !input.parentElement) return;
    input.focus();
    input.parentElement.style.boxShadow = '0 0 0 4px var(--primary-color)';
    setTimeout(() => {
        input.parentElement.style.transition = 'box-shadow 1s ease';
        input.parentElement.style.boxShadow = 'none';
    }, 2000);
}

// --- New UI Controls ---
function toggleReasoning() {
    if (!isPaidPlan()) {
        if (typeof FluxUI !== 'undefined' && FluxUI.alert) {
            FluxUI.alert('Thinking mode is a paid feature. Upgrade to Pro to enable it.', 'Upgrade Required');
        }
        reasoningEnabled = false;
        return;
    }
    reasoningEnabled = !reasoningEnabled;
    const btn = document.getElementById('thinking-toggle');
    if (btn) {
        btn.classList.toggle('active', reasoningEnabled);
    }
}

// --- Auth & Profile ---
function checkAuth() {
    const isLoggedIn = localStorage.getItem('flux_logged_in');
    const profileContainers = document.querySelectorAll('.user-profile');

    profileContainers.forEach(container => {
        if (isLoggedIn) {
            container.innerHTML = `
                <div class="profile-menu-wrapper" style="position: relative;">
                    <button class="icon-btn" onclick="toggleProfileMenu(this)" style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-color); color: white; font-weight: bold; display: flex; align-items: center; justify-content: center;">
                        M
                    </button>
                    <div class="dropdown-menu" id="profile-menu" style="display: none; right: 0; left: auto; min-width: 150px; position: absolute; top: 100%; margin-top: 0.5rem; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 100;">
                        <div class="dropdown-item" onclick="window.location.href='settings.html'" style="padding: 0.8rem 1rem; cursor: pointer; transition: background 0.2s;">Settings</div>
                        <div class="dropdown-item" onclick="handleLogout()" style="padding: 0.8rem 1rem; cursor: pointer; transition: background 0.2s; border-top: 1px solid var(--border-color);">Sign Out</div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `<a href="login.html" class="btn btn-primary-sm">Sign In</a>`;
        }
    });
}

function toggleProfileMenu(btn) {
    const wrapper = btn.closest('.profile-menu-wrapper');
    const menu = wrapper.querySelector('.dropdown-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

        // Close when clicking outside
        const closeMenu = (e) => {
            if (!e.target.closest('.profile-menu-wrapper')) {
                menu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
}

function handleLogout() {
    localStorage.removeItem('flux_logged_in');
    window.location.href = 'index.html';
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
    syncActionsToProject();
    renderVisualizer();
    toggleActionMenu();
}

function editAction(id) {
    const action = currentActions.find(a => a.id === id);
    if (!action) return;

    // Find template if available
    // Match by title or filename (often title is "Get Clipboard" but file is "Getclipboard.json")
    // We need a fuzzy match or exact match on a property.
    // Assuming template has a 'name' or 'title' field.
    const template = availableTemplates.find(t =>
        (t.name && t.name.toLowerCase() === action.title.toLowerCase()) ||
        (t.title && t.title.toLowerCase() === action.title.toLowerCase())
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
                    <input type="text" id="param-${key}" value="${value}" placeholder="${typeof info === 'string' ? info : 'Enter value'}" class="input-glass">
                    ${typeof info === 'string' ? `<small style="color: var(--text-muted); font-size: 0.8em;">${info}</small>` : ''}
                </div>
            `;
        }).join('');

        FluxUI.modal(`
            <div class="edit-action-form">
                ${fieldsHtml}
                <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <button class="btn" onclick="FluxUI.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveAction(${action.id}, ['${paramKeys.join("','")}'])">Save Changes</button>
                </div>
            </div>
        `, `Edit ${action.title}`);
    } else {
        // Simple text editing fallback
        FluxUI.modal(`
            <div class="edit-action-form">
                <div class="param-field">
                    <label>Metadata</label>
                    <input type="text" id="action-meta" value="${action.meta || ''}" class="input-glass">
                </div>
                <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <button class="btn" onclick="FluxUI.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveAction(${action.id})">Save Changes</button>
                </div>
            </div>
        `, `Edit ${action.title}`);
    }
}

function saveAction(id, keys = []) {
    const action = currentActions.find(a => a.id === id);
    if (!action) return;

    if (keys.length > 0) {
        // Multi-param save
        const newMeta = {};
        keys.forEach(key => {
            const input = document.getElementById(`param-${key}`);
            if (input) newMeta[key] = input.value;
        });
        action.meta = JSON.stringify(newMeta);
    } else {
        // Simple save
        const input = document.getElementById('action-meta');
        if (input) action.meta = input.value;
    }

    syncActionsToProject();
    renderVisualizer();
    FluxUI.closeModal();
    FluxUI.alert('Action updated successfully', 'Saved');
}

function deleteAction(id) {
    FluxUI.confirm('Remove this action from the blueprint?', 'Delete Action', () => {
        currentActions = currentActions.filter(a => a.id !== id);
        syncActionsToProject();
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
                    if (isDev) console.error(`Failed to load ${filename}: `, e);
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
            if (isDev) console.log(`Total templates loaded: ${availableTemplates.length} `);
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
// --- Discuss Functionality ---
function toggleDiscuss() {
    if (chatMode === 'discussion') {
        setChatMode('normal');
        FluxUI.toast('Exited Discussion Mode');
    } else {
        setChatMode('discussion');
        FluxUI.toast('Entered Discussion Mode');
        const intro = "I'm here to discuss your shortcut. What questions do you have or what ideas would you like to brainstorm?";
        addMessageToUI(intro, 'assistant');
        if (currentProject) {
            if (!currentProject.history) currentProject.history = [];
            currentProject.history.push({ role: 'assistant', content: intro });
            saveProjects();
        }
    }
}

// --- Marketplace Search ---
function searchMarketplace(query) {
    const cards = document.querySelectorAll('.market-card');
    const lowerQuery = query.toLowerCase();

    cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const desc = card.querySelector('p').textContent.toLowerCase();
        if (title.includes(lowerQuery) || desc.includes(lowerQuery)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
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
    FluxUI.alert(`${featureName} is a Pro feature.Upgrade to unlock manual action control and advanced AI reasoning.`, 'Upgrade to Pro');
    toggleForceMenu();
}

// --- Landing Page ---
function initLanding() {
    // Scroll Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    // Observe elements with .fade-in class
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });

    // Also observe cards for staggered animation
    document.querySelectorAll('.b44-card').forEach((el, index) => {
        el.classList.add('fade-in');
        el.style.transitionDelay = `${index * 100}ms`; // Stagger effect
        observer.observe(el);
    });
}

function fillInput(text) {
    const input = document.getElementById('hero-input');
    if (input) {
        input.value = text;
        input.focus();
    }
}
