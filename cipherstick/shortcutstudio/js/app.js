// ============ ShortcutStudio App - Main Bundle ============
// This file contains all app logic. Will be modularized later.
// Version: 2025-12-31
console.log('[App] Loading ShortcutStudio...');

const STORAGE_PREFIX = 'shortcutstudio';
const LEGACY_STORAGE_PREFIX = String.fromCharCode(102, 108, 117, 120);

function storageKey(suffix) {
    return `${STORAGE_PREFIX}_${suffix}`;
}

function legacyStorageKey(suffix) {
    return `${LEGACY_STORAGE_PREFIX}_${suffix}`;
}

function getStoredValue(suffix) {
    const key = storageKey(suffix);
    const cached = localStorage.getItem(key);
    if (cached !== null) return cached;
    const legacyValue = localStorage.getItem(legacyStorageKey(suffix));
    if (legacyValue !== null) {
        localStorage.setItem(key, legacyValue);
        return legacyValue;
    }
    return null;
}

function setStoredValue(suffix, value) {
    localStorage.setItem(storageKey(suffix), value);
}

function parseStoredJson(suffix, fallback) {
    const raw = getStoredValue(suffix);
    if (raw == null) return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}


function getMarketplaceItems() {
    return parseStoredJson('marketplaceItems', []);
}

function saveMarketplaceItems(items) {
    setStoredValue('marketplaceItems', JSON.stringify(items));
}

function upsertMarketplaceItemFromProject(project) {
    if (!project || !project.id) return;
    const items = Array.isArray(getMarketplaceItems()) ? getMarketplaceItems() : [];
    const next = {
        id: project.id,
        name: getProjectDisplayName(project),
        description: project.description || project.summary || '',
        icon: project.icon || DEFAULT_PROJECT_ICON,
        downloads: Number(project.downloads || 0),
        upvotes: Number(project.upvotes || 0),
        updated: project.updated || Date.now(),
    };
    const idx = items.findIndex((item) => item.id === project.id);
    if (idx >= 0) items[idx] = { ...items[idx], ...next };
    else items.unshift(next);
    saveMarketplaceItems(items);
}

// ============ State ============
let currentProject = null;
let projects = parseStoredJson('projects', []);
let chatMode = 'standard'; // 'standard', 'discussion'
let availableTemplates = [];
let currentActions = [];
let currentProgramObj = null;
let currentExportCache = null;
let isGenerating = false;
let editMode = false;
let forcedActions = [];
let undoStack = [];
let redoStack = [];
let isRestoringHistory = false;
const MAX_HISTORY_STATES = 80;
let reorderState = null;
let reorderListenersAttached = false;
let animationsEnabled = getStoredValue('animations') !== 'disabled';
let contextMenuTarget = null;
let richInputSelection = null;
let tutorialStep = 0;
let hasCompletedTutorial = getStoredValue('tutorial_done') === 'true';
const DEFAULT_CONDITION_OPTIONS = 'Is/Is Not/Has Any Value/Does Not Have Any Value/Contains/Does Not Contain/Begins With/Ends With/Is Greater Than/Is Greater Than Or Equal To/Is Less Than/Is Less Than Or Equal To';
let liveHintTimer = null;
let liveHintIndex = 0;
let liveHintLockUntil = 0;
let pipelineMode = 'default';
let projectSelectionMode = false;
let selectedProjectIds = new Set();
let lastPartialProgramActions = null;
let streamingSummaryMessage = null;
let streamingThinkingMessage = null;
let streamingJsonBuffer = '';
let streamingJsonActive = false;
let streamingJsonMeta = { name: '', summary: '', shortSummary: '', icon: '' };
let streamingJsonLastActionCount = 0;
let streamingJsonLastParsedLength = 0;

const DEFAULT_PROJECT_ICON = 'bolt';
const DEFAULT_PROJECT_COLOR = '#3b82f6';
const PROJECT_NAME_MAX = 25;
const PROJECT_DESCRIPTION_MAX = 110;
const PROJECT_ICON_IDS = [
    'bolt', 'star', 'wand', 'doc', 'music', 'photo', 'video', 'mic',
    'calendar', 'clock', 'check', 'chat', 'gear', 'map', 'bell', 'spark',
    'folder', 'link', 'globe', 'home', 'camera', 'list', 'shield',
    'heart', 'bookmark', 'repeat', 'wifi', 'sun', 'moon', 'lock', 'key',
    'tag', 'mail', 'phone', 'clipboard',
];

// Icons are now imported from js/icons.js
// Use PROJECT_ICON_SVGS which is defined in js/icons.js

function getProjectIconSvg(iconId) {
    return PROJECT_ICON_SVGS[iconId] || PROJECT_ICON_SVGS[DEFAULT_PROJECT_ICON];
}

function isValidProjectIcon(iconId) {
    return Boolean(PROJECT_ICON_SVGS[iconId]);
}

function isValidProjectColor(color) {
    if (!color || typeof color !== 'string') return false;
    // Support hex colors: #RGB or #RRGGBB
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(59, 130, 246, ${alpha})`;
    hex = hex.replace('#', '');
    let r, g, b;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeProjectMetadata(project) {
    if (!project || typeof project !== 'object') return;
    if (typeof project.name !== 'string') project.name = '';
    if (project.description == null && typeof project.summary === 'string') {
        project.description = project.summary;
    }
    if (typeof project.description !== 'string') project.description = String(project.description || '');
    if (!project.icon) project.icon = DEFAULT_PROJECT_ICON;
    if (!project.color) project.color = DEFAULT_PROJECT_COLOR;
    if (typeof project.nameFrozen !== 'boolean') project.nameFrozen = false;
    if (typeof project.descriptionFrozen !== 'boolean') project.descriptionFrozen = false;
    if (typeof project.colorFrozen !== 'boolean') project.colorFrozen = false;
    if (typeof project.iconFrozen !== 'boolean') project.iconFrozen = false;
}

function getProjectDisplayName(project) {
    const name = String(project?.name || '').trim();
    return name || 'Untitled Project';
}

function getPageMode() {
    return document.body?.dataset?.page || '';
}

function isProjectsPage() {
    return getPageMode() === 'projects';
}

function isWorkspacePage() {
    return getPageMode() === 'workspace';
}

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initTheme();
    initResizeHandle();
    loadTemplates();
    initEventListeners();
    
    // Warn before leaving/refreshing page during generation
    window.addEventListener('beforeunload', (e) => {
        if (isGenerating) {
            e.preventDefault();
            // Modern browsers ignore custom messages but still show a generic dialog
            return 'Your shortcut is still being generated. Are you sure you want to leave?';
        }
    });
});

function initApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    const initialPrompt = urlParams.get('prompt');
    if (projectId) {
        loadProject(projectId);
    } else if (initialPrompt) {
        createNewProject(initialPrompt);
    } else if (isProjectsPage()) {
        showProjectsView();
    } else if (isWorkspacePage()) {
        showProjectsView();
    } else {
        showProjectsView();
    }
    if (urlParams.has('tutorial')) {
        setTimeout(() => startTutorial(), 1000);
    }
}

function initEventListeners() {
    document.getElementById('chat-input')?.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    document.getElementById('chat-input')?.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // UI Event Listeners
    document.getElementById('top-download-btn')?.addEventListener('click', openDownloadModal);
    document.querySelector('.user-profile-btn')?.addEventListener('click', toggleProfileMenu);

    // Profile Menu
    document.getElementById('menu-item-settings')?.addEventListener('click', () => window.location.href = 'settings.html');
    document.getElementById('menu-item-pricing')?.addEventListener('click', () => window.location.href = 'pricing.html');
    document.getElementById('menu-item-theme')?.addEventListener('click', toggleTheme);
    document.getElementById('menu-item-animations')?.addEventListener('click', toggleAnimations);
    document.getElementById('menu-item-tutorial')?.addEventListener('click', startTutorial);

    // Project Grid
    document.getElementById('create-project-card')?.addEventListener('click', () => createNewProject());
    document.getElementById('projects-select-toggle')?.addEventListener('click', toggleProjectSelectionMode);
    document.getElementById('projects-select-all')?.addEventListener('click', selectAllProjects);
    document.getElementById('projects-delete-selected')?.addEventListener('click', deleteSelectedProjects);

    // Workspace Actions
    document.getElementById('back-to-projects-btn')?.addEventListener('click', showProjectsView);
    document.getElementById('plus-menu-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlusMenu();
    });
    document.getElementById('send-btn')?.addEventListener('click', handleSend);
    window.addEventListener('resize', updateChatEmptyState);

    // Preview Toolbar
    document.getElementById('add-action-btn')?.addEventListener('click', handleAddActionClick);
    document.getElementById('edit-btn')?.addEventListener('click', toggleEditMode);
    document.getElementById('project-edit-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openProjectSettingsModal();
    });
    document.getElementById('mobile-project-edit-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openProjectSettingsModal();
    });
    document.getElementById('project-settings-save-btn')?.addEventListener('click', saveProjectSettings);
    renderProjectIconOptions();

    // Download Options
    document.getElementById('download-publish-btn')?.addEventListener('click', () => executeDownload('publish'));
    document.getElementById('download-raw-btn')?.addEventListener('click', () => executeDownload('raw'));
    document.getElementById('mobile-card-inspect-btn')?.addEventListener('click', openMobilePreview);
    document.getElementById('mobile-card-download-btn')?.addEventListener('click', openDownloadModal);
    document.getElementById('mobile-preview-close-btn')?.addEventListener('click', closeMobilePreview);
    document.getElementById('project-name-input')?.addEventListener('blur', function () {
        if (!currentProject) return;
        normalizeProjectMetadata(currentProject);
        const nextName = this.value.trim().slice(0, PROJECT_NAME_MAX);
        const previousName = currentProject.name || '';
        this.value = nextName;
        if (nextName !== previousName) {
            pushUndoState();
            currentProject.name = nextName;
            if (!currentProject.nameFrozen) currentProject.nameFrozen = true;
            currentProject.updated = Date.now();
            upsertMarketplaceItemFromProject(currentProject);
            saveProjects();
            updateMobileShortcutCard();
        }
    });
    document.getElementById('mobile-project-name-input')?.addEventListener('blur', function () {
        if (!currentProject) return;
        normalizeProjectMetadata(currentProject);
        const nextName = this.value.trim().slice(0, PROJECT_NAME_MAX);
        const previousName = currentProject.name || '';
        this.value = nextName;
        if (nextName !== previousName) {
            pushUndoState();
            currentProject.name = nextName;
            if (!currentProject.nameFrozen) currentProject.nameFrozen = true;
            currentProject.updated = Date.now();
            upsertMarketplaceItemFromProject(currentProject);
            saveProjects();
            document.getElementById('project-name-input').value = nextName;
            updateMobileShortcutCard();
        }
    });
    document.getElementById('mobile-project-name-input')?.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#plus-menu') && !e.target.closest('#plus-menu-btn')) {
            document.getElementById('plus-menu')?.classList.remove('active');
            document.getElementById('plus-menu-btn')?.classList.remove('active');
        }
        if (!e.target.closest('#profile-dropdown')) {
            document.getElementById('profile-menu')?.classList.remove('active');
        }
    });
    document.getElementById('chat-input')?.addEventListener('input', updateMarkdownPreview);

    document.addEventListener('keydown', (e) => {
        if (!currentProject) return;
        const key = String(e.key || '').toLowerCase();
        const isModifier = e.metaKey || e.ctrlKey;
        if (!isModifier || e.altKey) return;
        const target = e.target;
        if (target?.closest && target.closest('input, textarea, select, [contenteditable="true"]')) {
            return;
        }
        if (key === 'z') {
            e.preventDefault();
            if (e.shiftKey) redoWorkspace();
            else undoWorkspace();
            return;
        }
        if (key === 'y') {
            e.preventDefault();
            redoWorkspace();
        }
    });

    updateUndoRedoButtons();
}

function handleAddActionClick() {
    if (!editMode) {
        toggleEditMode();
    }
    openAddActionModal();
}

function initTheme() {
    if (!getStoredValue('theme')) {
        document.body.classList.add('mode-dark');
        setStoredValue('theme', 'dark');
    } else {
        const theme = getStoredValue('theme');
        document.body.classList.toggle('mode-dark', theme === 'dark');
    }
    updateThemeIcon();
}

function toggleTheme() {
    document.body.classList.toggle('mode-dark');
    setStoredValue('theme', document.body.classList.contains('mode-dark') ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const isDark = document.body.classList.contains('mode-dark');
    if (sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
    if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
}

// ============ Views ============
// ============ Views ============
async function transitionView(hideId, showId) {
    const hideEl = document.getElementById(hideId);
    const showEl = document.getElementById(showId);
    if (!hideEl || !showEl) return;

    // Fade out
    hideEl.style.opacity = '0';
    hideEl.style.transition = 'opacity 0.2s ease';

    await new Promise(r => setTimeout(r, 200));

    hideEl.classList.add('hidden');
    showEl.classList.remove('hidden');

    // Fade in
    showEl.style.opacity = '0';
    showEl.style.transition = 'opacity 0.3s ease';
    // Force reflow
    void showEl.offsetWidth;
    showEl.style.opacity = '1';
}

function showProjectsView() {
    if (isProjectsPage()) {
        const projectsView = document.getElementById('projects-view');
        const workspaceView = document.getElementById('workspace-view');
        if (projectsView) projectsView.classList.remove('hidden');
        if (workspaceView) workspaceView.classList.add('hidden');
        window.history.replaceState({}, '', 'projects.html');
        renderProjectsGrid();
        updateViewButtons();
        return;
    }
    window.location.href = 'projects.html';
}

function showWorkspaceView() {
    if (!isWorkspacePage()) return;
    const projectsView = document.getElementById('projects-view');
    const workspaceView = document.getElementById('workspace-view');
    if (projectsView) projectsView.classList.add('hidden');
    if (workspaceView) workspaceView.classList.remove('hidden');
    updateViewButtons();
}

function updateProjectSelectionUI() {
    const projectsView = document.getElementById('projects-view');
    if (projectsView) {
        projectsView.classList.toggle('selection-mode', projectSelectionMode);
    }
    const selectedIds = Array.from(selectedProjectIds);
    const validIds = new Set(projects.map(p => p.id));
    selectedProjectIds = new Set(selectedIds.filter(id => validIds.has(id)));
    const selectedCount = selectedProjectIds.size;
    const selectBtn = document.getElementById('projects-select-toggle');
    const selectAllBtn = document.getElementById('projects-select-all');
    const deleteBtn = document.getElementById('projects-delete-selected');
    const countEl = document.getElementById('projects-selection-count');
    if (selectBtn) selectBtn.textContent = projectSelectionMode ? 'Cancel' : 'Select';
    if (countEl) countEl.textContent = projectSelectionMode ? `${selectedCount} selected` : '';
    if (selectAllBtn) {
        selectAllBtn.disabled = !projectSelectionMode || projects.length === 0 || selectedCount === projects.length;
    }
    if (deleteBtn) {
        deleteBtn.disabled = !projectSelectionMode || selectedCount === 0;
        deleteBtn.textContent = projectSelectionMode
            ? `Delete Selected${selectedCount ? ` (${selectedCount})` : ''}`
            : 'Delete Selected';
    }
}

function setProjectSelectionMode(enabled) {
    projectSelectionMode = Boolean(enabled);
    if (!projectSelectionMode) {
        selectedProjectIds.clear();
    }
    updateProjectSelectionUI();
    renderProjectsGrid();
}

function toggleProjectSelectionMode() {
    setProjectSelectionMode(!projectSelectionMode);
}

function toggleProjectSelection(id) {
    if (!projectSelectionMode) return;
    if (selectedProjectIds.has(id)) {
        selectedProjectIds.delete(id);
    } else {
        selectedProjectIds.add(id);
    }
    updateProjectSelectionUI();
    renderProjectsGrid();
}

function selectAllProjects() {
    if (!projectSelectionMode) return;
    selectedProjectIds = new Set(projects.map(p => p.id));
    updateProjectSelectionUI();
    renderProjectsGrid();
}

function deleteSelectedProjects() {
    if (!projectSelectionMode) return;
    const ids = Array.from(selectedProjectIds);
    if (!ids.length) return;
    showDeleteModal('project-batch', ids);
}

// ============ Projects ============
function renderProjectsGrid() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    const newCard = grid.querySelector('.new-project-card');
    grid.innerHTML = '';
    if (newCard) grid.appendChild(newCard);

    updateProjectSelectionUI();

    projects.forEach(p => {
        normalizeProjectMetadata(p);
        const card = document.createElement('div');
        const isSelected = selectedProjectIds.has(p.id);
        card.className = `project-card${isSelected ? ' selected' : ''}`;
        card.onclick = () => {
            if (projectSelectionMode) {
                toggleProjectSelection(p.id);
            } else {
                loadProject(p.id);
            }
        };
        const date = new Date(p.updated).toLocaleDateString();
        const actionCount = countActionsWithNested(p.actions || []);
        const descriptionText = typeof p.description === 'string' ? p.description.trim() : '';
        const descriptionHtml = descriptionText
            ? `<div class="project-description">${escapeHtml(descriptionText)}</div>`
            : '';
        const displayName = getProjectDisplayName(p);
        const iconSvg = getProjectIconSvg(p.icon);
        const projectColor = isValidProjectColor(p.color) ? p.color : DEFAULT_PROJECT_COLOR;
        const iconBgColor = hexToRgba(projectColor, 0.12);
        const selectionBtn = `
                    <button class="project-select-toggle${isSelected ? ' selected' : ''}" onclick="event.stopPropagation(); toggleProjectSelection('${p.id}')" title="Select project">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                `;
        card.innerHTML = `
                    ${selectionBtn}
                    <div class="project-card-header">
                        <div class="project-card-icon" style="background: ${iconBgColor}; color: ${projectColor}">${iconSvg}</div>
                        <h3>${escapeHtml(displayName)}</h3>
                    </div>
                    ${descriptionHtml}
                    <div class="project-meta"><span>${date}</span><span>${actionCount} actions</span></div>
                    <div class="project-actions">
                        <button class="node-action-btn delete" onclick="event.stopPropagation(); deleteProject('${p.id}')" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                `;
        grid.appendChild(card);
    });
}

function renderProjectIconOptions() {
    const container = document.getElementById('project-icon-grid');
    if (!container) return;
    container.innerHTML = '';
    PROJECT_ICON_IDS.forEach((iconId) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project-icon-option';
        button.dataset.icon = iconId;
        button.innerHTML = getProjectIconSvg(iconId);
        button.addEventListener('click', () => setProjectIconSelection(iconId));
        container.appendChild(button);
    });
}

function setProjectIconSelection(iconId) {
    const container = document.getElementById('project-icon-grid');
    if (!container) return;
    const safeIcon = PROJECT_ICON_SVGS[iconId] ? iconId : DEFAULT_PROJECT_ICON;
    container.querySelectorAll('.project-icon-option').forEach((button) => {
        button.classList.toggle('active', button.dataset.icon === safeIcon);
    });
    container.dataset.selectedIcon = safeIcon;
}

function openProjectSettingsModal() {
    if (!currentProject) return;
    const modal = document.getElementById('project-settings-modal');
    if (!modal) return;
    normalizeProjectMetadata(currentProject);
    const nameInput = document.getElementById('project-settings-name');
    const descriptionInput = document.getElementById('project-settings-description');
    if (nameInput) nameInput.value = currentProject.name || '';
    if (descriptionInput) descriptionInput.value = currentProject.description || '';
    setProjectIconSelection(currentProject.icon || DEFAULT_PROJECT_ICON);
    initColorPicker(currentProject.color || DEFAULT_PROJECT_COLOR);
    modal.classList.add('active');
    updateInputCounters();
}

function closeProjectSettingsModal() {
    document.getElementById('project-settings-modal')?.classList.remove('active');
}

// Color Picker Functions
let selectedProjectColor = DEFAULT_PROJECT_COLOR;

function initColorPicker(initialColor) {
    selectedProjectColor = initialColor;
    const presets = document.querySelectorAll('.color-preset[data-color]');
    const customBtn = document.getElementById('color-custom-btn');
    const customInput = document.getElementById('color-custom-input');
    
    // Update selection UI
    function updatePresetSelection(hex) {
        const normalizedHex = hex.toLowerCase();
        let foundPreset = false;
        presets.forEach(p => {
            const isMatch = p.dataset.color && p.dataset.color.toLowerCase() === normalizedHex;
            p.classList.toggle('active', isMatch);
            if (isMatch) foundPreset = true;
        });
        // If custom color, highlight the custom button
        if (customBtn) {
            if (!foundPreset) {
                customBtn.classList.add('active');
                customBtn.style.background = hex;
                const svg = customBtn.querySelector('svg');
                if (svg) svg.style.display = 'none';
            } else {
                customBtn.classList.remove('active');
                customBtn.style.background = '';
                const svg = customBtn.querySelector('svg');
                if (svg) svg.style.display = '';
            }
        }
    }
    
    updatePresetSelection(initialColor);
    
    // Preset click handlers
    presets.forEach(preset => {
        preset.onclick = () => {
            if (preset.dataset.color) {
                selectedProjectColor = preset.dataset.color;
                updatePresetSelection(selectedProjectColor);
            }
        };
    });
    
    // Custom color picker - input is now inside a label, so clicking works natively
    if (customBtn && customInput) {
        customInput.value = initialColor.startsWith('#') ? initialColor : '#3b82f6';
        customInput.onchange = () => {
            selectedProjectColor = customInput.value;
            updatePresetSelection(selectedProjectColor);
        };
        customInput.oninput = () => {
            selectedProjectColor = customInput.value;
            updatePresetSelection(selectedProjectColor);
        };
    }
}

function getSelectedColor() {
    return isValidProjectColor(selectedProjectColor) ? selectedProjectColor : DEFAULT_PROJECT_COLOR;
}

function saveProjectSettings() {
    if (!currentProject) return;
    normalizeProjectMetadata(currentProject);
    const nameInput = document.getElementById('project-settings-name');
    const descriptionInput = document.getElementById('project-settings-description');
    const iconGrid = document.getElementById('project-icon-grid');
    const nextName = String(nameInput?.value || '').trim().slice(0, PROJECT_NAME_MAX);
    const nextDescription = String(descriptionInput?.value || '').trim().slice(0, PROJECT_DESCRIPTION_MAX);
    const rawIcon = iconGrid?.dataset?.selectedIcon || DEFAULT_PROJECT_ICON;
    const nextIcon = isValidProjectIcon(rawIcon) ? rawIcon : DEFAULT_PROJECT_ICON;
    const nextColor = getSelectedColor();
    const previousName = currentProject.name || '';
    const previousDescription = currentProject.description || '';
    const previousIcon = currentProject.icon || DEFAULT_PROJECT_ICON;
    const previousColor = currentProject.color || DEFAULT_PROJECT_COLOR;
    const nameChanged = nextName !== previousName;
    const descriptionChanged = nextDescription !== previousDescription;
    const iconChanged = nextIcon !== previousIcon;
    const colorChanged = nextColor !== previousColor;
    if (nameChanged || descriptionChanged || iconChanged || colorChanged) {
        pushUndoState();
        currentProject.name = nextName;
        currentProject.description = nextDescription;
        currentProject.icon = nextIcon;
        currentProject.color = nextColor;
        if (nameChanged && !currentProject.nameFrozen) currentProject.nameFrozen = true;
        if (descriptionChanged && !currentProject.descriptionFrozen) currentProject.descriptionFrozen = true;
        if (iconChanged && !currentProject.iconFrozen) currentProject.iconFrozen = true;
        if (colorChanged && !currentProject.colorFrozen) currentProject.colorFrozen = true;
        currentProject.updated = Date.now();
    }
    const titleInput = document.getElementById('project-name-input');
    if (titleInput) titleInput.value = nextName;
    if (nameChanged || descriptionChanged || iconChanged || colorChanged) {
        upsertMarketplaceItemFromProject(currentProject);
        saveProjects();
        updateMobileShortcutCard();
        if (isProjectsPage()) renderProjectsGrid();
    }
    closeProjectSettingsModal();
}

function createNewProject(initialPrompt = null) {
    const id = 'proj_' + Date.now();
    const newProject = {
        id,
        name: '',
        created: Date.now(),
        updated: Date.now(),
        description: '',
        icon: DEFAULT_PROJECT_ICON,
        downloads: 0,
        upvotes: 0,
        nameFrozen: false,
        descriptionFrozen: false,
        iconFrozen: false,
        history: [],
        actions: [],
        programObj: null
    };
    projects.unshift(newProject);
    saveProjects();
    loadProject(id);
    if (initialPrompt) {
        setTimeout(() => {
            document.getElementById('chat-input').value = String(initialPrompt || '');
            handleSend();
        }, 300);
    }
    if (projects.length === 1 && !hasCompletedTutorial) {
        setTimeout(() => startTutorial(), 1200);
    }
}

function loadProject(id) {
    if (!isWorkspacePage()) {
        window.location.href = `app.html?id=${encodeURIComponent(id)}`;
        return;
    }
    currentProject = projects.find(p => p.id === id);
    if (!currentProject) { showProjectsView(); return; }
    normalizeProjectMetadata(currentProject);
    currentExportCache = null;
    currentActions = ensureActionUUIDs(currentProject.actions || []);
    currentActions = normalizeControlFlowToNested(currentActions);
    currentProject.actions = currentActions;
    saveProjects();
    currentProgramObj = currentProject.programObj || null;
    resetUndoRedoHistory();
    showWorkspaceView();
    document.getElementById('project-name-input').value = currentProject.name || '';
    updateInputCounters();
    window.history.replaceState({}, '', `app.html?id=${encodeURIComponent(id)}`);
    const messagesEl = document.getElementById('messages');
    messagesEl.innerHTML = '';
    // No welcome message - show empty state instead
    if (currentProject.history.length > 0) {
        currentProject.history.forEach(msg => addMessageToUI(msg.content, msg.role));
    } else {
        const messagesEl = document.getElementById('messages');
        messagesEl.innerHTML = ''; // Start clean
    }
    updateChatEmptyState();
    renderActions();
    updateUndoRedoButtons();
}

function saveProjects() {
    setStoredValue('projects', JSON.stringify(projects));
}

function clonePlainObject(value) {
    try {
        if (typeof structuredClone === 'function') return structuredClone(value);
    } catch (e) { }
    return JSON.parse(JSON.stringify(value));
}

function stripInternalParamKeys(params) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) return params || {};
    const out = {};
    Object.entries(params).forEach(([key, value]) => {
        const normalized = String(key || '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
        if (!normalized) return;
        if (normalized === 'uuidstring' || normalized.endsWith('uuid')) return;
        out[key] = value;
    });
    return out;
}

function serializeActionForExport(action) {
    if (!action || typeof action !== 'object') return action;
    const out = {
        action: action.action || action.title || 'Unknown',
        params: stripInternalParamKeys(clonePlainObject(action.params || {}))
    };
    if (Array.isArray(action.then)) out.then = action.then.map(serializeActionForExport);
    if (Array.isArray(action.else)) out.else = action.else.map(serializeActionForExport);
    if (Array.isArray(action.do)) out.do = action.do.map(serializeActionForExport);
    if (Array.isArray(action.Cases)) {
        out.Cases = action.Cases.map((entry) => ({
            Title: entry?.Title ?? entry?.title ?? '',
            Actions: Array.isArray(entry?.Actions) ? entry.Actions.map(serializeActionForExport) : []
        }));
    }
    return out;
}

function serializeTreeForExport(nodes) {
    if (!Array.isArray(nodes)) return [];
    const out = [];
    nodes.forEach((node) => {
        if (!node) return;
        if (node.type === 'if') {
            const base = serializeActionForExport(node.action);
            if (base?.params && base.params.WFControlFlowMode !== undefined) {
                delete base.params.WFControlFlowMode;
            }
            base.then = serializeTreeForExport(node.children || []);
            if (Array.isArray(node.elseChildren) && node.elseChildren.length) {
                base.else = serializeTreeForExport(node.elseChildren);
            }
            out.push(base);
            return;
        }
        if (node.type === 'repeat') {
            const base = serializeActionForExport(node.action);
            base.do = serializeTreeForExport(node.children || []);
            out.push(base);
            return;
        }
        if (node.type === 'menu') {
            const base = serializeActionForExport(node.action);
            base.Cases = (node.cases || []).map((menuCase) => ({
                Title: menuCase?.title ?? '',
                Actions: serializeTreeForExport(menuCase?.children || [])
            }));
            out.push(base);
            return;
        }
        out.push(serializeActionForExport(node.action));
    });
    return out;
}

// Map project icon IDs to Apple Shortcuts glyph numbers
const ICON_TO_GLYPH = {
    bolt: 59798,      // Lightning bolt
    star: 59810,      // Star
    wand: 59771,      // Magic wand
    doc: 59493,       // Document
    music: 59667,     // Music note
    photo: 59473,     // Photo
    video: 59802,     // Video camera
    mic: 59664,       // Microphone
    calendar: 59515,  // Calendar
    clock: 59536,     // Clock
    check: 61444,     // Checkmark
    chat: 61445,      // Chat bubble
    gear: 59517,      // Gear
    map: 59662,       // Map
    bell: 59486,      // Bell
    spark: 59779,     // Sparkle
    folder: 59560,    // Folder
    link: 61603,      // Link
    globe: 59571,     // Globe
    home: 59580,      // Home
    camera: 59508,    // Camera
    list: 59626,      // List
    shield: 59756,    // Shield
    heart: 59576,     // Heart
    bookmark: 59492,  // Bookmark
    repeat: 59753,    // Repeat arrows
    wifi: 59829,      // WiFi
    sun: 59808,       // Sun
    moon: 59590,      // Moon
    lock: 59631,      // Lock
    key: 59605,       // Key
    tag: 59814,       // Tag
    mail: 59647,      // Mail envelope
    phone: 59701,     // Phone
    clipboard: 59534, // Clipboard
    default: 59771    // Default: wand
};

// Convert hex color to Shortcuts startColor integer
function hexToShortcutsColor(hex) {
    if (!hex || typeof hex !== 'string') return 4282601983; // Default blue
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return 4282601983;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    // Shortcuts uses ARGB format with alpha=255
    return ((255 << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

function buildProgramExport(actions = currentActions) {
    const iconId = currentProject?.icon || 'wand';
    const colorHex = currentProject?.color || '#4A90D9';
    return {
        name: currentProject?.name || 'My Shortcut',
        icon: {
            glyph: ICON_TO_GLYPH[iconId] || ICON_TO_GLYPH.default,
            color: hexToShortcutsColor(colorHex)
        },
        actions: serializeTreeForExport(buildActionTree(actions || []))
    };
}

function updateProgramExportCache() {
    const programObj = buildProgramExport(currentActions);
    const programJson = JSON.stringify(programObj);
    currentExportCache = { programObj, programJson, updated: Date.now() };
    if (currentProject) {
        if (currentProject.exportCacheJson !== programJson) {
            currentProject.exportCacheJson = programJson;
            currentProject.exportCacheUpdated = Date.now();
            saveProjects();
        }
    }
    return currentExportCache;
}

function getProgramExportCache() {
    if (currentExportCache?.programJson) return currentExportCache;
    if (currentProject?.exportCacheJson) {
        try {
            const parsed = JSON.parse(currentProject.exportCacheJson);
            currentExportCache = {
                programObj: parsed,
                programJson: currentProject.exportCacheJson,
                updated: currentProject.exportCacheUpdated || Date.now()
            };
            return currentExportCache;
        } catch (err) {
            console.warn('Export cache parse error, rebuilding:', err);
        }
    }
    return updateProgramExportCache();
}

function captureWorkspaceState() {
    return {
        name: currentProject?.name || '',
        actions: clonePlainObject(currentActions || [])
    };
}

function applyWorkspaceState(state) {
    if (!state || typeof state !== 'object') return;
    currentActions = ensureActionUUIDs(clonePlainObject(state.actions || []));
    currentActions = normalizeControlFlowToNested(currentActions);
    if (currentProject) {
        if (typeof state.name === 'string') {
            currentProject.name = state.name.trim();
            const nameInput = document.getElementById('project-name-input');
            if (nameInput) nameInput.value = currentProject.name;
        }
        currentProject.actions = currentActions;
        saveProjects();
    }
    renderActions();
}

function resetUndoRedoHistory() {
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const addBtn = document.getElementById('add-action-btn');
    const shouldShow = !!currentProject && !!editMode;
    if (undoBtn) {
        undoBtn.disabled = !currentProject || undoStack.length === 0;
        undoBtn.style.display = shouldShow ? 'inline-flex' : 'none';
    }
    if (redoBtn) {
        redoBtn.disabled = !currentProject || redoStack.length === 0;
        redoBtn.style.display = shouldShow ? 'inline-flex' : 'none';
    }
    if (addBtn) {
        addBtn.style.display = shouldShow ? 'flex' : 'none';
    }
}

function pushUndoSnapshot(snapshot) {
    if (isRestoringHistory) return;
    if (!currentProject) return;
    if (!snapshot || typeof snapshot !== 'object') return;
    undoStack.push(clonePlainObject(snapshot));
    if (undoStack.length > MAX_HISTORY_STATES) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
}

function pushUndoState() {
    pushUndoSnapshot(captureWorkspaceState());
}

function undoWorkspace() {
    if (!currentProject) return;
    if (undoStack.length === 0) return;
    isRestoringHistory = true;
    redoStack.push(captureWorkspaceState());
    const prev = undoStack.pop();
    applyWorkspaceState(prev);
    isRestoringHistory = false;
    updateUndoRedoButtons();
}

function redoWorkspace() {
    if (!currentProject) return;
    if (redoStack.length === 0) return;
    isRestoringHistory = true;
    undoStack.push(captureWorkspaceState());
    const next = redoStack.pop();
    applyWorkspaceState(next);
    isRestoringHistory = false;
    updateUndoRedoButtons();
}

function genUUID() {
    return (crypto?.randomUUID?.() || ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    ));
}

function ensureActionUUIDs(actions = []) {
    return actions.map(a => {
        if (!a.id) a.id = Date.now() + Math.floor(Math.random() * 100000);
        if (!a.params) a.params = {};
        const normalizedAction = normalizeActionKey(a.action || a.title);
        if (normalizedAction === 'createlistfromstring' || normalizedAction === 'makelistfromtext') {
            a.action = 'list';
            a.title = 'list';
        }
        const currentUuid = typeof a.params.UUID === 'string' ? a.params.UUID.trim() : '';
        const explicitIdRaw = a.params.ID ?? a.params.Id ?? a.params.id ?? null;
        const explicitIdLabel = isExplicitIdLabel(String(explicitIdRaw ?? '')) ? normalizeIdLabel(explicitIdRaw) : '';
        const uuidIsToken = isIdToken(currentUuid) || currentUuid.toLowerCase().startsWith('!link:');
        const outputUuidRaw = typeof a.params.OutputUUID === 'string' ? a.params.OutputUUID.trim() : '';
        const outputUuidIsToken = isIdToken(outputUuidRaw) || outputUuidRaw.toLowerCase().startsWith('!link:');
        if (!currentUuid || uuidIsToken) {
            if (!explicitIdLabel && uuidIsToken) {
                const derivedLabel = normalizeIdLabel(currentUuid);
                if (derivedLabel) a.params.ID = `{{${derivedLabel}}}`;
            }
            if (!explicitIdLabel && outputUuidIsToken) {
                const derivedLabel = normalizeIdLabel(outputUuidRaw);
                if (derivedLabel) a.params.ID = `{{${derivedLabel}}}`;
            }
            const fromOutputUUID = outputUuidRaw;
            const fromProvided = typeof a.params.ProvidedOutputUUID === 'string' ? a.params.ProvidedOutputUUID.trim() : '';
            a.params.UUID = fromOutputUUID && !isIdToken(fromOutputUUID) ? fromOutputUUID : (fromProvided || genUUID());
        } else {
            a.params.UUID = currentUuid;
        }
        if (a.params.ProvidedOutputUUID) delete a.params.ProvidedOutputUUID;
        if (!a.params.GroupingIdentifier && isControlAction(a)) {
            a.params.GroupingIdentifier = genUUID();
        }
        if (Array.isArray(a.then)) a.then = ensureActionUUIDs(a.then);
        if (Array.isArray(a.else)) a.else = ensureActionUUIDs(a.else);
        if (Array.isArray(a.do)) a.do = ensureActionUUIDs(a.do);
        if (Array.isArray(a.Cases)) {
            a.Cases = a.Cases.map((entry) => {
                if (!entry || typeof entry !== 'object') return entry;
                const actions = Array.isArray(entry.Actions)
                    ? entry.Actions
                    : (Array.isArray(entry.actions) ? entry.actions : []);
                entry.Actions = ensureActionUUIDs(actions);
                return entry;
            });
        }
        return a;
    });
}

// Normalize flat WFControlFlowMode marker lists into nested JSON blocks ({ then/else/do }).
// This prevents reordering from moving only the start-marker and accidentally "swallowing" actions.
function normalizeControlFlowToNested(actions) {
    if (!Array.isArray(actions)) return [];

    const root = [];
    const stack = [{ kind: 'root', id: null, node: null, target: root }];

    const ensureMenuCaseTarget = (frame) => {
        if (!frame || frame.kind !== 'menu') return;
        if (frame.target) return;
        const menuAction = frame.node;
        if (!Array.isArray(menuAction.Cases)) menuAction.Cases = [];
        let title = '';
        if (Array.isArray(frame.menuItems)) {
            const nextIndex = Number.isFinite(frame.menuItemIndex) ? frame.menuItemIndex : 0;
            const nextItem = frame.menuItems[nextIndex];
            if (nextItem != null) {
                title = String(nextItem).trim();
                frame.menuItemIndex = nextIndex + 1;
            }
        }
        if (!title) title = `Option ${menuAction.Cases.length + 1}`;
        const caseObj = { Title: title, Actions: [] };
        menuAction.Cases.push(caseObj);
        frame.target = caseObj.Actions;
    };

    const currentTarget = () => {
        const frame = stack[stack.length - 1];
        if (frame?.kind === 'menu') ensureMenuCaseTarget(frame);
        return frame?.target || root;
    };

    const parseMode = (raw) => {
        if (raw === undefined || raw === null || raw === '') return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    };

    const actionKey = (action) => normalizeActionKey(action?.action || action?.title);

    const conditionalMarkerMode = (action) => {
        const mode = parseMode(action?.params?.WFControlFlowMode);
        if (mode != null) return mode;
        const key = actionKey(action);
        if (key === 'otherwise' || key === 'else') return 1;
        if (key === 'endif') return 2;
        return null;
    };

    const repeatMarkerMode = (action) => {
        const mode = parseMode(action?.params?.WFControlFlowMode);
        if (mode != null) return mode;
        const key = actionKey(action);
        if (key === 'endrepeat') return 2;
        return null;
    };

    const menuMarkerMode = (action) => {
        const mode = parseMode(action?.params?.WFControlFlowMode);
        if (mode != null) return mode;
        return null;
    };

    const findTopFrameIndex = (kind) => {
        for (let i = stack.length - 1; i >= 1; i--) {
            if (stack[i].kind === kind) return i;
        }
        return -1;
    };

    const findFrameIndex = (kind, gid) => {
        if (!gid) return -1;
        for (let i = stack.length - 1; i >= 1; i--) {
            if (stack[i].kind === kind && stack[i].id === gid) return i;
        }
        return -1;
    };

    const popUntil = (kind, gid) => {
        const idx = gid ? findFrameIndex(kind, gid) : -1;
        if (idx !== -1) {
            stack.length = idx;
            return;
        }
        const fallback = findTopFrameIndex(kind);
        if (fallback !== -1) stack.length = fallback;
    };

    actions.forEach((action) => {
        if (!action || typeof action !== 'object') return;
        if (!action.params || typeof action.params !== 'object') action.params = {};

        // Already-nested JSON: recurse and keep.
        if (isConditionalAction(action) && (Array.isArray(action.then) || Array.isArray(action.else))) {
            if (Array.isArray(action.then)) action.then = normalizeControlFlowToNested(action.then);
            if (Array.isArray(action.else)) action.else = normalizeControlFlowToNested(action.else);
            if (action.params.WFControlFlowMode !== undefined) delete action.params.WFControlFlowMode;
            currentTarget().push(action);
            return;
        }
        if (isRepeatAction(action) && Array.isArray(action.do)) {
            action.do = normalizeControlFlowToNested(action.do);
            if (action.params.WFControlFlowMode !== undefined) delete action.params.WFControlFlowMode;
            currentTarget().push(action);
            return;
        }
        if (isMenuAction(action)) {
            if (!Array.isArray(action.Cases) || action.Cases.length === 0) {
                const menuItems = getMenuItemsFromParams(action.params);
                if (menuItems.length) {
                    action.Cases = menuItems.map(title => ({ Title: title, Actions: [] }));
                } else if (!Array.isArray(action.Cases)) {
                    action.Cases = [];
                }
            }
            if (action.params && typeof action.params === 'object') {
                const promptValue = action.params.Prompt ?? action.params.WFMenuPrompt ?? null;
                if (isDefaultMenuPrompt(promptValue)) {
                    if (action.params.Prompt !== undefined) action.params.Prompt = '';
                    if (action.params.WFMenuPrompt !== undefined) action.params.WFMenuPrompt = '';
                }
            }
            if (Array.isArray(action.Cases)) {
                action.Cases = action.Cases.map((entry) => {
                    if (!entry || typeof entry !== 'object') {
                        const fallbackTitle = String(entry ?? '').trim();
                        return { Title: fallbackTitle, Actions: [] };
                    }
                    const caseActions = Array.isArray(entry.Actions) ? entry.Actions : [];
                    return {
                        ...entry,
                        Actions: normalizeControlFlowToNested(caseActions)
                    };
                });
            }
            if (action.params.WFControlFlowMode !== undefined) delete action.params.WFControlFlowMode;
            currentTarget().push(action);
            return;
        }

        if (isConditionalAction(action)) {
            const mode = conditionalMarkerMode(action);
            if (mode != null) {
                const explicitGid = typeof action.params.GroupingIdentifier === 'string' && action.params.GroupingIdentifier.trim()
                    ? action.params.GroupingIdentifier.trim()
                    : null;

                if (mode === 0) {
                    const gid = explicitGid || genUUID();
                    action.params.GroupingIdentifier = gid;
                    if (action.params.WFControlFlowMode !== undefined) delete action.params.WFControlFlowMode;
                    action.then = [];
                    action.else = [];
                    currentTarget().push(action);
                    stack.push({ kind: 'if', id: gid, node: action, target: action.then });
                    return;
                }

                if (mode === 1) {
                    let idx = explicitGid ? findFrameIndex('if', explicitGid) : -1;
                    if (idx === -1) idx = findTopFrameIndex('if');
                    if (idx !== -1) {
                        stack[idx].target = stack[idx].node.else;
                        action.params.GroupingIdentifier = stack[idx].id;
                    }
                    return; // drop Else marker
                }

                if (mode === 2) {
                    popUntil('if', explicitGid);
                    return; // drop End If marker
                }
            }
        }

        if (isRepeatAction(action)) {
            const mode = repeatMarkerMode(action);
            if (mode != null) {
                const explicitGid = typeof action.params.GroupingIdentifier === 'string' && action.params.GroupingIdentifier.trim()
                    ? action.params.GroupingIdentifier.trim()
                    : null;

                if (mode === 0) {
                    const gid = explicitGid || genUUID();
                    action.params.GroupingIdentifier = gid;
                    if (action.params.WFControlFlowMode !== undefined) delete action.params.WFControlFlowMode;
                    action.do = [];
                    currentTarget().push(action);
                    stack.push({ kind: 'repeat', id: gid, node: action, target: action.do });
                    return;
                }

                if (mode === 2) {
                    popUntil('repeat', explicitGid);
                    return; // drop End Repeat marker
                }
            }
        }

        if (isMenuAction(action)) {
            const mode = menuMarkerMode(action);
            if (mode != null) {
                const explicitGid = typeof action.params.GroupingIdentifier === 'string' && action.params.GroupingIdentifier.trim()
                    ? action.params.GroupingIdentifier.trim()
                    : null;

                if (mode === 0) {
                    const gid = explicitGid || genUUID();
                    action.params.GroupingIdentifier = gid;
                    if (action.params.WFControlFlowMode !== undefined) delete action.params.WFControlFlowMode;
                    if (action.params.WFMenuItemTitle !== undefined) delete action.params.WFMenuItemTitle;
                    if (!Array.isArray(action.Cases)) action.Cases = [];
                    const menuItems = getMenuItemsFromParams(action.params);
                    currentTarget().push(action);
                    stack.push({
                        kind: 'menu',
                        id: gid,
                        node: action,
                        target: null,
                        menuItems,
                        menuItemIndex: 0
                    });
                    return;
                }

                if (mode === 1) {
                    let idx = explicitGid ? findFrameIndex('menu', explicitGid) : -1;
                    if (idx === -1) idx = findTopFrameIndex('menu');
                    if (idx === -1) {
                        currentTarget().push(action);
                        return;
                    }
                    const frame = stack[idx];
                    if (!Array.isArray(frame.node.Cases)) frame.node.Cases = [];
                    const titleRaw =
                        action.params.WFMenuItemTitle ??
                        action.params.MenuItemTitle ??
                        action.params.Title ??
                        '';
                    let title = String(titleRaw || '').trim();
                    if (!title && Array.isArray(frame.menuItems)) {
                        const nextIndex = Number.isFinite(frame.menuItemIndex) ? frame.menuItemIndex : frame.node.Cases.length;
                        const nextItem = frame.menuItems[nextIndex];
                        if (nextItem != null) {
                            title = String(nextItem).trim();
                            frame.menuItemIndex = nextIndex + 1;
                        }
                    }
                    if (!title) title = `Option ${frame.node.Cases.length + 1}`;
                    const caseObj = { Title: title, Actions: [] };
                    frame.node.Cases.push(caseObj);
                    frame.target = caseObj.Actions;
                    return;
                }

                if (mode === 2) {
                    popUntil('menu', explicitGid);
                    return;
                }
            }
        }

        // If/Repeat actions created without marker params should still behave as blocks
        // (so the custom If/Else + Repeat UI shows up, and drag/drop works on whole blocks).
        if (isConditionalAction(action)) {
            const key = actionKey(action);
            const mode = parseMode(action?.params?.WFControlFlowMode);
            const hasBlockArrays = Array.isArray(action.then) || Array.isArray(action.else);
            if (!hasBlockArrays && mode == null && (key === 'if' || key.includes('conditional'))) {
                action.then = [];
                action.else = [];
                if (action.params.WFControlFlowMode !== undefined) delete action.params.WFControlFlowMode;
                currentTarget().push(action);
                return;
            }
        }

        if (isRepeatAction(action)) {
            const key = actionKey(action);
            const mode = parseMode(action?.params?.WFControlFlowMode);
            const isEndMarker = key.includes('endrepeat');
            if (!Array.isArray(action.do) && mode == null && !isEndMarker && key.includes('repeat')) {
                action.do = [];
                if (action.params.WFControlFlowMode !== undefined) delete action.params.WFControlFlowMode;
                currentTarget().push(action);
                return;
            }
        }

        currentTarget().push(action);
    });

    return root;
}

function findActionLocation(actionId, actions = currentActions, parentAction = null, parentArray = currentActions, section = 'root') {
    if (!Array.isArray(actions)) return null;
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (action.id === actionId) {
            return { action, parentAction, parentArray, section, index: i };
        }
        if (isConditionalAction(action)) {
            const inThen = findActionLocation(actionId, action.then || [], action, action.then || [], 'then');
            if (inThen) return inThen;
            const inElse = findActionLocation(actionId, action.else || [], action, action.else || [], 'else');
            if (inElse) return inElse;
        }
        if (isRepeatAction(action)) {
            const inDo = findActionLocation(actionId, action.do || [], action, action.do || [], 'do');
            if (inDo) return inDo;
        }
        if (isMenuAction(action)) {
            const cases = action.Cases || [];
            for (let j = 0; j < cases.length; j++) {
                const inCase = findActionLocation(actionId, cases[j].Actions || [], action, cases[j].Actions || [], `case:${j}`);
                if (inCase) return inCase;
            }
        }
    }

    return null;
}

function actionContainsId(action, targetId) {
    if (!action) return false;
    const checkArray = (arr) => Array.isArray(arr) && arr.some(a => a?.id === targetId || actionContainsId(a, targetId));
    const hasControl = checkArray(action.then) || checkArray(action.else) || checkArray(action.do);
    if (hasControl) return true;
    if (isMenuAction(action)) {
        return (action.Cases || []).some(c => checkArray(c?.Actions));
    }
    return false;
}

function removeActionById(actionId) {
    const loc = findActionLocation(actionId);
    if (!loc) return null;
    const [removed] = loc.parentArray.splice(loc.index, 1);
    return removed || loc.action;
}

function ensureSectionArray(action, sectionKey) {
    if (!action) return null;
    if (sectionKey === 'then') {
        if (!Array.isArray(action.then)) action.then = [];
        return action.then;
    }
    if (sectionKey === 'else') {
        if (!Array.isArray(action.else)) action.else = [];
        return action.else;
    }
    if (sectionKey === 'do') {
        if (!Array.isArray(action.do)) action.do = [];
        return action.do;
    }
    if (typeof sectionKey === 'string' && sectionKey.startsWith('case:')) {
        const index = Number(sectionKey.split(':')[1]);
        if (!Number.isFinite(index) || index < 0) return null;
        if (!Array.isArray(action.Cases)) action.Cases = [];
        while (action.Cases.length <= index) {
            action.Cases.push({ Title: `Option ${action.Cases.length + 1}`, Actions: [] });
        }
        const entry = action.Cases[index];
        if (!entry.Actions || !Array.isArray(entry.Actions)) entry.Actions = [];
        return entry.Actions;
    }
    return currentActions;
}

function cloneActionDeep(action) {
    const cloned = JSON.parse(JSON.stringify(action));
    const all = [];
    const collect = (act) => {
        if (!act || typeof act !== 'object') return;
        all.push(act);
        if (isConditionalAction(act)) {
            (act.then || []).forEach(collect);
            (act.else || []).forEach(collect);
        } else if (isRepeatAction(act)) {
            (act.do || []).forEach(collect);
        } else if (isMenuAction(act)) {
            (act.Cases || []).forEach(c => (c.Actions || []).forEach(collect));
        }
    };

    collect(cloned);

    const baseId = Date.now();
    let idCounter = 0;
    const uuidMap = new Map(); // old -> new
    const idLabelMap = new Map(); // old label -> new label
    const usedLinkLabels = new Set();

    const makeCopyLinkLabel = (label) => {
        const cleaned = String(label || '').replace(/[^\w.-]/g, '').trim() || 'copy';
        let candidate = `${cleaned}_copy`;
        let suffix = 2;
        while (usedLinkLabels.has(candidate)) {
            candidate = `${cleaned}_copy${suffix++}`;
        }
        usedLinkLabels.add(candidate);
        return candidate;
    };

    // First pass: assign new IDs + control group IDs, and build UUID remap for internal outputs.
    all.forEach((act) => {
        act.id = baseId + (idCounter++) + Math.floor(Math.random() * 1000);
        if (!act.params) act.params = {};
        if (isControlAction(act)) {
            act.params.GroupingIdentifier = genUUID();
        }

        const rawIdValue = act.params.ID ?? act.params.Id ?? act.params.id ?? null;
        if (isExplicitIdLabel(String(rawIdValue ?? ''))) {
            const oldLabel = normalizeIdLabel(rawIdValue);
            if (oldLabel && !idLabelMap.has(oldLabel)) {
                const newLabel = makeCopyLinkLabel(oldLabel);
                idLabelMap.set(oldLabel, newLabel);
            }
        }

        const oldUuidRaw =
            (typeof act.params.UUID === 'string' && act.params.UUID.trim()) ? act.params.UUID.trim()
                : (typeof act.params.OutputUUID === 'string' && act.params.OutputUUID.trim()) ? act.params.OutputUUID.trim()
                    : null;
        if (!oldUuidRaw || uuidMap.has(oldUuidRaw)) return;

        if (isIdToken(oldUuidRaw) || oldUuidRaw.toLowerCase().startsWith('!link:')) {
            const oldLabel = normalizeIdLabel(oldUuidRaw);
            const newLabel = makeCopyLinkLabel(oldLabel);
            uuidMap.set(oldUuidRaw, formatIdToken(newLabel));
        } else {
            uuidMap.set(oldUuidRaw, genUUID());
        }
    });

    const remapStringValue = (value) => {
        const str = String(value);
        // Replace embedded tokens first (for mixed strings).
        const withTokens = str.replace(/!id:(?:\{\{[^}]+?\}\}|[^\s]+)/gi, (token) => {
            const label = normalizeIdLabel(token);
            const mapped = label && idLabelMap.has(label) ? idLabelMap.get(label) : null;
            return mapped ? formatIdToken(mapped) : (uuidMap.get(token.trim()) || token);
        }).replace(/!link:[^\s]+/gi, (token) => uuidMap.get(token.trim()) || token);
        const trimmed = withTokens.trim();
        return uuidMap.get(trimmed) || withTokens;
    };

    const remapAny = (value) => {
        if (typeof value === 'string') return remapStringValue(value);
        if (Array.isArray(value)) return value.map(remapAny);
        if (value && typeof value === 'object') {
            Object.keys(value).forEach((k) => {
                value[k] = remapAny(value[k]);
            });
            return value;
        }
        return value;
    };

    // Second pass: apply new UUIDs to producers, and update internal references.
    all.forEach((act) => {
        if (!act.params) act.params = {};
        // Migrate any legacy field first
        if (act.params.ProvidedOutputUUID && !act.params.UUID) {
            act.params.UUID = act.params.ProvidedOutputUUID;
        }
        if (act.params.ProvidedOutputUUID) delete act.params.ProvidedOutputUUID;

        const rawIdValue = act.params.ID ?? act.params.Id ?? act.params.id ?? null;
        if (isExplicitIdLabel(String(rawIdValue ?? ''))) {
            const oldLabel = normalizeIdLabel(rawIdValue);
            const newLabel = oldLabel && idLabelMap.has(oldLabel) ? idLabelMap.get(oldLabel) : null;
            if (newLabel) {
                act.params.ID = `{{${newLabel}}}`;
            }
        }

        const uuidBefore =
            (typeof act.params.UUID === 'string' && act.params.UUID.trim()) ? act.params.UUID.trim()
                : (typeof act.params.OutputUUID === 'string' && act.params.OutputUUID.trim()) ? act.params.OutputUUID.trim()
                    : '';
        const remappedUuid = uuidBefore ? (uuidMap.get(uuidBefore) || uuidBefore) : genUUID();
        act.params.UUID = remappedUuid;
        if (typeof act.params.OutputUUID === 'string' && act.params.OutputUUID.trim() === uuidBefore) {
            act.params.OutputUUID = remappedUuid;
        }

        // Update any internal param references to duplicated actions
        act.params = remapAny(act.params);
    });
    return cloned;
}

function resolveConditionOptions(action, rawValue) {
    const params = action?.params || {};
    const optionsSource =
        params.ConditionOptions ||
        params.WFConditionOptions ||
        (rawValue && String(rawValue).includes('/') ? rawValue : null) ||
        (params.Condition && String(params.Condition).includes('/') ? params.Condition : null) ||
        (params.WFCondition && String(params.WFCondition).includes('/') ? params.WFCondition : null) ||
        DEFAULT_CONDITION_OPTIONS;

    const optionsString = String(optionsSource || DEFAULT_CONDITION_OPTIONS);
    const options = optionsString.split('/').map(o => o.trim()).filter(o => o);

    let selected =
        params.ConditionValue ||
        params.WFConditionValue ||
        (!rawValue || String(rawValue).includes('/') ? null : rawValue) ||
        (params.Condition && !String(params.Condition).includes('/') ? params.Condition : null) ||
        (params.WFCondition && !String(params.WFCondition).includes('/') ? params.WFCondition : null);

    if (!selected) selected = options[0] || 'Is';
    if (!options.includes(selected) && options.length > 0) selected = options[0];

    return { optionsString, options, selected };
}

function getConditionOptionsById(actionId, rawValue) {
    const loc = findActionLocation(actionId);
    return resolveConditionOptions(loc?.action, rawValue);
}

function isUnaryCondition(label = '') {
    const val = String(label).toLowerCase();
    return val === 'has any value' || val === 'does not have any value';
}

function flattenActions(actions = currentActions, result = []) {
    if (!Array.isArray(actions)) return result;
    actions.forEach(action => {
        result.push(action);
        if (isConditionalAction(action)) {
            flattenActions(action.then || [], result);
            flattenActions(action.else || [], result);
        } else if (isRepeatAction(action)) {
            flattenActions(action.do || [], result);
        } else if (isMenuAction(action)) {
            (action.Cases || []).forEach(c => flattenActions(c.Actions || [], result));
        }
    });
    return result;
}

function countActionsWithNested(actions = currentActions) {
    if (!Array.isArray(actions)) return 0;
    return flattenActions(actions, []).length;
}

function buildParamPlaceholder(paramKey) {
    // Avoid leaking template-style placeholders (e.g. {{OUTPUT}}) into the UI.
    // Use empty string instead; the UI already provides contextual placeholders.
    return '';
}

const SIMPLE_ID_LABEL_RE = /^[A-Za-z0-9_.\-|#@]+$/;
const REPEAT_TOKEN_LABEL_RE = /^repeat(?:item|index|count)\d*$/i;

function normalizeIdLabel(raw) {
    if (raw == null) return '';
    let label = String(raw).trim();
    if (!label) return '';
    label = label.replace(/^!(?:id|link|out):/i, '').trim();
    if (label.startsWith('{{') && label.endsWith('}}')) {
        label = label.slice(2, -2).trim();
    }
    return label;
}

function isRepeatToken(raw) {
    const normalized = normalizeIdLabel(raw);
    if (!normalized) return false;
    const compact = normalized.replace(/\s+/g, '');
    return REPEAT_TOKEN_LABEL_RE.test(compact);
}

function normalizeVarLabel(raw) {
    if (raw == null) return '';
    let label = String(raw).trim();
    if (!label) return '';
    label = label.replace(/^!var:/i, '').trim();
    if (label.startsWith('{{') && label.endsWith('}}')) {
        label = label.slice(2, -2).trim();
    }
    return label;
}

function isExplicitIdLabel(raw) {
    if (typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    if (!trimmed) return false;
    if (/^!id:/i.test(trimmed)) return true;
    return trimmed.startsWith('{{') && trimmed.endsWith('}}');
}

function formatIdToken(label) {
    const cleaned = normalizeIdLabel(label);
    if (!cleaned) return '';
    if (SIMPLE_ID_LABEL_RE.test(cleaned)) return `!ID:${cleaned}`;
    return `!ID:{{${cleaned}}}`;
}

function isIdToken(raw) {
    if (typeof raw !== 'string') return false;
    return /^!id:(\{\{[^}]+?\}\}|[^\s]+)$/i.test(raw.trim());
}

function getIdLabelForDisplay(raw) {
    return normalizeIdLabel(raw) || '';
}

function normalizeIdParamForStorage(raw) {
    const label = normalizeIdLabel(raw);
    return label ? `{{${label}}}` : '';
}

function updateActionIdParam(actionId, rawValue, options = {}) {
    const loc = findActionLocation(actionId);
    const action = loc?.action;
    if (!action) return;
    if (!action.params) action.params = {};
    const stored = normalizeIdParamForStorage(rawValue);
    const prevRaw = action.params.ID ?? action.params.Id ?? action.params.id ?? '';
    const prevStored = normalizeIdParamForStorage(prevRaw);
    if (prevStored !== stored) {
        pushUndoState();
    }
    if (stored) {
        action.params.ID = stored;
    } else {
        delete action.params.ID;
        delete action.params.Id;
        delete action.params.id;
    }
    const render = options.render !== false;
    commitActionChanges(null, { render, suppressAnimations: true });
}

function handleIdInputBlur(el) {
    if (!el) return;
    const actionId = parseInt(el.dataset.actionId);
    if (!Number.isFinite(actionId)) return;
    updateActionIdParam(actionId, el.value, { render: true });
}

function handleIdInputKeydown(event, el) {
    if (!event || !el) return;
    if (event.key !== 'Enter') return;
    event.preventDefault();
    el.blur();
}

function handleIdInputInput(el) {
    if (!el) return;
    const valueLen = (el.value || '').length;
    const placeholderLen = (el.getAttribute('placeholder') || '').length;
    const size = Math.max(valueLen, placeholderLen, 6);
    el.style.width = `${size}ch`;
}

function paramKeySupportsInlineLinks(paramKey) {
    const key = String(paramKey || '').trim().toLowerCase();
    if (!key) return false;
    // Heuristic: "Text-like" fields where Shortcuts allows mixing words + variables.
    // (e.g., Text/Prompt/Body/Title/Message/Content/etc.)
    if (key === 'text') return true;
    return (
        key.includes('text') ||
        key.includes('prompt') ||
        key.includes('body') ||
        key.includes('title') ||
        key.includes('message') ||
        key.includes('subject') ||
        key.includes('comment') ||
        key.includes('notes') ||
        key.includes('query') ||
        key.includes('caption') ||
        key.includes('description') ||
        key.includes('content')
    );
}

const INLINE_TOKEN_RE = /!id:(?:\{\{[^}]+?\}\}|[^\s]+)|!link:[^\s]+|!var:(?:\{\{[^}]+?\}\}|[^\s]+)|\{\{[^}]+?\}\}/gi;
const STANDARD_PLACEHOLDER_RE = /^\{\{(STRING|VARIABLE|NUMBER|INTEGER|DECIMAL|BOOLEAN)\}\}$/i;
const LIST_ITEM_SEPARATOR = ',';
const LEGACY_LIST_ITEM_SEPARATOR = '__AI_LIST_ITEM_DELIM_7b9e5c__';

function isStandardPlaceholderToken(token) {
    return STANDARD_PLACEHOLDER_RE.test(String(token || '').trim());
}

function isListEditorAction(action) {
    const normalized = normalizeActionKey(action?.action || action?.title || '');
    return normalized === 'list' || normalized === 'makelistfromtext' || normalized === 'createlistfromstring';
}

function isListEditorParam(paramKey) {
    return String(paramKey || '').trim().toLowerCase() === 'text';
}

function splitCommaSeparatedList(text) {
    const items = [];
    let current = '';
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (ch === '\\\\') {
            const next = text[i + 1];
            if (next === ',' || next === '\\\\') {
                current += next;
                i += 1;
                continue;
            }
            current += ch;
            continue;
        }
        if (ch === LIST_ITEM_SEPARATOR) {
            items.push(current);
            current = '';
            continue;
        }
        current += ch;
    }
    items.push(current);
    return items;
}

function parseListParamValue(rawValue, { allowEmpty = false } = {}) {
    if (rawValue == null) return allowEmpty ? [''] : [];
    if (Array.isArray(rawValue)) {
        const items = rawValue.map((item) => String(item ?? '').trim());
        if (!allowEmpty) return items.filter(Boolean);
        return items.length ? items : [''];
    }
    if (rawValue && typeof rawValue === 'object') {
        const outputUUID = rawValue?.Value?.OutputUUID || rawValue?.OutputUUID || '';
        const token = formatIdToken(outputUUID);
        if (token) return [token];
    }
    const text = String(rawValue ?? '');
    const trimmed = text.trim();
    if (!text) return allowEmpty ? [''] : [];
    if (STANDARD_PLACEHOLDER_RE.test(trimmed)) return allowEmpty ? [''] : [];

    let parts = [];
    if (text.includes(LEGACY_LIST_ITEM_SEPARATOR)) {
        parts = text.split(LEGACY_LIST_ITEM_SEPARATOR);
    } else if (text.includes(LIST_ITEM_SEPARATOR)) {
        parts = splitCommaSeparatedList(text);
    } else if (/\r?\n/.test(text)) {
        parts = text.split(/\r?\n/);
    } else {
        parts = [text];
    }

    const normalized = parts.map((part) => String(part ?? '').trim());
    if (!allowEmpty) return normalized.filter(Boolean);
    return normalized.length ? normalized : [''];
}

function escapeListItemValue(value) {
    const raw = String(value ?? '');
    if (!raw) return '';
    return raw.replace(/\\\\/g, '\\\\\\\\').replace(/,/g, '\\\\,');
}

function serializeListParamValue(items) {
    if (!Array.isArray(items) || !items.length) return '';
    const normalized = items.map((item) => String(item ?? '').trim());
    if (normalized.length === 1 && normalized[0] === '') return '';
    return normalized.map(escapeListItemValue).join(LIST_ITEM_SEPARATOR);
}

function updateListParamFromEditor(el, options = {}) {
    if (!el) return;
    const container = el.closest('.list-editor');
    const actionId = Number(container?.dataset?.actionId || el.dataset.actionId);
    const paramKey = container?.dataset?.param || el.dataset.listParam;
    if (!Number.isFinite(actionId) || !paramKey) return;
    const inputs = Array.from(container?.querySelectorAll('.list-item-input') || []);
    const items = inputs.map((input) => extractRichInputValue(input));
    const serialized = serializeListParamValue(items);
    const action = findActionLocation(actionId)?.action;
    const currentValue = action?.params?.[paramKey] ?? '';
    if (String(currentValue ?? '') === String(serialized ?? '')) return;
    updateActionParam(actionId, paramKey, serialized, options);
}

function handleListItemBlur(el) {
    updateListParamFromEditor(el, { render: false });
    normalizeRichInputDisplay(el);
}

function addListItem(actionId, paramKey) {
    const action = findActionLocation(actionId)?.action;
    if (!action) return;
    if (!action.params) action.params = {};
    const currentValue = action.params[paramKey] ?? '';
    const items = parseListParamValue(currentValue, { allowEmpty: true });
    items.push('');
    updateActionParam(actionId, paramKey, serializeListParamValue(items), { suppressAnimations: true });
}

function removeListItem(actionId, paramKey, index) {
    const action = findActionLocation(actionId)?.action;
    if (!action) return;
    if (!action.params) action.params = {};
    const currentValue = action.params[paramKey] ?? '';
    const items = parseListParamValue(currentValue, { allowEmpty: true });
    if (index < 0 || index >= items.length) return;
    items.splice(index, 1);
    updateActionParam(actionId, paramKey, serializeListParamValue(items), { suppressAnimations: true });
}

const LIST_ITEM_CONFIRM_PREF_KEY = 'shortcutstudio_list_item_confirm_disabled';
let pendingListItemRemoval = null;

function shouldConfirmListItemRemoval() {
    return localStorage.getItem(LIST_ITEM_CONFIRM_PREF_KEY) !== 'true';
}

function requestListItemRemoval(actionId, paramKey, index) {
    if (!shouldConfirmListItemRemoval()) {
        removeListItem(actionId, paramKey, index);
        return;
    }
    pendingListItemRemoval = { actionId, paramKey, index };
    document.getElementById('list-item-remove-modal')?.classList.add('active');
}

function closeListItemRemoveModal() {
    pendingListItemRemoval = null;
    document.getElementById('list-item-remove-modal')?.classList.remove('active');
}

function confirmListItemRemoval() {
    if (!pendingListItemRemoval) {
        closeListItemRemoveModal();
        return;
    }
    const { actionId, paramKey, index } = pendingListItemRemoval;
    closeListItemRemoveModal();
    removeListItem(actionId, paramKey, index);
}

function disableListItemRemovalConfirm() {
    localStorage.setItem(LIST_ITEM_CONFIRM_PREF_KEY, 'true');
    confirmListItemRemoval();
}

function renderListEditor(actionId, paramKey, rawValue, readonly = false) {
    const items = parseListParamValue(rawValue, { allowEmpty: !readonly });
    const displayItems = items.length ? items : (readonly ? [] : ['']);
    const safeParam = escapeHtml(paramKey).replace(/'/g, "\\'");
    if (readonly && displayItems.length === 0) {
        return `<div class="list-editor list-editor-empty">No items</div>`;
    }
    const rows = displayItems.map((item, idx) => {
        const placeholder = 'List item';
        const richHtml = formatRichInputHtml(item);
        const contextMenuAttr = readonly ? '' : 'oncontextmenu="showVariableMenu(event, this)"';
        const removeBtn = readonly
            ? ''
            : `<button type="button" class="node-action-btn list-item-remove" onclick="requestListItemRemoval(${actionId}, '${safeParam}', ${idx})" title="Remove">-</button>`;
        const inputHtml = `
                    <div class="param-with-insert">
                        <div class="param-value param-rich-input list-item-input" contenteditable="${readonly ? 'false' : 'true'}" data-action-id="${actionId}" data-param="${escapeHtml(paramKey)}" data-list-param="${escapeHtml(paramKey)}" data-list-index="${idx}" data-placeholder="${escapeAttr(placeholder)}" onblur="handleListItemBlur(this)" ${contextMenuAttr}>${richHtml}</div>
                        ${readonly ? '' : '<button type="button" class="var-insert-btn" onclick="openVariableMenuFromButton(event, this)">+</button>'}
                    </div>
                `;
        return `
                    <div class="list-editor-row" data-list-index="${idx}">
                        <span class="list-editor-index">${idx + 1}.</span>
                        ${inputHtml}
                        ${removeBtn}
                    </div>
                `;
    }).join('');

    const addBtn = readonly
        ? ''
        : `
                    <div class="list-editor-actions">
                        <button type="button" class="node-action-btn list-item-add" onclick="addListItem(${actionId}, '${safeParam}')">
                            <span class="list-item-add-plus">+</span>
                            Add item
                        </button>
                    </div>
                `;

    return `
                <div class="list-editor" data-action-id="${actionId}" data-param="${escapeHtml(paramKey)}">
                    ${rows}
                    ${addBtn}
                </div>
            `;
}

function wrapWithVariableInsert(inputHtml, readonly = false) {
    if (readonly) return inputHtml;
    return `
                <div class="param-with-insert">
                    ${inputHtml}
                    <button type="button" class="var-insert-btn" onclick="openVariableMenuFromButton(event, this)">+</button>
                </div>
            `;
}

function openVariableMenuFromButton(event, btn) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const wrapper = btn?.closest('.param-with-insert');
    const target = wrapper?.querySelector('.param-value');
    if (!target) return;
    const rect = btn.getBoundingClientRect();
    const syntheticEvent = {
        preventDefault: () => { },
        pageX: rect.right + window.scrollX,
        pageY: rect.bottom + window.scrollY
    };
    showVariableMenu(syntheticEvent, target);
}

function getRichInputPlaceholder(key, rawValue) {
    const trimmed = String(rawValue || '').trim();
    if (STANDARD_PLACEHOLDER_RE.test(trimmed)) {
        const type = trimmed.slice(2, -2).trim().toLowerCase();
        if (type === 'variable') return 'Enter variable';
        if (type === 'number' || type === 'integer' || type === 'decimal') return 'Enter number';
        if (type === 'boolean') return 'Enter true or false';
        return 'Enter text';
    }
    const lowerKey = String(key || '').trim().toLowerCase();
    if (lowerKey.includes('prompt')) return 'Prompt';
    if (lowerKey.includes('title')) return 'Enter title';
    if (lowerKey.includes('message')) return 'Enter message';
    if (lowerKey.includes('subject')) return 'Enter subject';
    if (lowerKey.includes('body')) return 'Enter body';
    if (lowerKey.includes('text')) return 'Enter text';
    return lowerKey ? `Enter ${lowerKey}` : 'Enter text';
}

function shouldUseVariableDropdown(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const outputUUID = value?.Value?.OutputUUID || value?.OutputUUID || '';
        const variableName = value?.Value?.VariableName || value?.VariableName || '';
        if (outputUUID || variableName) return true;
    }
    const strValue = typeof value === 'string' ? value.trim() : '';
    if (!strValue) return false;
    const placeholderMatch = strValue.match(/^\{\{(\w+)\}\}$/);
    if (placeholderMatch && placeholderMatch[1].toLowerCase() === 'variable') return true;
    return isIdToken(strValue) || /^!link:/i.test(strValue) || /^!var:/i.test(strValue);
}

function isActionInRepeatBody(actionId) {
    if (!Number.isFinite(actionId)) return false;
    let loc = findActionLocation(actionId);
    while (loc?.parentAction) {
        if (isRepeatAction(loc.parentAction) && loc.section === 'do') return true;
        const parentId = loc.parentAction.id;
        if (!Number.isFinite(parentId)) break;
        loc = findActionLocation(parentId);
    }
    return false;
}

function getRepeatVariableOptions(actionId) {
    if (!isActionInRepeatBody(actionId)) return [];
    return [
        { value: formatIdToken('repeatItem'), label: 'Repeat Item' },
        { value: formatIdToken('repeatIndex'), label: 'Repeat Index' },
    ].filter(opt => opt.value);
}

function getVariableDropdownOptions(actionId) {
    const flatActions = flattenActions();
    const currentIndex = flatActions.findIndex(a => a.id === actionId);
    const previousActions = currentIndex > 0 ? flatActions.slice(0, currentIndex) : [];
    const options = [];
    const seen = new Set();
    const repeatOptions = getRepeatVariableOptions(actionId);
    repeatOptions.forEach(opt => {
        if (!opt.value || seen.has(opt.value)) return;
        seen.add(opt.value);
        options.push({ value: opt.value, label: opt.label });
    });
    previousActions
        .map(a => ({ action: a, output: getActionOutputInfo(a) }))
        .filter(entry => entry.output && actionHasLinkableOutput(entry.action))
        .forEach(({ action, output }) => {
            const base = output.outputId || output.outputUUID;
            const token = formatIdToken(base);
            if (!token || seen.has(token)) return;
            seen.add(token);
            const label = output.outputName || action.title || action.action || 'Action';
            options.push({ value: token, label });
        });
    return options;
}

function resolveVariableSelectValue(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const outputUUID = value?.Value?.OutputUUID || value?.OutputUUID || '';
        if (outputUUID) return formatIdToken(outputUUID);
        const variableName = value?.Value?.VariableName || value?.VariableName || '';
        if (variableName) return `!var:${variableName}`;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (isIdToken(trimmed) || /^!link:/i.test(trimmed)) return trimmed;
        if (/^!var:/i.test(trimmed)) return trimmed;
    }
    return '';
}

function handleVariableSelectChange(el) {
    if (!el) return;
    const actionId = parseInt(el.dataset.actionId);
    const paramKey = el.dataset.param;
    if (!Number.isFinite(actionId) || !paramKey) return;
    const rawValue = el.value;
    const value = rawValue === '__none__' ? '{{VARIABLE}}' : rawValue;
    if (rawValue === '__none__') {
        el.value = '';
    }
    el.classList.toggle('selected', rawValue !== '__none__' && Boolean(rawValue));
    updateActionParam(actionId, paramKey, value);
}

function tokenizeRichText(raw) {
    const text = String(raw || '');
    if (!text) return [];
    const out = [];
    INLINE_TOKEN_RE.lastIndex = 0;
    let lastIndex = 0;
    let match;
    while ((match = INLINE_TOKEN_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
            out.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }
        out.push({ type: 'token', value: match[0] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        out.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return out;
}

function getTokenDisplayLabel(token) {
    const trimmed = String(token || '').trim();
    if (isIdToken(trimmed) || /^!link:/i.test(trimmed)) return normalizeIdLabel(trimmed);
    if (/^!var:/i.test(trimmed)) return normalizeVarLabel(trimmed);
    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
        return trimmed.slice(2, -2).trim();
    }
    return trimmed;
}

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidLike(str) {
    return UUID_LIKE_RE.test(String(str || '').trim());
}

function buildVariablePillHtml(token) {
    const rawToken = String(token || '');
    const label = getTokenDisplayLabel(rawToken);
    const resolved =
        resolveOutputNameByUUID(rawToken, null) ||
        resolveOutputNameByUUID(label, null);
    let display = humanizeOutputName(resolved || label || rawToken);
    // If display is still a UUID-like string, fall back to a generic label
    if (isUuidLike(display)) {
        display = 'Linked Output';
    }
    return `<span class="variable-pill" contenteditable="false" data-token="${escapeAttr(rawToken)}"><span class="variable-pill-label">${escapeHtml(display)}</span><button type="button" class="variable-pill-remove" title="Remove">&times;</button></span>`;
}

function formatRichInputHtml(rawValue) {
    if (!rawValue) return '';
    const parts = tokenizeRichText(rawValue);
    if (!parts.length) return '';
    return parts.map(part => {
        if (part.type === 'token') {
            return buildVariablePillHtml(part.value);
        }
        return escapeHtml(part.value).replace(/\n/g, '<br>');
    }).join('');
}

function extractRichInputText(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node;
    if (el.classList.contains('variable-pill')) {
        return el.dataset.token || '';
    }
    if (el.tagName === 'BR') return '\n';
    let text = '';
    el.childNodes.forEach(child => {
        text += extractRichInputText(child);
    });
    if (el.tagName === 'DIV' || el.tagName === 'P') text += '\n';
    return text;
}

function extractRichInputValue(el) {
    if (!el) return '';
    let out = '';
    el.childNodes.forEach(child => {
        out += extractRichInputText(child);
    });
    return out.replace(/\n+$/g, '');
}

function handleRichInputChange(el, options = {}) {
    if (!el) return;
    if (el.dataset?.listParam) {
        updateListParamFromEditor(el, options);
        return;
    }
    const actionId = parseInt(el.dataset.actionId);
    const paramKey = el.dataset.param;
    if (!Number.isFinite(actionId) || !paramKey) return;
    const value = extractRichInputValue(el);
    const existing = findActionLocation(actionId)?.action?.params?.[paramKey] ?? '';
    if (String(existing ?? '') === String(value ?? '')) return;
    updateActionParam(actionId, paramKey, value, options);
}

function normalizeRichInputDisplay(el) {
    if (!el) return;
    const value = extractRichInputValue(el);
    const html = formatRichInputHtml(value);
    if (el.innerHTML !== html) {
        el.innerHTML = html;
    }
}

function handleRichInputBlur(el) {
    if (el?.dataset?.listParam) {
        handleListItemBlur(el);
        return;
    }
    handleRichInputChange(el, { render: false });
    normalizeRichInputDisplay(el);
}

function isRichInputElement(el) {
    return Boolean(el && el.classList && el.classList.contains('param-rich-input'));
}

function flushRichInputs() {
    const inputs = Array.from(document.querySelectorAll('.param-rich-input[contenteditable="true"]') || []);
    inputs.forEach((input) => handleRichInputChange(input, { render: false }));
}

function saveRichInputSelection(el) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (el.contains(range.startContainer)) {
        richInputSelection = range.cloneRange();
    }
}

function restoreRichInputSelection(el) {
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    if (richInputSelection && el.contains(richInputSelection.startContainer)) {
        selection.addRange(richInputSelection);
        return;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.addRange(range);
}

function insertTokenIntoRichInput(el, token) {
    if (!el) return;
    const rawToken = String(token || '').trim();
    if (!rawToken) return;
    restoreRichInputSelection(el);
    const selection = window.getSelection();
    const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    const pillWrapper = document.createElement('span');
    pillWrapper.innerHTML = buildVariablePillHtml(rawToken);
    const pill = pillWrapper.firstElementChild;

    const fragment = document.createDocumentFragment();
    const leftRange = range ? range.cloneRange() : null;
    const rightRange = range ? range.cloneRange() : null;
    let needsLeadingSpace = false;
    let needsTrailingSpace = false;

    if (range) {
        leftRange.selectNodeContents(el);
        leftRange.setEnd(range.startContainer, range.startOffset);
        rightRange.selectNodeContents(el);
        rightRange.setStart(range.endContainer, range.endOffset);
        const leftText = leftRange.toString();
        const rightText = rightRange.toString();
        needsLeadingSpace = leftText.length > 0 && !/\s$/.test(leftText);
        needsTrailingSpace = rightText.length > 0 && !/^\s/.test(rightText);
        range.deleteContents();
    }

    if (needsLeadingSpace) fragment.appendChild(document.createTextNode(' '));
    fragment.appendChild(pill);
    if (needsTrailingSpace) fragment.appendChild(document.createTextNode(' '));

    if (range) {
        range.insertNode(fragment);
        const tailNode = pill.nextSibling;
        if (tailNode && tailNode.nodeType === Node.TEXT_NODE) {
            range.setStart(tailNode, tailNode.textContent.length);
        } else {
            range.setStartAfter(pill);
        }
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        el.appendChild(fragment);
    }
    el.focus();
    handleRichInputChange(el, { render: false });
}

function getActionOutputInfo(action) {
    if (!action?.params) return null;
    if (!actionHasLinkableOutput(action)) return null;
    const normalized = normalizeActionKey(action.action || action.title || '');
    const variableName = getVariableNameFromAction(action);
    const outputUUID = action.params.UUID;
    if (!outputUUID) return null;
    const rawUUID = String(outputUUID).trim();
    const rawIdValue = action.params.ID ?? action.params.Id ?? action.params.id ?? null;
    const idLabel = normalizeIdLabel(rawIdValue);
    const hasExplicitId = isExplicitIdLabel(String(rawIdValue ?? ''));
    const rawNameCandidate =
        (variableName && (normalized === 'setvariable' || normalized === 'getvariable' || normalized === 'variable.append' || normalized === 'appendvariable'))
            ? variableName
            : (action.params.CustomOutputNameEnabled && typeof action.params.CustomOutputName === 'string' && action.params.CustomOutputName.trim())
                ? action.params.CustomOutputName.trim()
                : (typeof action.params.OutputName === 'string' && action.params.OutputName.trim())
                    ? action.params.OutputName.trim()
                    : (hasExplicitId && idLabel ? idLabel : (isIdToken(rawUUID) ? normalizeIdLabel(rawUUID) : ''))
                    || action.title || action.action || 'Action Output';

    let outputName = String(rawNameCandidate || '').trim() || 'Action Output';
    // If outputName looks like a UUID, fall back to the action title
    if (isUuidLike(outputName)) {
        outputName = action.title || action.action || 'Action Output';
    }
    return { outputUUID: rawUUID, outputName, outputId: hasExplicitId ? idLabel : null };
}

function getVariableNameFromAction(action) {
    if (!action?.params) return '';
    const normalized = normalizeActionKey(action.action || action.title || '');
    if (normalized === 'setvariable' || normalized === 'variable.set' || normalized === 'variable.append' || normalized === 'appendvariable') {
        return String(action.params.WFVariableName ?? action.params.VariableName ?? action.params.Variable ?? '').trim();
    }
    if (normalized === 'getvariable' || normalized === 'variable.get') {
        const wfVar = action.params.WFVariable ?? action.params.Variable ?? null;
        const nestedName =
            wfVar?.Value?.VariableName ??
            wfVar?.VariableName ??
            action.params.VariableName ??
            action.params.WFVariableName ??
            '';
        return String(nestedName || '').trim();
    }
    return '';
}

let outputNameIndexByUUID = new Map();
let suggestedIdByActionId = new Map();

function getSuggestedIdLabel(action) {
    const key = normalizeActionKey(action?.action || action?.title || '');
    const base = key ? key.replace(/\./g, '') : 'action';
    return base || 'action';
}

function buildSuggestedIdIndex(actions = currentActions) {
    const counts = new Map();
    const next = new Map();
    const flat = flattenActions(actions, []);
    flat.forEach(action => {
        const base = getSuggestedIdLabel(action);
        const count = (counts.get(base) || 0) + 1;
        counts.set(base, count);
        const suffix = count === 1 ? '' : String(count);
        next.set(action.id, `${base}${suffix}`);
    });
    suggestedIdByActionId = next;
    return suggestedIdByActionId;
}

function buildIdPillHtml(actionId) {
    if (!editMode) return '';
    const action = findActionLocation(actionId)?.action;
    const idValue = action?.params?.ID ?? action?.params?.Id ?? action?.params?.id ?? '';
    const idLabel = getIdLabelForDisplay(idValue);
    const placeholder = suggestedIdByActionId.get(actionId) || getSuggestedIdLabel(action) || 'action1';
    const initialSize = Math.max((idLabel || '').length, placeholder.length, 6);
    return `
                <div class="node-id-pill" title="Output ID">
                    <span class="node-id-icon">↗</span>
                    <input type="text" class="node-id-input" data-action-id="${actionId}" value="${escapeAttr(idLabel)}" placeholder="${escapeAttr(placeholder)}" style="width:${initialSize}ch" oninput="handleIdInputInput(this)" onblur="handleIdInputBlur(this)" onkeydown="handleIdInputKeydown(event, this)">
                </div>
            `;
}

function rebuildOutputNameIndex(actions = currentActions) {
    const next = new Map();
    const flat = flattenActions(actions, []);
    flat.forEach(action => {
        const info = getActionOutputInfo(action);
        if (info?.outputUUID) next.set(String(info.outputUUID), String(info.outputName || '').trim() || 'Action Output');
        if (info?.outputId) next.set(String(info.outputId), String(info.outputName || '').trim() || 'Action Output');
        if (info?.outputUUID && isIdToken(String(info.outputUUID))) {
            const normalized = normalizeIdLabel(String(info.outputUUID));
            if (normalized) next.set(normalized, String(info.outputName || '').trim() || 'Action Output');
        }
    });
    outputNameIndexByUUID = next;
    return outputNameIndexByUUID;
}

function resolveOutputNameByUUID(outputUUID, fallbackName = null) {
    const key = typeof outputUUID === 'string' ? outputUUID.trim() : String(outputUUID || '').trim();
    if (!key) return fallbackName;
    const normalized = normalizeIdLabel(key);
    const builtinLabel = resolveBuiltinOutputLabel(normalized || key);
    return builtinLabel || outputNameIndexByUUID.get(normalized || key) || fallbackName;
}

function collectAvailableOutputs(actions = currentActions, set = new Set()) {
    if (!Array.isArray(actions)) return set;
    actions.forEach(action => {
        const info = getActionOutputInfo(action);
        if (info?.outputUUID) set.add(String(info.outputUUID));
        if (info?.outputId) set.add(String(info.outputId));
        if (info?.outputUUID && isIdToken(String(info.outputUUID))) {
            const normalized = normalizeIdLabel(String(info.outputUUID));
            if (normalized) set.add(normalized);
        }
        if (isConditionalAction(action)) {
            collectAvailableOutputs(action.then || [], set);
            collectAvailableOutputs(action.else || [], set);
        } else if (isRepeatAction(action)) {
            collectAvailableOutputs(action.do || [], set);
        }
    });
    return set;
}

function pruneMissingOutputLinks() {
    currentActions = ensureActionUUIDs(currentActions);
    const flat = flattenActions(currentActions, []);
    const actionIndexById = new Map();
    const outputIndexByUuid = new Map();
    flat.forEach((action, idx) => {
        if (action?.id != null) actionIndexById.set(action.id, idx);
        const info = getActionOutputInfo(action);
        if (info?.outputUUID) {
            const key = String(info.outputUUID);
            if (!outputIndexByUuid.has(key)) outputIndexByUuid.set(key, idx);
            if (isIdToken(key)) {
                const normalized = normalizeIdLabel(key);
                if (normalized && !outputIndexByUuid.has(normalized)) outputIndexByUuid.set(normalized, idx);
            }
        }
        if (info?.outputId) {
            const key = String(info.outputId);
            if (!outputIndexByUuid.has(key)) outputIndexByUuid.set(key, idx);
        }
    });
    const validOutputs = new Set(outputIndexByUuid.keys());
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let mutated = false;
    const OUTPUT_TOKEN_PLACEHOLDER = buildParamPlaceholder('Output');

    const tokenIsLinkish = (token) => {
        const t = String(token || '').trim();
        if (!t) return false;
        if (t.startsWith('{{') && t.endsWith('}}')) return false;
        if (isIdToken(t)) return true;
        if (/^!link:\S+$/i.test(t)) return true;
        if (uuidLike.test(t)) return true;
        return false;
    };

    const tokenIsValidLink = (token, currentIndex, allowRepeatTokens) => {
        const t = String(token || '').trim();
        if (!tokenIsLinkish(t)) return true;
        if (allowRepeatTokens && isRepeatToken(t)) return true;
        let lookupKey = t;
        if (isIdToken(lookupKey) || lookupKey.toLowerCase().startsWith('!link:')) {
            const normalized = normalizeIdLabel(lookupKey);
            if (normalized) lookupKey = normalized;
        }
        let sourceIndex = outputIndexByUuid.get(lookupKey);
        if (!validOutputs.has(lookupKey)) {
            // Allow "!ID:<uuid>" tokens to refer to a literal UUID output.
            if (uuidLike.test(lookupKey) && validOutputs.has(lookupKey)) {
                sourceIndex = outputIndexByUuid.get(lookupKey);
            } else {
                return false;
            }
        }
        if (typeof currentIndex === 'number' && typeof sourceIndex === 'number' && sourceIndex >= currentIndex) return false;
        return true;
    };

    const scrubString = (key, rawValue, currentIndex, allowRepeatTokens) => {
        const str = String(rawValue);
        const trimmed = str.trim();
        if (!trimmed) return rawValue;
        if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
            const inner = trimmed.slice(2, -2).trim();
            const isAllCapsPlaceholder = /^[A-Z0-9_]+$/.test(inner);
            const isStandardTypePlaceholder = /^(STRING|VARIABLE|NUMBER|INTEGER|DECIMAL|BOOLEAN)$/i.test(inner);
            if (isAllCapsPlaceholder && !isStandardTypePlaceholder) {
                mutated = true;
                return '';
            }
            return rawValue;
        }

        // Pure link token
        if (tokenIsLinkish(trimmed) && trimmed === str.trim()) {
            if (!tokenIsValidLink(trimmed, currentIndex, allowRepeatTokens)) {
                mutated = true;
                return '';
            }
            return rawValue;
        }

        // Mixed text: replace only invalid tokens.
        if (!str.toLowerCase().includes('!id:') && !str.toLowerCase().includes('!link:')) return rawValue;
        const replaced = str.replace(/!id:(?:\{\{[^}]+?\}\}|[^\s]+)/gi, (token) => {
            if (!tokenIsValidLink(token, currentIndex, allowRepeatTokens)) {
                mutated = true;
                return '';
            }
            return token;
        }).replace(/!link:[^\s]+/gi, (token) => {
            if (!tokenIsValidLink(token, currentIndex, allowRepeatTokens)) {
                mutated = true;
                return '';
            }
            return token;
        });
        return replaced.replace(/\s{2,}/g, ' ');
    };

    const scrubAction = (action, inRepeatBody = false) => {
        if (!action?.params) return;
        const currentIndex = actionIndexById.get(action.id);
        const allowRepeatTokens = Boolean(inRepeatBody);
        Object.entries(action.params).forEach(([key, value]) => {
            if (typeof value === 'string') {
                const next = scrubString(key, value, currentIndex, allowRepeatTokens);
                if (next !== value) action.params[key] = next;
                return;
            }
            if (value && typeof value === 'object') {
                const linkedUuid = value?.Value?.OutputUUID || value?.OutputUUID || '';
                const linkedKeyRaw = linkedUuid ? String(linkedUuid) : '';
                let linkedKey = linkedKeyRaw.trim();
                if (!linkedKey) return;
                if (allowRepeatTokens && isRepeatToken(linkedKey)) return;
                let lookupKey = linkedKey;
                let sourceIndex = outputIndexByUuid.get(lookupKey);
                if (!validOutputs.has(lookupKey) && (isIdToken(lookupKey) || lookupKey.toLowerCase().startsWith('!link:'))) {
                    const label = normalizeIdLabel(lookupKey);
                    if (label && validOutputs.has(label)) {
                        lookupKey = label;
                        sourceIndex = outputIndexByUuid.get(label);
                    } else if (label && uuidLike.test(label) && validOutputs.has(label)) {
                        lookupKey = label;
                        sourceIndex = outputIndexByUuid.get(label);
                    }
                }
                if (
                    linkedKey &&
                    (!validOutputs.has(lookupKey) ||
                        (typeof currentIndex === 'number' && typeof sourceIndex === 'number' && sourceIndex >= currentIndex))
                ) {
                    action.params[key] = '';
                    mutated = true;
                }
            }
        });
        if (isConditionalAction(action)) {
            (action.then || []).forEach(entry => scrubAction(entry, inRepeatBody));
            (action.else || []).forEach(entry => scrubAction(entry, inRepeatBody));
        } else if (isRepeatAction(action)) {
            (action.do || []).forEach(entry => scrubAction(entry, true));
        } else if (isMenuAction(action)) {
            (action.Cases || []).forEach(entry => {
                (entry?.Actions || []).forEach(caseAction => scrubAction(caseAction, inRepeatBody));
            });
        }
    };
    (currentActions || []).forEach(action => scrubAction(action, false));
    if (mutated && currentProject) {
        currentProject.actions = currentActions;
        saveProjects();
    }
}

function getActionUUID(action) {
    if (!action.params) action.params = {};
    if (!action.params.GroupingIdentifier) action.params.GroupingIdentifier = genUUID();
    return action.params.GroupingIdentifier;
}

// ============ Company/Third-party Action Mapping ============
// Maps action name prefixes/patterns to company info with inline SVG icons for reliability
// Apple actions don't show a badge (null)
const ACTION_COMPANY_MAP = {
    // Google/Chrome actions
    'chrome': { 
        name: 'Google Chrome', 
        color: '#4285F4',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4"/><path d="M21.17 8H12M3.95 6.06L8.54 14M8.54 21.94l4.59-8" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
    },
    'com.addreadinglistitemtochromeintent': { 
        name: 'Google Chrome', 
        color: '#4285F4',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4"/><path d="M21.17 8H12M3.95 6.06L8.54 14M8.54 21.94l4.59-8" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
    },
    
    // ChatGPT/OpenAI actions
    'chatgpt': { 
        name: 'ChatGPT', 
        color: '#10A37F',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12h8M12 8v8"/></svg>'
    },
    
    // Spotify actions
    'spotify': { 
        name: 'Spotify', 
        color: '#1DB954',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.36c-.19.31-.58.39-.87.2-2.4-1.46-5.41-1.79-8.96-.98-.34.08-.69-.13-.77-.47-.08-.34.13-.69.47-.77 3.89-.89 7.22-.51 9.93 1.13.29.19.38.58.2.89zm1.23-2.71c-.24.38-.74.5-1.11.26-2.75-1.69-6.94-2.18-10.19-1.19-.41.13-.85-.1-.98-.51-.13-.41.1-.85.51-.98 3.7-1.13 8.3-.58 11.51 1.31.37.24.49.74.26 1.11zm.1-2.83c-3.3-1.96-8.73-2.14-11.88-1.18-.51.15-1.04-.13-1.19-.64-.15-.51.13-1.04.64-1.19 3.62-1.1 9.64-.89 13.45 1.37.46.27.61.86.34 1.31-.27.46-.86.61-1.32.33h-.04z"/></svg>'
    },
    
    // Slack actions
    'slack': { 
        name: 'Slack', 
        color: '#4A154B',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>'
    },
    
    // WhatsApp actions
    'whatsapp': { 
        name: 'WhatsApp', 
        color: '#25D366',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
    },
    
    // Telegram actions
    'telegram': { 
        name: 'Telegram', 
        color: '#0088CC',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>'
    },
    
    // Discord actions
    'discord': { 
        name: 'Discord', 
        color: '#5865F2',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>'
    },
    
    // Notion actions
    'notion': { 
        name: 'Notion', 
        color: '#000000',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>'
    },
    
    // Todoist actions
    'todoist': { 
        name: 'Todoist', 
        color: '#E44332',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 0H3C1.35 0 0 1.35 0 3v18c0 1.65 1.35 3 3 3h18c1.65 0 3-1.35 3-3V3c0-1.65-1.35-3-3-3zM10.67 17.39l-4.42-2.5c-.15-.1-.15-.29 0-.39l1.64-.93c.15-.1.34-.1.49 0l2.29 1.32c.15.1.34.1.49 0l6.67-3.79c.15-.1.34-.1.49 0l1.64.93c.15.1.15.29 0 .39l-8.8 4.97c-.15.1-.34.1-.49 0zm0-4.17l-4.42-2.5c-.15-.1-.15-.29 0-.39l1.64-.93c.15-.1.34-.1.49 0l2.29 1.32c.15.1.34.1.49 0l6.67-3.79c.15-.1.34-.1.49 0l1.64.93c.15.1.15.29 0 .39l-8.8 4.97c-.15.1-.34.1-.49 0zm0-4.17l-4.42-2.5c-.15-.1-.15-.29 0-.39l1.64-.93c.15-.1.34-.1.49 0l2.29 1.32c.15.1.34.1.49 0l6.67-3.79c.15-.1.34-.1.49 0l1.64.93c.15.1.15.29 0 .39l-8.8 4.97c-.15.1-.34.1-.49 0z"/></svg>'
    },
    
    // Drafts actions
    'drafts': { 
        name: 'Drafts', 
        color: '#2D81FF',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-1.41 1.41L10 21l2-2 2 2 1.41-1.41L14 18h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"/></svg>'
    },
    
    // Overcast actions
    'overcast': { 
        name: 'Overcast', 
        color: '#FC7E0F',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12zm-.007-4.616a4.652 4.652 0 0 0 2.249-.536l.639 1.107a.334.334 0 0 0 .574 0l.639-1.107a4.658 4.658 0 0 0 2.29-4.004c0-.993-.312-1.912-.841-2.668l.841-1.458a.334.334 0 0 0-.289-.501h-1.318a4.6 4.6 0 0 0-2.536-.761v-2.91a.334.334 0 0 0-.578-.229l-.978.998-.978-.998a.334.334 0 0 0-.578.229v2.91a4.6 4.6 0 0 0-2.536.761H8.275a.334.334 0 0 0-.289.501l.841 1.458a4.658 4.658 0 0 0 1.449 6.672l.639 1.107a.334.334 0 0 0 .574 0l.639-1.107a4.652 4.652 0 0 0 1.865.536z"/></svg>'
    },
    
    // Fantastical actions
    'fantastical': { 
        name: 'Fantastical', 
        color: '#C0392B',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/></svg>'
    },
    
    // Things 3 actions
    'things': { 
        name: 'Things', 
        color: '#3B82F6',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
    },
    
    // OmniFocus actions
    'omnifocus': { 
        name: 'OmniFocus', 
        color: '#774AA4',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4"/></svg>'
    },
    
    // Bear actions
    'bear': { 
        name: 'Bear', 
        color: '#DD4C4F',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
    },
    
    // Day One actions
    'dayone': { 
        name: 'Day One', 
        color: '#50C6DB',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="2"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/><line x1="8" y1="16" x2="12" y2="16" stroke="currentColor" stroke-width="2"/></svg>'
    },
    
    // Pocket Casts actions
    'pocketcasts': { 
        name: 'Pocket Casts', 
        color: '#F43E37',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12zm0-4.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zm0-3a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>'
    },
    
    // Castro actions
    'castro': { 
        name: 'Castro', 
        color: '#00CC66',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>'
    },
    
    // CARROT Weather actions
    'carrot': { 
        name: 'CARROT Weather', 
        color: '#FF6B00',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>'
    },
    
    // 1Password actions
    '1password': { 
        name: '1Password', 
        color: '#0094F5',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2V7h2v10z"/></svg>'
    },
    
    // Trello actions
    'trello': { 
        name: 'Trello', 
        color: '#0079BF',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="5" width="5" height="12" rx="1"/><rect x="12" y="5" width="5" height="8" rx="1"/></svg>'
    },
    
    // Twitter/X actions
    'twitter': { 
        name: 'X', 
        color: '#000000',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    },
    'x': { 
        name: 'X', 
        color: '#000000',
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    },
};

// Get company info for an action
function getActionCompanyInfo(actionName) {
    if (!actionName) return null;
    const normalized = normalizeActionKey(actionName);
    
    // Check for exact match first
    if (ACTION_COMPANY_MAP[normalized]) {
        return ACTION_COMPANY_MAP[normalized];
    }
    
    // Check for prefix match (e.g., "chrome.addbookmark" -> "chrome")
    const dotIndex = normalized.indexOf('.');
    if (dotIndex > 0) {
        const prefix = normalized.slice(0, dotIndex);
        if (ACTION_COMPANY_MAP[prefix]) {
            return ACTION_COMPANY_MAP[prefix];
        }
    }
    
    // Check if action starts with any known company prefix
    for (const [key, info] of Object.entries(ACTION_COMPANY_MAP)) {
        if (normalized.startsWith(key)) {
            return info;
        }
    }
    
    return null; // Apple/native action
}

// Generate HTML for company badge (returns empty string for Apple actions)
function getCompanyBadgeHtml(actionName) {
    const companyInfo = getActionCompanyInfo(actionName);
    if (!companyInfo) return ''; // Apple action - no badge
    
    const { name, color, icon } = companyInfo;
    return `<span class="company-badge" title="${escapeHtml(name)}" style="--company-color: ${color}">${icon}</span>`;
}

const NON_LINKABLE_OUTPUT_ACTION_KEYS = new Set([
    // Control / non-output actions
    'if',
    'repeat',
    'repeatwitheach',
    'output',
    'stopandoutput',
    'exit',
    'dismisssiri',
    'delay',
    'nothing',
    'control.comment',
    'comment',
    'alert',
    'notification',
    'vibrate',
    // Common non-output utility actions
    'openapp',
    'openurl',
    'pausemusic',
    'playsound',
    'playsoundfile',
    'print',
    'returntohomescreen',
    'showcontrolcenter',
    'lockscreen',
    // “Set …” actions (generally no output)
    'clipboard.set',
    'setvariable',
    'variable.append',
    'setvolume',
    'setbrightness',
    // App/automation helpers that typically don't return a result
    'airdrop.send',
    'chrome.addbookmark',
    'com.addreadinglistitemtochromeintent',
    'chatgpt.configureopennewchatinapp',
    'calendar.setcalendarfocusconfiguration',
    'clock.starttimer',
    'clock.createalarm',
    'message.send'
    ,
    // Creation/utility actions user marked as non-output
    'addnewcontact',
    'addnewevent',
    'addnewreminder',
    'calendar.createcalendar',
    'file.rename',
    'savetocameraroll',
    'showdefinition',
    'waittoreturn',
    'speaktext'
]);

function normalizeActionKey(raw) {
    return String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '');
}

const ACTION_LABEL_OVERRIDES = new Map([
    ['choosefrommenu', 'Choose From Menu'],
    ['list.choosefrom', 'Choose From List'],
    ['getcurrentapp', 'Get Current App'],
    ['getfoldercontents', 'Get Folder Contents'],
    ['file.getfoldercontents', 'Get Folder Contents'],
    ['returntohomescreen', 'Return to Home Screen'],
    ['waittoreturn', 'Wait to Return'],
    ['savetocameraroll', 'Save to Camera Roll'],
    ['addnewreminder', 'Add New Reminder'],
    ['selectemailadresses', 'Select Email Addresses'],
    ['runjavascriptonwebpage', 'Run JavaScript on Web Page'],
    ['generateqrcodefromtext', 'Generate QR Code'],
    ['createlistfromstring', 'List'],
    ['makelistfromtext', 'List'],
]);

const ACTION_LABEL_DROP_PREFIX = new Set([
    'file',
    'calendar',
    'weather',
    'data',
    'text',
    'list',
    'number',
    'math',
    'url',
    'variable',
    'clipboard',
    'message',
    'image',
    'device',
    'dnd',
    'shortcutsactions',
    'com',
]);

const ACTION_LABEL_ACRONYMS = new Set([
    'url', 'qr', 'gif', 'llm', 'ai', 'api', 'json', 'pdf', 'gps', 'sms', 'ios',
]);

const COMMON_ACTION_WORDS = [
    // verbs
    'add', 'append', 'ask', 'build', 'calculate', 'change', 'check', 'choose', 'clear', 'close', 'combine',
    'compress', 'convert', 'copy', 'count', 'create', 'delete', 'describe', 'detect', 'dismiss', 'download',
    'edit', 'encode', 'expand', 'extract', 'filter', 'find', 'format', 'generate', 'get', 'hash', 'import',
    'insert', 'list', 'lock', 'make', 'open', 'pause', 'play', 'prompt', 'random', 'remove', 'rename', 'repeat',
    'return', 'round', 'run', 'save', 'scan', 'select', 'send', 'set', 'show', 'speak', 'start', 'stop',
    'take', 'text', 'toggle', 'transcribe', 'translate', 'turn', 'update', 'wait',
    // nouns / common targets
    'action', 'activity', 'address', 'addresses', 'adresses', 'alarm', 'app', 'audio', 'background', 'barcode',
    'bill', 'bookmark', 'camera', 'calendar', 'case', 'center', 'comment', 'conditions', 'contact', 'contacts',
    'control', 'current', 'data', 'definition', 'details', 'document', 'each', 'email', 'event', 'expression',
    'file', 'files', 'flip', 'focus', 'folder', 'forecast', 'frame', 'from', 'gif', 'hash', 'home', 'image',
    'in', 'input', 'item', 'items', 'javascript', 'key', 'list', 'message', 'month', 'new', 'notification',
    'number', 'numbers', 'of', 'on', 'orientation', 'or', 'output', 'page', 'phone', 'phonenumber', 'photo',
    'priority', 'qrcode', 'qr', 'reminder', 'reminders', 'roll', 'screen', 'setting', 'settings', 'shortcuts',
    'sound', 'spell', 'store', 'string', 'text', 'timer', 'to', 'transcribe', 'url', 'variable', 'video',
    'volume', 'weather', 'web',
    'website', 'with', 'zip',
    'content', 'contents',
];

const COMMON_WORDS_SORTED = Object.freeze(
    [...new Set(COMMON_ACTION_WORDS)]
        .map((w) => String(w).toLowerCase().trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
);

function splitLowerIdentifierIntoWords(lower) {
    const s = String(lower || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!s) return [];

    const words = [];
    let matchedChars = 0;
    let i = 0;
    while (i < s.length) {
        // digits chunk
        if (/\d/.test(s[i])) {
            let j = i + 1;
            while (j < s.length && /\d/.test(s[j])) j++;
            words.push(s.slice(i, j));
            matchedChars += (j - i);
            i = j;
            continue;
        }

        let match = '';
        for (const w of COMMON_WORDS_SORTED) {
            if (w.length <= 1) continue;
            if (s.startsWith(w, i)) {
                match = w;
                break;
            }
        }

        if (match) {
            words.push(match);
            matchedChars += match.length;
            i += match.length;
            continue;
        }

        // Unknown chunk: advance until we can match a word again.
        let j = i + 1;
        while (j < s.length) {
            const rest = s.slice(j);
            const nextIsWord = COMMON_WORDS_SORTED.some((w) => w.length > 1 && rest.startsWith(w));
            // Avoid splitting "contents" into "c" + "on" + "tents" style junk:
            // if we'd create a single-letter chunk only to match a connector, keep extending.
            if (nextIsWord) {
                const nextWord = COMMON_WORDS_SORTED.find((w) => w.length > 1 && rest.startsWith(w)) || '';
                const chunkLen = j - i;
                if (chunkLen <= 1 && ['on', 'in', 'or', 'to', 'of', 'and', 'for', 'from', 'with'].includes(nextWord)) {
                    // keep extending
                } else {
                    break;
                }
            }
            j++;
            if (j - i >= 8) break;
        }
        words.push(s.slice(i, j));
        i = j;
    }

    // Only accept if it meaningfully segmented (avoid turning everything into junk chunks).
    const coverage = matchedChars / Math.max(1, s.length);
    if (words.length >= 2 && coverage >= 0.55) return words;
    return [];
}

function normalizeSearchKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function formatActionNameForUI(raw) {
    const original = String(raw || '').trim();
    if (!original) return '';
    const normalized = normalizeActionKey(original);
    const override = ACTION_LABEL_OVERRIDES.get(normalized);
    if (override) return override;

    const dotParts = original.split('.').map(p => p.trim()).filter(Boolean);
    let parts = dotParts;
    if (parts.length > 1 && ACTION_LABEL_DROP_PREFIX.has(parts[0].toLowerCase())) {
        parts = parts.slice(1);
    }

    // Join remaining parts, split camelCase, clean common suffixes.
    let s = parts.join(' ');
    s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    s = s.replace(/_/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/\bIntent\b/g, '').replace(/\s+/g, ' ').trim();

    let rawWords = s.split(' ').filter(Boolean);
    // If it's still one glued-together identifier (e.g. "Addframetogif"), try to split it.
    const hasInternalCaps = /[A-Z]/.test(s.slice(1));
    const looksGlued = rawWords.length === 1 && !hasInternalCaps && /^[A-Za-z0-9]+$/.test(s) && s.length >= 6;
    if (looksGlued) {
        const split = splitLowerIdentifierIntoWords(s);
        if (split.length) rawWords = split;
    }

    // Avoid rendering "qrcode" as "Qrcode"
    rawWords = rawWords.flatMap((w) => (String(w).toLowerCase() === 'qrcode' ? ['qr', 'code'] : [w]));

    const words = rawWords.map((w, idx) => {
        const lower = String(w).toLowerCase();
        if (ACTION_LABEL_ACRONYMS.has(lower)) return lower.toUpperCase();
        // Keep small connector words lowercased unless first word.
        if (idx > 0 && ['to', 'of', 'and', 'or', 'in', 'on', 'with', 'for', 'from', 'each'].includes(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    });

    return words.join(' ').trim() || original;
}

function getActionDisplayLabel(action) {
    return formatActionNameForUI(action?.action || action?.title || '');
}

function actionHasLinkableOutput(action) {
    return Boolean(action);
}

function isConditionalAction(action) {
    const id = (action.action || action.title || '').toLowerCase();
    return id.includes('conditional') || id === 'if' || id === 'otherwise' || id === 'endif';
}

function isRepeatAction(action) {
    const id = (action.action || action.title || '').toLowerCase();
    return id.includes('repeat') || id === 'repeatwitheach' || id === 'repeatwith each';
}

function getRepeatItemsParamInfo(action) {
    const params = action?.params || {};
    const candidates = [
        ['Items', params.Items],
        ['RepeatItemVariableName', params.RepeatItemVariableName],
        ['WFRepeatItemVariableName', params.WFRepeatItemVariableName],
        ['ItemsIn', params.ItemsIn],
        ['WFInput', params.WFInput],
        ['List', params.List],
    ];
    for (const [key, value] of candidates) {
        if (value !== undefined && value !== null && String(value) !== '') {
            return { key, value };
        }
    }
    const actionName = String(action?.action || action?.title || '').toLowerCase();
    const isRepeatWithEach = actionName.includes('witheach') || actionName.includes('with each');
    return { key: isRepeatWithEach ? 'ItemsIn' : 'Items', value: '' };
}

function isMenuAction(action) {
    const id = (action.action || action.title || '').toLowerCase();
    return id.includes('choosefrommenu') || id === 'choose from menu';
}

function getMenuItemsFromParams(params) {
    if (!params || typeof params !== 'object') return [];
    const raw = params.WFMenuItems ?? params.MenuItems ?? params.Items ?? null;
    if (Array.isArray(raw)) {
        return raw.map(item => String(item ?? '').trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
}

function isDefaultMenuPrompt(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return false;
    if (isStandardPlaceholderToken(trimmed)) return true;
    const lower = trimmed.toLowerCase();
    return lower === 'select an option' || lower === 'choose an option' || lower === 'choose from menu';
}

function isControlAction(action) {
    return isConditionalAction(action) || isRepeatAction(action);
}

function deleteProject(id) {
    if (event) event.stopPropagation();
    showDeleteModal('project', id);
}

// ============ Chat ============
async function handleSend() {
    if (isGenerating) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    addMessageToUI(text, 'user');
    input.value = '';
    input.style.height = 'auto';

    if (currentProject) {
        currentProject.history.push({ role: 'user', content: text });
        saveProjects();
    }

    await callGenerateAPI(text);
}

function formatAssistantForUi(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';

    const hasMarkdown = /(^|\n)\s*[-*]\s+/m.test(raw)
        || /(^|\n)#{1,4}\s+/m.test(raw)
        || /```/.test(raw)
        || /\|.+\|/.test(raw);
    if (hasMarkdown) return raw;

    const sentences = raw.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
    const overview = sentences.shift() || raw;
    const detailCandidates = sentences.length ? sentences : raw.split(/;\s+|\n+/).filter(Boolean);
    const bullets = detailCandidates
        .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
        .filter(Boolean);
    const uniqueBullets = bullets.length ? Array.from(new Set(bullets)) : [overview];

    const sections = [
        '**Overview**',
        overview,
        '',
        '**Key Points**',
        uniqueBullets.map((line) => `- ${line}`).join('\n')
    ].filter(Boolean);

    return sections.join('\n');
}

function addMessageToUI(text, role) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `message ${role}`;
    const avatar = role === 'user'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
        : 'S';
    const displayText = role === 'assistant' ? formatAssistantForUi(text) : text;
    div.innerHTML = `<div class="message-avatar">${avatar}</div><div class="message-bubble">${formatMessage(displayText)}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    updateChatEmptyState();
    if (role === 'assistant') {
        updateMobileShortcutCard();
    }
}

function clearStreamingSummary(removeNode = false) {
    if (!streamingSummaryMessage) return;
    if (removeNode) {
        streamingSummaryMessage.node?.remove();
    }
    streamingSummaryMessage = null;
}

function clearStreamingThinking(removeNode = false) {
    if (!streamingThinkingMessage) return;
    if (removeNode) {
        streamingThinkingMessage.node?.remove();
    }
    streamingThinkingMessage = null;
}

function createStreamingSummaryMessage() {
    const container = document.getElementById('messages');
    if (!container) return null;
    const div = document.createElement('div');
    div.className = 'message assistant streaming';
    div.innerHTML = '<div class="message-avatar">S</div><div class="message-bubble"></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    updateChatEmptyState();
    return { node: div, bubble: div.querySelector('.message-bubble'), text: '' };
}

function createStreamingThinkingMessage() {
    const container = document.getElementById('messages');
    if (!container) return null;
    const div = document.createElement('div');
    div.className = 'message assistant streaming thinking-message';
    div.id = 'streaming-thinking';
    div.innerHTML = '<div class="message-avatar">S</div><div class="message-bubble thinking-bubble" style="color: var(--text-secondary); font-style: italic;"></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    updateChatEmptyState();
    return { node: div, bubble: div.querySelector('.message-bubble'), text: '' };
}

function appendStreamingThinking(delta) {
    if (!delta) return;
    if (!streamingThinkingMessage) {
        streamingThinkingMessage = createStreamingThinkingMessage();
    }
    if (!streamingThinkingMessage || !streamingThinkingMessage.bubble) return;
    streamingThinkingMessage.text += delta;
    streamingThinkingMessage.bubble.textContent = streamingThinkingMessage.text;
    const container = document.getElementById('messages');
    if (container) container.scrollTop = container.scrollHeight;
}

function appendStreamingSummary(delta) {
    if (!delta) return;
    if (!streamingSummaryMessage) {
        streamingSummaryMessage = createStreamingSummaryMessage();
    }
    if (!streamingSummaryMessage || !streamingSummaryMessage.bubble) return;
    streamingSummaryMessage.text += delta;
    streamingSummaryMessage.bubble.innerHTML = formatMessage(formatAssistantForUi(streamingSummaryMessage.text));
    const container = document.getElementById('messages');
    if (container) container.scrollTop = container.scrollHeight;
}

function finalizeStreamingSummary(finalText) {
    if (!streamingSummaryMessage) return false;
    if (typeof finalText === 'string' && finalText.trim()) {
        streamingSummaryMessage.text = finalText;
    }
    if (streamingSummaryMessage.bubble) {
        streamingSummaryMessage.bubble.innerHTML = formatMessage(formatAssistantForUi(streamingSummaryMessage.text));
    }
    streamingSummaryMessage.node?.classList.remove('streaming');
    updatePipelineProgress('summarize', 'completed', 'Summary delivered');
    streamingSummaryMessage = null;
    updateChatEmptyState();
    updateMobileShortcutCard();
    return true;
}

function updateChatEmptyState() {
    const emptyState = document.getElementById('chat-empty-state');
    const container = document.getElementById('messages');
    if (!emptyState || !container) return;
    const isMobile = window.matchMedia('(max-width: 1024px)').matches;
    if (!isMobile) {
        emptyState.classList.add('hidden');
        return;
    }
    const hasMessages = container.children.length > 0;
    emptyState.classList.toggle('hidden', hasMessages);
}

function formatMessage(text) {
    return renderMarkdown(String(text || ''));
}

let markdownRenderer = null;

function getMarkdownRenderer() {
    if (markdownRenderer) return markdownRenderer;
    const factory = window?.markdownit;
    if (typeof factory !== 'function') return null;
    const md = factory({
        html: false,
        linkify: true,
        breaks: true,
        typographer: true
    });
    const plugins = [
        window.markdownitFootnote,
        window.markdownitTaskLists,
        window.markdownitDeflist,
        window.markdownitEmoji,
        window.markdownitMark,
        window.markdownitIns,
        window.markdownitAbbr,
        window.markdownitSub,
        window.markdownitSup
    ].filter(fn => typeof fn === 'function');
    plugins.forEach(plugin => {
        try {
            if (plugin === window.markdownitTaskLists) {
                md.use(plugin, { enabled: true, label: true, labelAfter: false });
            } else {
                md.use(plugin);
            }
        } catch { }
    });

    const defaultRender =
        md.renderer.rules.link_open ||
        ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

    md.validateLink = (url) => Boolean(sanitizeMarkdownUrl(url));
    md.normalizeLink = (url) => sanitizeMarkdownUrl(url) || '';
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const hrefIndex = tokens[idx].attrIndex('href');
        if (hrefIndex >= 0) {
            const href = tokens[idx].attrs[hrefIndex][1];
            const safe = sanitizeMarkdownUrl(href);
            if (!safe) {
                tokens[idx].tag = 'span';
                tokens[idx].attrs = null;
                return '';
            }
            tokens[idx].attrs[hrefIndex][1] = safe;
            tokens[idx].attrSet('target', '_blank');
            tokens[idx].attrSet('rel', 'noopener noreferrer');
        }
        return defaultRender(tokens, idx, options, env, self);
    };

    markdownRenderer = md;
    return md;
}

function renderMarkdown(src) {
    const md = getMarkdownRenderer();
    if (md) return md.render(String(src || ''));
    return renderMarkdownFallback(src);
}

function renderMarkdownFallback(src) {
    const text = String(src || '').replace(/\r\n/g, '\n');
    if (!text) return '';

    const lines = text.split('\n');
    const blocks = [];
    let i = 0;

    const isFence = (line) => /^\s*```/.test(line);
    const isHeading = (line) => /^\s*#{1,6}\s+/.test(line);
    const isQuote = (line) => /^\s*>\s?/.test(line);
    const isUl = (line) => /^\s*[-*+]\s+/.test(line);
    const isOl = (line) => /^\s*\d+\.\s+/.test(line);
    const isHr = (line) => {
        const normalized = String(line || '').replace(/\s+/g, '');
        return /^[-*_]{3,}$/.test(normalized);
    };
    const splitTableRow = (line) => {
        let trimmed = String(line || '').trim();
        if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
        if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
        const cells = [];
        let current = '';
        let escape = false;
        for (let j = 0; j < trimmed.length; j++) {
            const ch = trimmed[j];
            if (escape) {
                current += ch;
                escape = false;
                continue;
            }
            if (ch === '\\') {
                escape = true;
                continue;
            }
            if (ch === '|') {
                cells.push(current.trim());
                current = '';
                continue;
            }
            current += ch;
        }
        cells.push(current.trim());
        return cells.map(cell => cell.replace(/\\\|/g, '|').replace(/\\\\/g, '\\'));
    };
    const isTableSeparator = (line) => {
        const trimmed = String(line || '').trim();
        if (!trimmed || !trimmed.includes('|')) return false;
        const cells = splitTableRow(trimmed);
        if (!cells.length) return false;
        return cells.every(cell => /^:?-{3,}:?$/.test(cell.trim()));
    };
    const getTableAlign = (cell) => {
        const trimmed = String(cell || '').trim();
        const starts = trimmed.startsWith(':');
        const ends = trimmed.endsWith(':');
        if (starts && ends) return 'center';
        if (ends) return 'right';
        if (starts) return 'left';
        return '';
    };

    while (i < lines.length) {
        const line = lines[i] ?? '';

        const fenceMatch = line.match(/^\s*```([a-zA-Z0-9_-]+)?\s*$/);
        if (fenceMatch) {
            const lang = (fenceMatch[1] || '').trim();
            i++;
            const codeLines = [];
            while (i < lines.length && !lines[i].match(/^\s*```\s*$/)) {
                codeLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) i++; // closing fence
            const code = codeLines.join('\n');
            const langAttr = lang ? ` data-lang="${escapeAttr(lang)}"` : '';
            blocks.push(`<pre><code${langAttr}>${escapeHtml(code)}</code></pre>`);
            continue;
        }

        if (!line.trim()) {
            i++;
            continue;
        }

        if (isHr(line)) {
            blocks.push('<hr>');
            i++;
            continue;
        }

        const headingMatch = line.match(/^\s*(#{1,6})\s+(.+?)\s*$/);
        if (headingMatch) {
            const level = headingMatch[1].length; // 1–6
            const headingText = headingMatch[2];
            const tag = level === 1 ? 'h3' : level === 2 ? 'h4' : level === 3 ? 'h5' : 'h6';
            blocks.push(`<${tag}>${renderInlineMarkdown(headingText)}</${tag}>`);
            i++;
            continue;
        }

        if (isQuote(line)) {
            const quoteLines = [];
            while (i < lines.length && isQuote(lines[i])) {
                quoteLines.push((lines[i] || '').replace(/^\s*>\s?/, ''));
                i++;
            }
            blocks.push(`<blockquote>${renderMarkdownFallback(quoteLines.join('\n'))}</blockquote>`);
            continue;
        }

        if (line.includes('|') && isTableSeparator(lines[i + 1])) {
            const headerCells = splitTableRow(line);
            const alignCells = splitTableRow(lines[i + 1]).map(getTableAlign);
            i += 2;
            const rows = [];
            while (i < lines.length) {
                const rowLine = lines[i] ?? '';
                if (!rowLine.trim()) break;
                if (!rowLine.includes('|')) break;
                if (isTableSeparator(rowLine)) break;
                rows.push(splitTableRow(rowLine));
                i++;
            }
            const colCount = Math.max(
                headerCells.length,
                rows.reduce((max, row) => Math.max(max, row.length), 0)
            );
            while (headerCells.length < colCount) headerCells.push('');
            while (alignCells.length < colCount) alignCells.push('');
            const alignAttr = (idx) => {
                const align = alignCells[idx] || '';
                return align ? ` style="text-align:${align}"` : '';
            };
            const headHtml = headerCells
                .map((cell, idx) => `<th${alignAttr(idx)}>${renderInlineMarkdown(cell)}</th>`)
                .join('');
            const bodyHtml = rows
                .map(row => {
                    const cells = row.slice(0, colCount);
                    while (cells.length < colCount) cells.push('');
                    const rowHtml = cells
                        .map((cell, idx) => `<td${alignAttr(idx)}>${renderInlineMarkdown(cell)}</td>`)
                        .join('');
                    return `<tr>${rowHtml}</tr>`;
                })
                .join('');
            blocks.push(`<div class="message-table"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
            continue;
        }

        if (isUl(line)) {
            const items = [];
            let hasTaskItem = false;
            while (i < lines.length && isUl(lines[i])) {
                const rawItem = lines[i] || '';
                const taskMatch = rawItem.match(/^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/);
                if (taskMatch) {
                    hasTaskItem = true;
                    items.push({
                        task: true,
                        checked: taskMatch[1].toLowerCase() === 'x',
                        text: taskMatch[2] || ''
                    });
                } else {
                    items.push({ task: false, text: rawItem.replace(/^\s*[-*+]\s+/, '') });
                }
                i++;
            }
            const listHtml = items.map(item => {
                if (item.task) {
                    const checked = item.checked ? ' checked' : '';
                    return `<li class="task-list-item"><input type="checkbox" disabled${checked}>${renderInlineMarkdown(item.text)}</li>`;
                }
                return `<li>${renderInlineMarkdown(item.text)}</li>`;
            }).join('');
            const listClass = hasTaskItem ? ' class="task-list"' : '';
            blocks.push(`<ul${listClass}>${listHtml}</ul>`);
            continue;
        }

        if (isOl(line)) {
            const items = [];
            while (i < lines.length && isOl(lines[i])) {
                items.push((lines[i] || '').replace(/^\s*\d+\.\s+/, ''));
                i++;
            }
            blocks.push(`<ol>${items.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ol>`);
            continue;
        }

        // Paragraph: collect until a blank line or another block opener.
        const paraLines = [];
        while (i < lines.length) {
            const l = lines[i] ?? '';
            if (!l.trim()) break;
            if (isFence(l) || isHeading(l) || isQuote(l) || isUl(l) || isOl(l) || isHr(l)) break;
            paraLines.push(l);
            i++;
        }
        const para = paraLines.join('\n');
        blocks.push(`<p>${renderInlineMarkdown(para).replace(/\n/g, '<br>')}</p>`);
    }

    return blocks.join('');
}

function renderInlineMarkdown(src) {
    const raw = String(src || '');

    // Split on inline code spans so we don't format inside them.
    const parts = [];
    const re = /`([^`]+)`/g;
    let last = 0;
    let m;
    while ((m = re.exec(raw)) !== null) {
        if (m.index > last) parts.push({ type: 'text', value: raw.slice(last, m.index) });
        parts.push({ type: 'code', value: m[1] });
        last = m.index + m[0].length;
    }
    if (last < raw.length) parts.push({ type: 'text', value: raw.slice(last) });

    return parts.map(part => {
        if (part.type === 'code') return `<code>${escapeHtml(part.value)}</code>`;

        let t = escapeHtml(part.value);
        // Keep regexes conservative so they don't cross HTML tags we inject.
        t = t.replace(/!\[([^\]]*?)\]\(([^)]+)\)/g, (_match, alt, url) => {
            const safeUrl = sanitizeMarkdownUrl(url);
            const altText = escapeAttr(decodeHtmlEntities(alt));
            if (!safeUrl) return escapeHtml(decodeHtmlEntities(alt));
            return `<img src="${escapeAttr(safeUrl)}" alt="${altText}">`;
        });
        t = t.replace(/~~([^<]+?)~~/g, '<del>$1</del>');
        t = t.replace(/\*\*([^<]+?)\*\*/g, '<strong>$1</strong>');
        t = t.replace(/\*([^<]+?)\*/g, '<em>$1</em>');
        t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
            const safeUrl = sanitizeMarkdownUrl(url);
            if (!safeUrl) return label;
            return `<a href="${escapeAttr(safeUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        });
        t = t.replace(/&lt;((?:https?:\/\/|mailto:|tel:|data:image\/)[^\s]+?)&gt;/gi, (_match, url) => {
            const safeUrl = sanitizeMarkdownUrl(url);
            const displayUrl = decodeHtmlEntities(url);
            if (!safeUrl) return escapeHtml(displayUrl);
            return `<a href="${escapeAttr(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayUrl)}</a>`;
        });
        return t;
    }).join('');
}

function sanitizeMarkdownUrl(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    const normalized = trimmed.replace(/&amp;/g, '&');
    const lower = normalized.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) return normalized;
    if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return normalized;
    if (lower.startsWith('data:image/')) return normalized;
    return '';
}

function escapeAttr(str) {
    return escapeHtml(String(str || '')).replace(/`/g, '&#96;');
}

function escapeJsString(str) {
    return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function decodeHtmlEntities(str) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = String(str || '');
    return textarea.value;
}

function showTypingIndicator() {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="message-avatar">S</div><div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    updateChatEmptyState();
}

function removeTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
    updateChatEmptyState();
}

function updateMarkdownPreview() {
    const preview = document.getElementById('markdown-preview');
    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

function setPipelineMode(mode) {
    pipelineMode = mode || 'default';
    const orbs = document.getElementById('pipeline-orbs');
    if (orbs) {
        orbs.classList.toggle('full-catalog', pipelineMode === 'full_catalog');
    }
}

const LIVE_HINTS = [
    'Thinking...',
    'Reading your request...',
    'Understanding intent...',
    'Browsing actions...',
    'Searching templates...',
    'Mapping actions to steps...',
    'Planning the workflow...',
    'Drafting the shortcut...',
    'Connecting inputs...',
    'Wiring outputs...',
    'Linking variables...',
    'Building the flow...',
    'Validating logic...',
    'Checking parameters...',
    'Polishing details...',
    'Almost there...',
    'Auto-checking permissions...',
    'Sequencing trigger logic...',
    'Inlining helpful defaults...',
    'Making sure outputs match...',
    'Tidying variable names...',
    'Formatting the reply with Markdown',
    'Analyzing your workflow...',
    'Finding the best actions...',
    'Optimizing step order...',
    'Cross-referencing capabilities...',
    'Parsing your requirements...',
    'Evaluating action compatibility...',
    'Structuring data flow...',
    'Assembling the pieces...',
    'Double-checking connections...',
    'Verifying action syntax...',
    'Preparing your automation...',
    'Resolving dependencies...',
    'Finalizing action chain...',
    'Reviewing edge cases...',
    'Smoothing transitions...',
    'Ensuring reliability...',
    'Running final checks...',
    'Wrapping things up...'
];

const LIVE_HINT_TICK_MS = 1200;

function setPipelineHint(text) {
    if (!text) return;
    const liveHintEl = document.getElementById('pipeline-live-hint');
    if (liveHintEl) liveHintEl.textContent = text;
}

function setLiveHint(text, lockMs = 1000) {
    if (!text) return;
    setPipelineHint(text);
    liveHintLockUntil = Date.now() + Math.max(0, lockMs);
}

function startLiveHintTicker() {
    stopLiveHintTicker();
    liveHintIndex = 0;
    liveHintLockUntil = 0;
    if (!LIVE_HINTS.length) return;
    setPipelineHint(LIVE_HINTS[0]);
    liveHintTimer = setInterval(() => {
        if (Date.now() < liveHintLockUntil) return;
        const hint = LIVE_HINTS[liveHintIndex % LIVE_HINTS.length];
        setPipelineHint(hint);
        liveHintIndex += 1;
    }, LIVE_HINT_TICK_MS);
}

function stopLiveHintTicker() {
    if (liveHintTimer) {
        clearInterval(liveHintTimer);
        liveHintTimer = null;
    }
    liveHintLockUntil = 0;
}

function safeParseJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function resetStreamingJsonState() {
    streamingJsonBuffer = '';
    streamingJsonActive = false;
    streamingJsonMeta = { name: '', summary: '', shortSummary: '', icon: '' };
    streamingJsonLastActionCount = 0;
    streamingJsonLastParsedLength = 0;
}

function setStreamingSummary(text) {
    const next = String(text || '');
    if (!streamingSummaryMessage) {
        streamingSummaryMessage = createStreamingSummaryMessage();
    }
    if (!streamingSummaryMessage || !streamingSummaryMessage.bubble) return;
    streamingSummaryMessage.text = next;
    streamingSummaryMessage.bubble.innerHTML = formatMessage(next);
    const container = document.getElementById('messages');
    if (container) container.scrollTop = container.scrollHeight;
}

function stripStreamingCodeFences(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed.startsWith('```')) return trimmed;
    return trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/, '').replace(/\s*```$/, '');
}

function attemptPartialProgramParseFromStream(partialJson) {
    if (!partialJson) return null;
    let str = stripStreamingCodeFences(partialJson);

    const parsed = safeParseJson(str);
    if (parsed) {
        if (Array.isArray(parsed.actions)) return parsed;
        if (parsed.program && Array.isArray(parsed.program.actions)) {
            const name = typeof parsed?.meta?.name === 'string'
                ? parsed.meta.name
                : (typeof parsed?.program?.name === 'string' ? parsed.program.name : (typeof parsed?.name === 'string' ? parsed.name : 'Building...'));
            return { name, actions: parsed.program.actions };
        }
    }

    const actionsMatch = str.match(/"actions"\s*:\s*\[/);
    if (!actionsMatch) return null;
    const actionsStart = actionsMatch.index + actionsMatch[0].length - 1;
    let depth = 0;
    let actionStart = -1;
    let actions = [];
    let inString = false;
    let escaped = false;

    for (let i = actionsStart; i < str.length; i++) {
        const ch = str[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;

        if (ch === '{') {
            if (depth === 1 && actionStart === -1) {
                actionStart = i;
            }
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 1 && actionStart !== -1) {
                const actionStr = str.slice(actionStart, i + 1);
                const action = safeParseJson(actionStr);
                if (action && action.action) actions.push(action);
                actionStart = -1;
            }
        } else if (ch === '[' && depth === 0) {
            depth = 1;
        } else if (ch === ']' && depth === 1) {
            break;
        }
    }

    if (!actions.length) return null;
    const nameMatch = str.match(/"name"\s*:\s*"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : 'Building...';
    return { name, actions };
}

function sliceJsonObject(raw, key) {
    if (!raw) return null;
    const re = new RegExp(`"${key}"\\s*:\\s*\\{`);
    const match = re.exec(raw);
    if (!match) return null;
    const start = match.index + match[0].length - 1;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = raw.length;
    for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;
        if (ch === '{') {
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0) {
                end = i + 1;
                break;
            }
        }
    }
    return raw.slice(start, end);
}

function decodeJsonStringFragment(raw) {
    let out = '';
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch !== '\\') {
            out += ch;
            continue;
        }
        if (i + 1 >= raw.length) break;
        const next = raw[i + 1];
        if (next === 'u') {
            const hex = raw.slice(i + 2, i + 6);
            if (hex.length < 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) break;
            out += String.fromCharCode(parseInt(hex, 16));
            i += 5;
            continue;
        }
        const map = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
        out += map[next] ?? next;
        i += 1;
    }
    return out;
}

function extractJsonStringValue(raw, key) {
    if (!raw) return null;
    const re = new RegExp(`"${key}"\\s*:\\s*"`);
    const match = re.exec(raw);
    if (!match) return null;
    const start = match.index + match[0].length;
    let i = start;
    let escaped = false;
    while (i < raw.length) {
        const ch = raw[i];
        if (escaped) {
            escaped = false;
            i += 1;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            i += 1;
            continue;
        }
        if (ch === '"') break;
        i += 1;
    }
    const rawValue = raw.slice(start, i);
    return { value: decodeJsonStringFragment(rawValue), complete: i < raw.length && raw[i] === '"' };
}

function extractStreamingMeta(raw) {
    const metaSlice = sliceJsonObject(raw, 'meta');
    if (!metaSlice) return null;
    const name = extractJsonStringValue(metaSlice, 'name');
    const summary = extractJsonStringValue(metaSlice, 'summary');
    const shortSummary = extractJsonStringValue(metaSlice, 'shortSummary');
    const icon = extractJsonStringValue(metaSlice, 'icon');
    const next = {};
    if (name?.value) next.name = name.value;
    if (summary?.value) next.summary = summary.value;
    if (shortSummary?.value) next.shortSummary = shortSummary.value;
    if (icon?.value) next.icon = icon.value;
    return Object.keys(next).length ? next : null;
}

function updateStreamingProjectName(name) {
    const trimmed = String(name || '').trim().slice(0, PROJECT_NAME_MAX);
    if (!trimmed) return;
    const mainInput = document.getElementById('project-name-input');
    if (mainInput && document.activeElement !== mainInput) {
        mainInput.value = trimmed;
    }
    const mobileInput = document.getElementById('mobile-project-name-input');
    if (mobileInput && document.activeElement !== mobileInput) {
        mobileInput.value = trimmed;
    }
    const mobileTitle = document.getElementById('mobile-shortcut-title');
    if (mobileTitle) {
        mobileTitle.textContent = trimmed;
    }
    updateInputCounters();
}

function updateStreamingProjectIcon(iconId) {
    const normalized = isValidProjectIcon(iconId) ? iconId : null;
    if (!normalized) return;
    const grid = document.getElementById('project-icon-grid');
    if (grid && grid.offsetParent !== null) {
        setProjectIconSelection(normalized);
    }
}

function applyStreamingMeta(meta) {
    if (!meta) return;
    if (typeof meta.name === 'string' && meta.name !== streamingJsonMeta.name) {
        streamingJsonMeta.name = meta.name;
        updateStreamingProjectName(meta.name);
    }
    if (typeof meta.summary === 'string' && meta.summary !== streamingJsonMeta.summary) {
        streamingJsonMeta.summary = meta.summary;
        if (meta.summary.trim()) {
            setStreamingSummary(meta.summary);
        }
    }
    if (typeof meta.shortSummary === 'string' && meta.shortSummary !== streamingJsonMeta.shortSummary) {
        let val = meta.shortSummary;
        if (val.length > PROJECT_DESCRIPTION_MAX) {
            val = '';
        }
        streamingJsonMeta.shortSummary = val;
    }
    if (typeof meta.icon === 'string') {
        const normalized = meta.icon.trim().toLowerCase();
        if (normalized && normalized !== streamingJsonMeta.icon) {
            streamingJsonMeta.icon = normalized;
            updateStreamingProjectIcon(normalized);
        }
    }
}

function ingestModelDelta(delta) {
    if (!delta) return;
    streamingJsonActive = true;
    streamingJsonBuffer += delta;
    if ((streamingJsonBuffer.length - streamingJsonLastParsedLength) < 4) return;
    streamingJsonLastParsedLength = streamingJsonBuffer.length;

    applyStreamingMeta(extractStreamingMeta(streamingJsonBuffer));

    const partial = attemptPartialProgramParseFromStream(streamingJsonBuffer);
    if (partial?.actions?.length) {
        const nextCount = partial.actions.length;
        if (nextCount > streamingJsonLastActionCount) {
            streamingJsonLastActionCount = nextCount;
            lastPartialProgramActions = cloneActionsForStreaming(partial.actions);
            renderPartialProgram(partial.actions, false);
        }
    }
}

// ============ AI API ============
function buildProgramPreviewActions(actions = currentActions) {
    if (!Array.isArray(actions)) return [];
    return actions.map(a => {
        const entry = {
            action: a.action || a.title || 'Unknown',
            params: stripInternalParamKeys(clonePlainObject(a.params || {}))
        };
        if (Array.isArray(a.then)) entry.then = buildProgramPreviewActions(a.then);
        if (Array.isArray(a.else)) entry.else = buildProgramPreviewActions(a.else);
        if (Array.isArray(a.do)) entry.do = buildProgramPreviewActions(a.do);
        if (Array.isArray(a.Cases)) {
            entry.Cases = a.Cases.map((c) => ({
                Title: c?.Title ?? c?.title ?? '',
                Actions: buildProgramPreviewActions(c?.Actions || [])
            }));
        }
        return entry;
    });
}

function getCurrentProgramPreviewText() {
    currentActions = ensureActionUUIDs(currentActions);
    const hasActions = Array.isArray(currentActions) && currentActions.length > 0;
    if (!hasActions) return '';
    const programObj = {
        name: currentProject?.name || 'My Shortcut',
        actions: buildProgramPreviewActions(currentActions)
    };
    return JSON.stringify(programObj, null, 2);
}

async function callGenerateAPI(userPrompt) {
    isGenerating = true;
    clearStreamingSummary(true);
    resetStreamingJsonState();
    clearPipelineRemovalTimer();
    lastPartialProgramActions = null;
    document.body.classList.add('is-generating'); // Mobile override trigger
    const isDiscussionMode = chatMode === 'discussion';
    if (!isDiscussionMode) {
        showPipelineOrbs();
    }
    showTypingIndicator();

    // Auto-Intro logic: if this is the very first generation for a new project
    const historyCount = (currentProject?.history || []).length;
    // user just sent one (so 1 user message). If <= 2 total messages (User + maybe 1 old sys), trigger intro.
    // Actually, let's just do it slightly after calling the API, or mock it locally.
    // User asked: "After the first animation orb action triggers... send 1-2 short paragraphs"

    // Removed auto-intro message injection; rely on real stream updates instead.

    try {
        const rawPlan = getStoredValue('plan') || 'free';
        const plan = (rawPlan === 'paid' || rawPlan === 'pro') ? 'paid' : 'free';
        // Default back to your preferred model; backend will fall back if it's unavailable.
        // Default back to your preferred model; backend will fall back if it's unavailable.
        // User requested ONLY gpt-oss-120b, NOT free.
        const model = getStoredValue('model') || 'openai/gpt-oss-120b';
        console.log(`[ShortcutStudio] Using model: ${model} (plan: ${plan})`);

        // Explicit instruction to ask for clarifications
        const followUpInstruction = `CRITICAL: If the user's request is vague or lacks specific details (e.g. "make a reminder"), you MUST ask clarifying questions before generating any code. Do not guess. Ask what specific details they need.`;


        const forcedActionsPayload = forcedActions;
        const forceInstruction = forcedActionsPayload.length
            ? `You MUST include these actions somewhere in the next response and any generated shortcut: ${forcedActionsPayload.map(f => f.action).join(', ')}. This is a minimum requirement; you may include other actions too.`
            : '';

        const userTurns = (currentProject?.history || []).filter(m => m.role === 'user');
        const isFollowUp = userTurns.length > 1;
        const mode = isDiscussionMode ? 'clarify' : (isFollowUp ? 'update' : 'plan');
        const basePrompt = userTurns[0]?.content || userPrompt;
        let programText = getCurrentProgramPreviewText();

        const historyLimit = plan === 'paid' ? 10 : 3;
        const recentHistory = currentProject?.history?.slice(-historyLimit) || [];
        const userInstructions = (getStoredValue('user_instructions') || '').trim();
        const context = {
            basePrompt,
            programText,
            history: recentHistory
        };
        if (userInstructions) {
            context.memory = userInstructions;
        }
        const body = {
            name: currentProject.name,
            prompt: userPrompt,
            followUp: isFollowUp,
            mode,
            context,
            history: recentHistory,
            model,
            plan,
            forcedActions: forcedActionsPayload,
            forceInstruction,
            style: 'concise'
        };

        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok || !response.body) {
            const errText = await response.text().catch(() => '');
            throw new Error(`Generation failed (${response.status}) ${errText.slice(0, 120)}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let sseBuffer = '';
        let finalData = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) {
                    sseBuffer = '';
                    continue;
                }
                if (trimmed.startsWith('event:') || trimmed.startsWith('id:')) continue;
                if (trimmed.startsWith('data:')) {
                    const chunk = trimmed.replace(/^data:\s*/, '');
                    if (!chunk || chunk === '[DONE]') continue;
                    const candidate = sseBuffer + chunk;
                    const packet = safeParseJson(candidate);
                    if (packet) {
                        sseBuffer = '';
                        console.log('[AI stream]', packet);
                        handleStreamPacket(packet);
                        if (packet.type === 'final' || packet.type === 'error') {
                            finalData = packet;
                        }
                    } else {
                        sseBuffer = candidate;
                    }
                    continue;
                }
                if (!trimmed.startsWith('{')) continue;
                const packet = safeParseJson(trimmed);
                if (!packet) continue;
                console.log('[AI stream]', packet);
                handleStreamPacket(packet);
                if (packet.type === 'final' || packet.type === 'error') {
                    finalData = packet;
                }
            }
        }

        isGenerating = false;
        document.body.classList.remove('is-generating');
        removeTypingIndicator();

        if (finalData) {
            handleFinalResponse(finalData);
        }
        schedulePipelineOrbsRemoval(900);
    } catch (err) {
        console.error('API Error:', err);
        clearStreamingSummary(true);
        resetStreamingJsonState();
        document.body.classList.remove('is-generating');
        removeTypingIndicator();
        schedulePipelineOrbsRemoval();
        addMessageToUI('Failed to connect to the AI service. Please try again.', 'assistant');
    }

    isGenerating = false;
}

function handleStreamPacket(packet) {
    if (!packet || typeof packet !== 'object') return;
    if (packet.type === 'ui' && typeof packet.pipelineMode === 'string') {
        setPipelineMode(packet.pipelineMode);
    }
    if (typeof packet.hint === 'string' && packet.hint.trim()) {
        setLiveHint(packet.hint, 1500);
    }
    // Ignore heartbeats - they're just for keeping connection alive
    if (packet.type === 'heartbeat') {
        return;
    }

    if (packet.type === 'status' && typeof packet.message === 'string') {
        setLiveHint(packet.message, 1200);
    }

    if (packet.type === 'progress') {
        // Map backend step names to frontend step names
        let backendStep = packet.step;
        if (backendStep === 'assess') {
            // Skip assess step - it's no longer part of the pipeline
            return;
        }
        updatePipelineProgress(backendStep, packet.status, packet.hint);
        if (typeof packet.hint === 'string' && packet.hint.trim()) {
            setLiveHint(packet.hint, 1800);
        }

        // Update progress percentage if available
        if (typeof packet.percent === 'number') {
            updateProgressPercent(packet.percent);
        }
    }

    if (packet.type === 'model_delta' && typeof packet.content === 'string') {
        if (chatMode === 'discussion') {
            appendStreamingSummary(packet.content);
        } else {
            ingestModelDelta(packet.content);
        }
    }

    // Live build visualization - render partial program as it streams
    if (packet.type === 'partial_program' && !streamingJsonActive) {
        const actions = Array.isArray(packet.actions)
            ? packet.actions
            : Array.isArray(packet.program?.actions)
                ? packet.program.actions
                : null;
        if (actions) {
            renderPartialProgram(actions, packet.complete);
        }
    }

    if (packet.type === 'thinking' && typeof packet.content === 'string') {
        // Stream model thinking to the hint line below orbs
        const hintEl = document.getElementById('pipeline-live-hint');
        if (hintEl) {
            hintEl.textContent = (hintEl.textContent || '') + packet.content;
        }
    }

    if (packet.type === 'summary_delta' && typeof packet.content === 'string' && !streamingJsonActive) {
        updatePipelineProgress('summarize', 'started', packet.hint || 'Summarizing your shortcut');
        appendStreamingSummary(packet.content);
    }

    // Handle cancellation
    if (packet.type === 'cancelled') {
        clearStreamingThinking(true);
        clearStreamingSummary(true);
        resetStreamingJsonState();
        removeTypingIndicator();
        schedulePipelineOrbsRemoval();
        addMessageToUI('Generation was cancelled.', 'assistant');
    }
}

// Progress percentage tracking
let currentProgressPercent = 0;
function updateProgressPercent(percent) {
    currentProgressPercent = percent;
    const percentEl = document.getElementById('pipeline-progress-percent');
    if (percentEl) {
        percentEl.textContent = `${percent}%`;
        percentEl.style.width = `${percent}%`;
    }
}

/**
 * Render partial program during streaming build
 * This creates a live preview effect as the AI builds the shortcut
 */
function renderPartialProgram(actions, isComplete) {
    if (!actions || !Array.isArray(actions)) return;
    lastPartialProgramActions = cloneActionsForStreaming(actions);

    // Only update if we have more actions than before
    const container = document.getElementById('actions-container');
    const emptyState = document.getElementById('empty-state');

    if (!container) return;

    // Hide empty state, show container
    if (emptyState) emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    const tempActions = cloneActionsForStreaming(actions);
    const normalized = normalizeControlFlowToNested(ensureActionUUIDs(tempActions));
    renderStreamingActionNodes(normalized, isComplete);
}

function cloneActionsForStreaming(actions) {
    if (!Array.isArray(actions)) return [];
    if (typeof structuredClone === 'function') {
        try {
            return structuredClone(actions);
        } catch { }
    }
    try {
        return JSON.parse(JSON.stringify(actions));
    } catch {
        return actions.map(act => ({ ...act }));
    }
}

function renderStreamingActionNodes(actions, isComplete) {
    const container = document.getElementById('actions-container');
    if (!container) return;

    // Clear and re-render
    container.innerHTML = '';

    const tree = buildActionTree(actions);
    renderNodeList(tree, container, true);

    const streamingNodes = container.querySelectorAll('.action-node, .if-block, .repeat-block, .menu-block');
    streamingNodes.forEach(node => node.classList.add('streaming'));

    if (!isComplete && container.lastElementChild) {
        container.lastElementChild.classList.add('action-building');
    }

    // Scroll to show latest action
    if (!isComplete && container.lastElementChild) {
        container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Preserve streamed details if the final payload drops nested actions or param values.
function isBlankValue(value) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
}

function isInternalParamKey(key) {
    const normalized = String(key || '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
    if (!normalized) return false;
    if (normalized === 'uuidstring' || normalized === 'groupingidentifier') return true;
    return normalized.endsWith('uuid');
}

function mergeParamObjects(finalParams, partialParams) {
    const finalObj = (finalParams && typeof finalParams === 'object' && !Array.isArray(finalParams))
        ? { ...finalParams }
        : {};
    if (!partialParams || typeof partialParams !== 'object' || Array.isArray(partialParams)) return finalObj;
    for (const [key, value] of Object.entries(partialParams)) {
        if (isInternalParamKey(key)) continue;
        if (isBlankValue(finalObj[key]) && !isBlankValue(value)) {
            finalObj[key] = clonePlainObject(value);
        }
    }
    return finalObj;
}

function findMatchingPartialAction(finalAction, partialList, used, index) {
    if (!finalAction || !Array.isArray(partialList)) return null;
    const finalKey = normalizeActionKey(finalAction.action || finalAction.title || finalAction);
    if (!finalKey) return null;

    const tryIndex = (idx) => {
        if (idx < 0 || idx >= partialList.length) return null;
        if (used.has(idx)) return null;
        const candidate = partialList[idx];
        const candidateKey = normalizeActionKey(candidate?.action || candidate?.title || candidate);
        if (candidateKey && candidateKey === finalKey) {
            used.add(idx);
            return candidate;
        }
        return null;
    };

    let match = tryIndex(index);
    if (match) return match;

    for (let offset = 1; offset <= 3; offset++) {
        match = tryIndex(index + offset);
        if (match) return match;
        match = tryIndex(index - offset);
        if (match) return match;
    }
    return null;
}

function mergeNestedActionList(finalList, partialList) {
    if (!Array.isArray(partialList) || partialList.length === 0) {
        return Array.isArray(finalList) ? finalList : [];
    }
    if (!Array.isArray(finalList) || finalList.length === 0) {
        return cloneActionsForStreaming(partialList);
    }
    return mergeActionList(finalList, partialList);
}

function mergeMenuCases(finalCases, partialCases) {
    const partialList = Array.isArray(partialCases) ? partialCases : [];
    if (partialList.length === 0) {
        return Array.isArray(finalCases) ? finalCases : [];
    }
    if (!Array.isArray(finalCases) || finalCases.length === 0) {
        return clonePlainObject(partialList);
    }
    const merged = finalCases.map((finalCase, idx) => {
        const partialCase = partialList[idx];
        if (!partialCase || typeof partialCase !== 'object') return finalCase;
        const mergedCase = { ...finalCase };
        const finalTitle = finalCase?.Title ?? finalCase?.title ?? '';
        const partialTitle = partialCase?.Title ?? partialCase?.title ?? '';
        if (isBlankValue(finalTitle) && !isBlankValue(partialTitle)) {
            mergedCase.Title = partialTitle;
        }
        const finalActions = Array.isArray(finalCase?.Actions)
            ? finalCase.Actions
            : (Array.isArray(finalCase?.actions) ? finalCase.actions : []);
        const partialActions = Array.isArray(partialCase?.Actions)
            ? partialCase.Actions
            : (Array.isArray(partialCase?.actions) ? partialCase.actions : []);
        mergedCase.Actions = mergeNestedActionList(finalActions, partialActions);
        return mergedCase;
    });
    if (partialList.length > finalCases.length) {
        merged.push(...clonePlainObject(partialList.slice(finalCases.length)));
    }
    return merged;
}

function mergeActionEntry(finalAction, partialAction) {
    if (finalAction == null) return finalAction;
    if (!partialAction) return finalAction;

    if (typeof finalAction === 'string') {
        const finalKey = normalizeActionKey(finalAction);
        const partialKey = normalizeActionKey(partialAction?.action || partialAction?.title || partialAction);
        if (partialKey && partialKey === finalKey && typeof partialAction === 'object') {
            return clonePlainObject(partialAction);
        }
        return finalAction;
    }

    if (typeof finalAction !== 'object') return finalAction;
    if (typeof partialAction !== 'object') return finalAction;

    const merged = clonePlainObject(finalAction);
    const hasFinalParams = merged.params && typeof merged.params === 'object' && !Array.isArray(merged.params);
    const hasPartialParams = partialAction.params && typeof partialAction.params === 'object' && !Array.isArray(partialAction.params);
    if (hasFinalParams || hasPartialParams) {
        merged.params = mergeParamObjects(merged.params, partialAction.params);
    }

    if (isConditionalAction(merged) || isConditionalAction(partialAction)) {
        merged.then = mergeNestedActionList(merged.then, partialAction.then);
        if (Object.prototype.hasOwnProperty.call(partialAction, 'else')) {
            merged.else = mergeNestedActionList(merged.else, partialAction.else);
        }
    }

    if (isRepeatAction(merged) || isRepeatAction(partialAction)) {
        merged.do = mergeNestedActionList(merged.do, partialAction.do);
    }

    if (isMenuAction(merged) || isMenuAction(partialAction)) {
        const partialCases = Array.isArray(partialAction.Cases)
            ? partialAction.Cases
            : (Array.isArray(partialAction.cases) ? partialAction.cases : []);
        merged.Cases = mergeMenuCases(merged.Cases, partialCases);
    }

    return merged;
}

function mergeActionList(finalList, partialList) {
    if (!Array.isArray(finalList) || finalList.length === 0) {
        return Array.isArray(partialList) ? cloneActionsForStreaming(partialList) : [];
    }
    if (!Array.isArray(partialList) || partialList.length === 0) {
        return finalList;
    }
    const used = new Set();
    return finalList.map((finalAction, index) => {
        const partialAction = findMatchingPartialAction(finalAction, partialList, used, index);
        return mergeActionEntry(finalAction, partialAction);
    });
}

function mergeFinalActionsWithPartial(finalActions, partialActions) {
    if (!Array.isArray(finalActions) || !Array.isArray(partialActions)) return finalActions;
    if (partialActions.length === 0) return finalActions;
    return mergeActionList(finalActions, partialActions);
}

function updatePipelineStep(step, status) {
    const stepEl = document.getElementById(`step-${step}`);
    if (!stepEl) return;
    stepEl.classList.remove('active', 'completed');
    if (status === 'started') stepEl.classList.add('active');
    else if (status === 'completed') stepEl.classList.add('completed');
}

function resetPipelineSteps() {
    clearPipelinePendingStart();
    currentPipelineStep = null;
    pipelineQueuedStep = null;
    pipelineQueuedHint = '';
    pipelinePendingCompletionStep = null;
    pipelinePendingCompletionHint = '';
    if (pipelineStepCompleteTimers && typeof pipelineStepCompleteTimers.forEach === 'function') {
        pipelineStepCompleteTimers.forEach((t) => { try { clearTimeout(t); } catch (e) { } });
        pipelineStepCompleteTimers.clear();
    }
    pipelineStepStartedAt?.clear?.();
    pipelineStepMinActiveMs.clear();

    PIPELINE_STEPS.forEach(({ id }) => {
        const el = document.getElementById(`step-${id}`);
        if (el) el.classList.remove('active', 'completed');
        const orb = document.getElementById(`orb-${id}`);
        orb?.classList.remove('active', 'completed');
    });
    PIPELINE_STEPS.forEach(({ id }) => {
        const hintEl = document.getElementById(`orb-hint-${id}`);
        if (hintEl) hintEl.textContent = getDefaultHint(id, 'idle');
    });
}

function updatePipelineProgress(step, status, hint = '') {
    const order = PIPELINE_STEPS.map(s => s.id);
    // Map backend steps to frontend steps (assess is skipped)
    const stepMap = {
        'search': 'catalog',
        'build': 'build',
        'summarize': 'summarize'
    };
    const frontendStep = stepMap[step] || step;
    const idx = order.indexOf(frontendStep);
    const now = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();

    if (status === 'started') {
        if (pipelinePendingStartTimer && pipelinePendingStartStep) {
            const pendingIdx = order.indexOf(pipelinePendingStartStep);
            if (frontendStep === pipelinePendingStartStep) {
                pipelinePendingStartHint = hint || pipelinePendingStartHint;
                return;
            }
            if (pendingIdx >= 0 && idx > pendingIdx) {
                pipelineQueuedStep = frontendStep;
                pipelineQueuedHint = hint || pipelineQueuedHint;
                return;
            }
        }

        const prevStep = idx > 0 ? order[idx - 1] : null;
        if (prevStep && !pipelineStepStartedAt.has(prevStep) && currentPipelineStep !== prevStep) {
            pipelineQueuedStep = frontendStep;
            pipelineQueuedHint = hint || pipelineQueuedHint;
            updatePipelineProgress(prevStep, 'started', '');
            return;
        }

        const applyStart = () => {
            const startHint = pipelinePendingStartHint || hint;
            const startNow = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
            clearPipelinePendingStart();
            const previousStep = currentPipelineStep;
            currentPipelineStep = frontendStep;
            clearPipelineStepTimer(frontendStep);
            pipelineStepStartedAt.set(frontendStep, startNow);
            if (previousStep !== frontendStep) {
                console.log(`[pipeline ${new Date().toISOString()}] advancing orb: ${previousStep || 'none'} -> ${frontendStep}`);
            }
            if (idx > 0) {
                for (let i = 0; i < idx; i++) {
                    clearPipelineStepTimer(order[i]);
                    updatePipelineOrb(order[i], 'completed');
                }
            }
            updatePipelineOrb(frontendStep, 'started', startHint);
            if (pipelinePendingCompletionStep === frontendStep) {
                const pendingHint = pipelinePendingCompletionHint;
                pipelinePendingCompletionStep = null;
                pipelinePendingCompletionHint = '';
                updatePipelineProgress(frontendStep, 'completed', pendingHint || '');
            }
            if (pipelineQueuedStep) {
                const queuedStep = pipelineQueuedStep;
                const queuedHint = pipelineQueuedHint;
                pipelineQueuedStep = null;
                pipelineQueuedHint = '';
                updatePipelineProgress(queuedStep, 'started', queuedHint || '');
            }
        };

        const prevStartedAt = prevStep ? pipelineStepStartedAt.get(prevStep) : null;
        const prevElapsed = (prevStep && typeof prevStartedAt === 'number') ? (now - prevStartedAt) : null;
        const prevMinMs = prevStep ? getPipelineMinActiveMs(prevStep) : MIN_PIPELINE_ACTIVE_MS;
        const delayMs = (prevStep && prevStep === currentPipelineStep && prevElapsed != null && prevElapsed < prevMinMs)
            ? (prevMinMs - prevElapsed)
            : 0;

        if (delayMs > 0) {
            clearPipelinePendingStart();
            pipelinePendingStartStep = frontendStep;
            pipelinePendingStartHint = hint || '';
            pipelinePendingStartTimer = setTimeout(applyStart, delayMs);
            return;
        }

        applyStart();
        return;
    }

    if (status === 'completed') {
        if (pipelinePendingStartStep === frontendStep) {
            pipelinePendingCompletionStep = frontendStep;
            pipelinePendingCompletionHint = hint || '';
            return;
        }
        const startedAt = pipelineStepStartedAt.get(frontendStep);
        const elapsed = typeof startedAt === 'number' ? (now - startedAt) : null;
        const stepMinMs = getPipelineMinActiveMs(frontendStep);
        const remaining = (elapsed != null && elapsed < stepMinMs)
            ? (stepMinMs - elapsed)
            : 0;

        clearPipelineStepTimer(frontendStep);

        const applyCompletion = () => {
            if (frontendStep === currentPipelineStep) updatePipelineOrb(frontendStep, 'completed', hint);
            else updatePipelineOrb(frontendStep, 'completed');
        };

        if (remaining > 0) {
            pipelineStepCompleteTimers.set(frontendStep, setTimeout(() => {
                pipelineStepCompleteTimers.delete(frontendStep);
                applyCompletion();
            }, remaining));
        } else {
            applyCompletion();
        }
        return;
    }

    updatePipelineOrb(frontendStep, status, hint);
}

function handleFinalResponse(data) {
    if (!data.ok) {
        addMessageToUI(`${data.message || 'An error occurred'}`, 'assistant');
        resetStreamingJsonState();
        return;
    }
    const isDiscussionMode = chatMode === 'discussion';
    if (currentProject) normalizeProjectMetadata(currentProject);
    const meta = data.meta && typeof data.meta === 'object' ? data.meta : null;
    const metaName = typeof meta?.name === 'string' ? meta.name.trim() : '';
    const nextName = metaName || (typeof data.finalName === 'string' ? data.finalName.trim() : '');
    const willApplyProgram = !!data.program && !isDiscussionMode;
    const canUpdateName = !!(currentProject && !currentProject.nameFrozen);
    const canUpdateDescription = !!(currentProject && !currentProject.descriptionFrozen);
    const canUpdateIcon = !!(currentProject && !currentProject.iconFrozen);
    const canUpdateColor = !!(currentProject && !currentProject.colorFrozen);
    const willApplyName = !!(nextName && currentProject && !isDiscussionMode && canUpdateName && nextName !== currentProject.name);
    let shortSummary = typeof meta?.shortSummary === 'string'
        ? meta.shortSummary.trim()
        : (typeof data.shortSummary === 'string' ? data.shortSummary.trim() : '');
    let shortSummaryOverLimit = false;
    if (shortSummary.length > PROJECT_DESCRIPTION_MAX) {
        shortSummary = '';
        shortSummaryOverLimit = true;
    }
    const iconChoice = typeof meta?.icon === 'string'
        ? meta.icon.trim()
        : (typeof data.iconChoice === 'string' ? data.iconChoice.trim() : '');
    const colorChoice = typeof meta?.color === 'string'
        ? meta.color.trim()
        : (typeof data.colorChoice === 'string' ? data.colorChoice.trim() : '');
    const assistantAnswer = typeof meta?.summary === 'string'
        ? meta.summary.trim()
        : (typeof data.answer === 'string' ? data.answer : '');
    updatePipelineProgress('summarize', 'started', 'Wrapping up the summary');
    if (willApplyProgram || willApplyName) {
        pushUndoState();
    }
    PIPELINE_STEPS.forEach(({ id }) => updatePipelineOrb(id, 'completed'));

    // Update project name from AI
    if (willApplyName) {
        currentProject.name = nextName;
        document.getElementById('project-name-input').value = nextName;
        currentProject.updated = Date.now();
        upsertMarketplaceItemFromProject(currentProject);
        updateMobileShortcutCard();
        updateInputCounters();
    }

    if ((shortSummary || shortSummaryOverLimit) && currentProject && !isDiscussionMode && canUpdateDescription) {
        if (shortSummary !== currentProject.description) {
            currentProject.description = shortSummary;
            currentProject.updated = Date.now();
            upsertMarketplaceItemFromProject(currentProject);
        }
    }

    if (iconChoice && currentProject && !isDiscussionMode && canUpdateIcon) {
        const normalizedIcon = isValidProjectIcon(iconChoice) ? iconChoice : null;
        if (normalizedIcon && normalizedIcon !== currentProject.icon) {
            currentProject.icon = normalizedIcon;
            currentProject.updated = Date.now();
            upsertMarketplaceItemFromProject(currentProject);
        }
    }

    // Update project color from AI
    if (colorChoice && currentProject && !isDiscussionMode && canUpdateColor) {
        const normalizedColor = isValidProjectColor(colorChoice) ? colorChoice : null;
        if (normalizedColor && normalizedColor !== currentProject.color) {
            currentProject.color = normalizedColor;
            currentProject.updated = Date.now();
            upsertMarketplaceItemFromProject(currentProject);
        }
    }

    // Store program object
    if (willApplyProgram) {
        if (Array.isArray(data.program?.actions) && Array.isArray(lastPartialProgramActions)) {
            data.program.actions = mergeFinalActionsWithPartial(data.program.actions, lastPartialProgramActions);
        }
        currentProgramObj = data.program;
        if (currentProject) currentProject.programObj = currentProgramObj;

        // Extract actions from program (preserve nested cases/blocks)
        if (Array.isArray(data.program.actions)) {
            const incoming = cloneActionsForStreaming(data.program.actions);
            incoming.forEach((action) => {
                if (!action || typeof action !== 'object') return;
                if (!action.params || typeof action.params !== 'object') action.params = {};
                if (Array.isArray(action.cases) && !Array.isArray(action.Cases)) {
                    action.Cases = action.cases;
                    delete action.cases;
                }
            });
            currentActions = normalizeControlFlowToNested(ensureActionUUIDs(incoming));
            if (currentProject) currentProject.actions = currentActions;
        }
    }

    lastPartialProgramActions = null;

    // Add AI response to chat
    if (assistantAnswer) {
        const usedStreaming = finalizeStreamingSummary(assistantAnswer);
        if (!usedStreaming) {
            addMessageToUI(assistantAnswer, 'assistant');
            updatePipelineProgress('summarize', 'completed', 'Summary delivered');
        }
        if (currentProject) {
            currentProject.history.push({ role: 'assistant', content: assistantAnswer });
        }
    } else {
        finalizeStreamingSummary();
    }

    saveProjects();
    if (willApplyProgram) {
        // Animate all actions from AI response
        renderActions(true);
    }
    updateUndoRedoButtons();
    resetStreamingJsonState();
}

// ============ Actions Preview ============
function renderActions(animateIds = null, options = {}) {
    const suppressAnimations = options?.suppressAnimations === true;
    const container = document.getElementById('actions-container');
    const emptyState = document.getElementById('empty-state');
    if (suppressAnimations && container) {
        container.classList.add('suppress-anim');
    }
    currentActions = ensureActionUUIDs(currentActions);
    currentActions = normalizeControlFlowToNested(currentActions);
    if (currentProject) {
        currentProject.actions = currentActions;
        saveProjects();
    }
    pruneMissingOutputLinks();
    rebuildOutputNameIndex(currentActions);
    buildSuggestedIdIndex(currentActions);
    updateProgramExportCache();

    if (currentActions.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        if (suppressAnimations && container) {
            container.classList.remove('suppress-anim');
        }
        updateMobileShortcutCard();
        return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = '';

    const tree = buildActionTree(currentActions);
    renderNodeList(tree, container, animateIds);
    initActionReordering();
    if (suppressAnimations && container) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => container.classList.remove('suppress-anim'));
        });
    }

    updateMobileShortcutCard();
}

function updateMobileShortcutCard() {
    const card = document.getElementById('mobile-shortcut-card');
    if (!card) return;
    if (!currentProject || !isWorkspacePage()) {
        card.classList.add('hidden');
        return;
    }
    const container = document.getElementById('messages');
    const chatPane = document.getElementById('chat-pane');
    if (chatPane && container && card.parentElement !== chatPane) {
        chatPane.insertBefore(card, container);
    }
    card.classList.remove('hidden');
    card.classList.remove('in-chat');
    const titleEl = document.getElementById('mobile-shortcut-title');
    const subEl = document.getElementById('mobile-shortcut-sub');
    const headerTitleInput = document.getElementById('mobile-project-name-input');
    
    // Update icon and color
    const iconEl = card.querySelector('.mobile-shortcut-icon');
    if (iconEl) {
        const iconId = currentProject.icon || DEFAULT_PROJECT_ICON;
        const color = currentProject.color || DEFAULT_PROJECT_COLOR;
        iconEl.innerHTML = getProjectIconSvg(iconId);
        iconEl.style.color = color;
        iconEl.style.background = hexToRgba(color, 0.16);
    }

    const name = getProjectDisplayName(currentProject);
    const actionCount = countActionsWithNested(currentActions || []);
    const updatedAt = currentProject?.updated || currentProject?.created || Date.now();
    const dateLabel = new Date(updatedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    if (titleEl) titleEl.textContent = name;
    if (headerTitleInput && document.activeElement !== headerTitleInput) {
        headerTitleInput.value = name;
    }
    if (subEl) subEl.textContent = `${actionCount} action${actionCount === 1 ? '' : 's'} - ${dateLabel}`;
}

function openMobilePreview() {
    document.body.classList.add('mobile-preview-open');
}

function closeMobilePreview() {
    document.body.classList.remove('mobile-preview-open');
}

function buildActionTree(actions) {
    const root = [];
    const stack = [{ id: null, target: root, node: null }];

    actions.forEach(action => {
        // Nested JSON format (already has then/else/do arrays)
        if (isConditionalAction(action) && (Array.isArray(action.then) || Array.isArray(action.else))) {
            const node = {
                type: 'if',
                action,
                children: buildActionTree(action.then || []),
                elseChildren: buildActionTree(action.else || [])
            };
            stack[stack.length - 1].target.push(node);
            return;
        }

        if (isRepeatAction(action) && Array.isArray(action.do)) {
            const node = { type: 'repeat', action, children: buildActionTree(action.do || []) };
            stack[stack.length - 1].target.push(node);
            return;
        }

        // Flat list format using WFControlFlowMode (legacy import).
        // If we're missing explicit control-flow markers, treat these as normal actions (no implicit nesting).
        if (isConditionalAction(action)) {
            const rawMode = action?.params?.WFControlFlowMode;
            const key = normalizeActionKey(action?.action || action?.title);
            const hasMode = !(rawMode === undefined || rawMode === null || rawMode === '');
            const mode = hasMode
                ? Number(rawMode)
                : (key === 'otherwise' ? 1 : (key === 'endif' ? 2 : null));
            if (mode == null || !Number.isFinite(mode)) {
                stack[stack.length - 1].target.push({ type: 'action', action });
                return;
            }

            const gid = action.params?.GroupingIdentifier || getActionUUID(action);
            if (mode === 0) {
                const node = { type: 'if', action, children: [], elseChildren: [] };
                stack[stack.length - 1].target.push(node);
                stack.push({ id: gid, target: node.children, node, inElse: false });
            } else if (mode === 1) {
                const idx = [...stack].reverse().findIndex(s => s.id === gid);
                if (idx !== -1) {
                    const realIdx = stack.length - 1 - idx;
                    const ref = stack[realIdx];
                    ref.target = ref.node.elseChildren;
                }
            } else if (mode === 2) {
                if (stack.length > 1 && stack[stack.length - 1].id === gid) {
                    stack.pop();
                } else {
                    const pos = stack.findIndex(s => s.id === gid);
                    if (pos > 0) stack.splice(pos, stack.length - pos);
                }
            }
            return;
        }

        if (isRepeatAction(action)) {
            const rawMode = action?.params?.WFControlFlowMode;
            const key = normalizeActionKey(action?.action || action?.title);
            const hasMode = !(rawMode === undefined || rawMode === null || rawMode === '');
            const mode = hasMode ? Number(rawMode) : (key === 'endrepeat' ? 2 : null);
            if (mode == null || !Number.isFinite(mode)) {
                stack[stack.length - 1].target.push({ type: 'action', action });
                return;
            }

            const gid = action.params?.GroupingIdentifier || getActionUUID(action);
            if (mode === 0) {
                const node = { type: 'repeat', action, children: [] };
                stack[stack.length - 1].target.push(node);
                stack.push({ id: gid, target: node.children, node });
            } else if (mode === 2) {
                if (stack.length > 1 && stack[stack.length - 1].id === gid) {
                    stack.pop();
                } else {
                    const pos = stack.findIndex(s => s.id === gid);
                    if (pos > 0) stack.splice(pos, stack.length - pos);
                }
            }
            return;
        }

        if (isMenuAction(action)) {
            const casesSource = Array.isArray(action.Cases) && action.Cases.length
                ? action.Cases
                : getMenuItemsFromParams(action.params || {}).map(title => ({ Title: title, Actions: [] }));
            const node = {
                type: 'menu',
                action,
                cases: casesSource.map(c => ({
                    title: c.Title,
                    children: buildActionTree(c.Actions || [])
                }))
            };
            stack[stack.length - 1].target.push(node);
            return;
        }


        stack[stack.length - 1].target.push({ type: 'action', action });
    });

    return root;
}

function renderNodeList(nodes, container, animateIds, depth = 0, parentMeta = { parentActionId: null, parentSection: 'root' }) {
    nodes.forEach((node, index) => {
        if (node.type === 'if') {
            const block = document.createElement('div');
            block.className = 'if-block';
            block.dataset.actionId = node.action.id;
            block.dataset.id = node.action.id;
            block.dataset.parentId = parentMeta?.parentActionId || '';
            block.dataset.parentSection = parentMeta?.parentSection || 'root';

            // Get IF condition parameters
            const input = node.action.params?.Input ?? node.action.params?.WFInput ?? (editMode ? '{{VARIABLE}}' : '');
            const compareTo = node.action.params?.CompareTo ?? node.action.params?.WFConditionalActionString ?? (editMode ? '{{STRING}}' : '');
            const conditionMeta = resolveConditionOptions(node.action, node.action.params?.Condition || node.action.params?.WFCondition || DEFAULT_CONDITION_OPTIONS);
            const unaryCondition = isUnaryCondition(conditionMeta.selected);
            const conditionInputHtml = editMode
                ? getInputForType(node.action.id, 'Condition', conditionMeta.optionsString, false)
                : `<span class="condition-value">${escapeHtml(conditionMeta.selected)}</span>`;
            const inputInputHtml = editMode ? getInputForType(node.action.id, 'Input', input, false) : `<span class="condition-value">${formatLinkedValue(input)}</span>`;
            const compareToInputHtml = unaryCondition ? '' : (editMode ? getInputForType(node.action.id, 'CompareTo', compareTo, false) : `<span class="condition-value">${formatLinkedValue(compareTo)}</span>`);
            const idPillHtml = buildIdPillHtml(node.action.id);

            const actionsHtml = editMode ? `
                        <div class="control-actions">
                            ${idPillHtml}
                            <button class="node-action-btn" onclick="duplicateAction(${node.action.id})" title="Duplicate"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                            <button class="node-action-btn delete" onclick="deleteAction(${node.action.id})" title="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                    ` : '';

            const thenEmpty = (!node.children || node.children.length === 0);
            const elseEmpty = (!node.elseChildren || node.elseChildren.length === 0);
            const thenEmptyHint = thenEmpty && editMode ? '<div class="empty-section-hint">place actions here</div>' : '';
            const elseEmptyHint = elseEmpty && editMode ? '<div class="empty-section-hint">place actions here</div>' : '';
            const dropZoneClass = editMode ? 'drop-zone' : '';
            const dragHandle = editMode ? '<div class="node-drag-handle" data-reorder-handle="true" title="Drag to reorder" style="touch-action:none; user-select:none;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2"></circle><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="9" cy="18" r="2"></circle><circle cx="15" cy="18" r="2"></circle></svg></div>' : '';

            block.innerHTML = `
	                        <div class="if-header">
	                            ${dragHandle}
	                            <div class="if-condition-line">
	                                <span class="if-label">If</span>
	                                ${inputInputHtml}
	                                ${conditionInputHtml}
                                ${compareToInputHtml}
                                <span class="if-then-label">Then</span>
                            </div>
                            ${actionsHtml}
                        </div>
                        <div class="if-then ${thenEmpty ? 'empty-section' : ''} ${dropZoneClass}" data-drop-zone="if-then" data-action-id="${node.action.id}">
                            ${thenEmpty ? '' : '<div class="control-section-content"></div>'}
                            ${thenEmptyHint}
                        </div>
                        <div class="if-else-divider">Otherwise</div>
                        <div class="if-else ${elseEmpty ? 'empty-section' : ''} ${dropZoneClass}" data-drop-zone="if-else" data-action-id="${node.action.id}">
                            ${elseEmpty ? '' : '<div class="control-section-content"></div>'}
                            ${elseEmptyHint}
                        </div>
                        <div class="if-end">End</div>
                    `;
            if (node.children && node.children.length > 0) {
                const thenContainer = block.querySelector('.if-then .control-section-content');
                if (thenContainer) {
                    renderNodeList(node.children, thenContainer, animateIds, depth + 1, { parentActionId: node.action.id, parentSection: 'then' });
                }
            }
            if (node.elseChildren && node.elseChildren.length > 0) {
                const elseContainer = block.querySelector('.if-else .control-section-content');
                if (elseContainer) {
                    renderNodeList(node.elseChildren, elseContainer, animateIds, depth + 1, { parentActionId: node.action.id, parentSection: 'else' });
                }
            }
            container.appendChild(block);
        } else if (node.type === 'repeat') {
            const block = document.createElement('div');
            block.className = 'repeat-block';
            block.dataset.actionId = node.action.id;
            block.dataset.id = node.action.id;
            block.dataset.parentId = parentMeta?.parentActionId || '';
            block.dataset.parentSection = parentMeta?.parentSection || 'root';

            // Get REPEAT parameters - check if it's RepeatWithEach
            const actionName = (node.action.action || '').toLowerCase();
            const isRepeatWithEach = actionName.includes('witheach') || actionName.includes('with each');
            const repeatCount = node.action.params?.Count || node.action.params?.WFRepeatCount || '';
            const repeatItemsInfo = getRepeatItemsParamInfo(node.action);
            const repeatItems = repeatItemsInfo.value || '';
            const repeatIdPillHtml = buildIdPillHtml(node.action.id);

            const actionsHtml = editMode ? `
                        <div class="control-actions">
                            ${repeatIdPillHtml}
                            <button class="node-action-btn" onclick="duplicateAction(${node.action.id})" title="Duplicate"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                            <button class="node-action-btn delete" onclick="deleteAction(${node.action.id})" title="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                    ` : '';

            const emptyBodyClass = (!node.children || node.children.length === 0) ? 'empty-section' : '';
            const emptyHint = (!node.children || node.children.length === 0) && editMode ? '<div class="empty-section-hint">place actions here</div>' : '';
            const dropZoneClass = editMode ? 'drop-zone' : '';
            const dragHandle = editMode ? '<div class="node-drag-handle" data-reorder-handle="true" title="Drag to reorder" style="touch-action:none; user-select:none;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2"></circle><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="9" cy="18" r="2"></circle><circle cx="15" cy="18" r="2"></circle></svg></div>' : '';

            let repeatHeaderHtml = '';
            if (isRepeatWithEach || repeatItems) {
                const itemsValue = editMode ? (repeatItems || '{{VARIABLE}}') : repeatItems;
                const itemsInputHtml = editMode
                    ? getInputForType(node.action.id, repeatItemsInfo.key, itemsValue, false)
                    : `<span class="repeat-value">${formatLinkedValue(itemsValue || '')}</span>`;
                repeatHeaderHtml = `
                            <div class="repeat-condition-line">
                                <span class="repeat-label">Repeat with each item in</span>
                                ${itemsInputHtml}
                            </div>
                        `;
            } else if (repeatCount) {
                const countValue = editMode ? repeatCount : repeatCount;
                const countInputHtml = editMode ? getInputForType(node.action.id, 'Count', countValue, false) : `<span class="repeat-value">${formatLinkedValue(countValue)}</span>`;
                repeatHeaderHtml = `
                            <div class="repeat-condition-line">
                                <span class="repeat-label">Repeat</span>
                                ${countInputHtml}
                                <span class="repeat-text">times</span>
                            </div>
                        `;
            } else {
                const countValue = editMode ? '{{NUMBER}}' : '';
                const countInputHtml = editMode ? getInputForType(node.action.id, 'Count', countValue, false) : `<span class="repeat-value">${formatLinkedValue(countValue)}</span>`;
                repeatHeaderHtml = `
                            <div class="repeat-condition-line">
                                <span class="repeat-label">Repeat</span>
                                ${countInputHtml}
                                <span class="repeat-text">times</span>
                            </div>
                        `;
            }

            block.innerHTML = `
	                        <div class="repeat-header">
	                            ${dragHandle}
	                            ${repeatHeaderHtml}
                                ${actionsHtml}
	                        </div>
                        <div class="repeat-body ${emptyBodyClass} ${dropZoneClass}" data-drop-zone="repeat" data-action-id="${node.action.id}">
                            ${emptyBodyClass ? '' : '<div class="control-section-content"></div>'}
                            ${emptyHint}
                        </div>
                        <div class="repeat-end">End</div>
                    `;
            block.dataset.id = node.action.id;
            block.dataset.type = node.action.action;
            if (node.children && node.children.length > 0) {
                const body = block.querySelector('.repeat-body .control-section-content');
                if (body) {
                    renderNodeList(node.children, body, animateIds, depth + 1, { parentActionId: node.action.id, parentSection: 'do' });
                }
            }
            container.appendChild(block);
        } else if (node.type === 'menu') {
            const block = document.createElement('div');
            block.className = 'menu-block';
            block.dataset.actionId = node.action.id;
            block.dataset.id = node.action.id;
            block.dataset.parentId = parentMeta?.parentActionId || '';
            block.dataset.parentSection = parentMeta?.parentSection || 'root';

            const promptRaw = node.action.params?.Prompt ?? node.action.params?.WFMenuPrompt ?? '';
            const promptValue = isDefaultMenuPrompt(promptRaw) ? '' : (promptRaw || '');
            const shouldShowPrompt = editMode || String(promptValue || '').trim().length > 0;
            const promptHtml = shouldShowPrompt
                ? (editMode
                    ? getInputForType(node.action.id, 'Prompt', promptValue, false)
                    : `<span class="menu-value">${formatLinkedValue(promptValue)}</span>`)
                : '';

            const actionsHtml = editMode ? `
                        <div class="control-actions">
                            ${buildIdPillHtml(node.action.id)}
                            <button class="node-action-btn" onclick="duplicateAction(${node.action.id})" title="Duplicate"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                            <button class="node-action-btn delete" onclick="deleteAction(${node.action.id})" title="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                    ` : '';

            const dragHandle = editMode ? '<div class="node-drag-handle" data-reorder-handle="true" title="Drag to reorder" style="touch-action:none; user-select:none;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2"></circle><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="9" cy="18" r="2"></circle><circle cx="15" cy="18" r="2"></circle></svg></div>' : '';

            const cases = Array.isArray(node.cases) ? node.cases : [];
            const caseTitles = cases.map((menuCase, idx) => menuCase?.title || `Option ${idx + 1}`);
            let displayItems = caseTitles.length ? caseTitles : getMenuItemsFromParams(node.action.params || {});
            if (!displayItems.length && editMode) displayItems = ['Option 1'];

            const menuItemsRows = displayItems.map((title, idx) => {
                const rowTitle = escapeAttr(title);
                const canRemove = editMode && displayItems.length > 1;
                const titleHtml = editMode
                    ? `<input type="text" class="menu-item-input" value="${rowTitle}" onchange="updateMenuCaseTitle(${node.action.id}, ${idx}, this.value)" onblur="updateMenuCaseTitle(${node.action.id}, ${idx}, this.value)">`
                    : `<span class="menu-item-label">${escapeHtml(title)}</span>`;
                const removeBtn = canRemove
                    ? `<button class="node-action-btn menu-item-remove" onclick="removeMenuCase(${node.action.id}, ${idx})" title="Remove item">-</button>`
                    : '';
                return `
                            <div class="menu-item-row">
                                ${titleHtml}
                                ${removeBtn}
                            </div>
                        `;
            }).join('');

            const menuItemsFooter = editMode
                ? `
                        <div class="menu-items-footer">
                            <button class="node-action-btn menu-item-add" onclick="addMenuCase(${node.action.id})" title="Add item">+</button>
                            <span class="menu-items-count">${displayItems.length} items</span>
                        </div>
                    `
                : `
                        <div class="menu-items-footer">
                            <span class="menu-items-count">${displayItems.length} items</span>
                        </div>
                    `;

            const menuItemsHtml = (displayItems.length || editMode)
                ? `
                        <div class="menu-items-panel">
                            <div class="menu-items-list">
                                ${menuItemsRows}
                            </div>
                            ${menuItemsFooter}
                        </div>
                    `
                : '';

            const promptRow = promptHtml
                ? `
                        <div class="node-params menu-params">
                            <div class="node-param">
                                <span class="param-label">Prompt</span>
                                ${promptHtml}
                            </div>
                        </div>
                    `
                : '';

            block.innerHTML = `
	                        <div class="menu-header">
	                            ${dragHandle}
	                            <div class="menu-title-line">
	                                <span class="menu-label">Choose From Menu</span>
	                            </div>
                                ${actionsHtml}
	                        </div>
                            ${promptRow}
                            ${menuItemsHtml}
                            <div class="menu-cases"></div>
                            <div class="menu-end">End Menu</div>
                        `;

            const casesWrap = block.querySelector('.menu-cases');
            const casesToRender = caseTitles.length
                ? cases
                : displayItems.map((title) => ({ title, children: [] }));
            const dropZoneClass = editMode ? 'drop-zone' : '';

            casesToRender.forEach((menuCase, caseIndex) => {
                const caseTitle = menuCase?.title || `Option ${caseIndex + 1}`;
                const caseEmpty = (!menuCase?.children || menuCase.children.length === 0);
                const emptyHint = caseEmpty && editMode ? '<div class="empty-section-hint">place actions here</div>' : '';
                const caseEl = document.createElement('div');
                caseEl.className = 'menu-case';
                caseEl.innerHTML = `
                            <div class="menu-case-title">
                                <span class="menu-case-name">${escapeHtml(caseTitle)}</span>
                            </div>
                            <div class="menu-case-body ${caseEmpty ? 'empty-section' : ''} ${dropZoneClass}" data-drop-zone="menu-case" data-action-id="${node.action.id}" data-case-index="${caseIndex}">
                                ${caseEmpty ? '' : '<div class="control-section-content"></div>'}
                                ${emptyHint}
                            </div>
                        `;
                casesWrap?.appendChild(caseEl);
                if (!caseEmpty) {
                    const body = caseEl.querySelector('.menu-case-body .control-section-content');
                    if (body) {
                        renderNodeList(menuCase.children, body, animateIds, depth + 1, { parentActionId: node.action.id, parentSection: `case:${caseIndex}` });
                    }
                }
            });

            container.appendChild(block);
        } else {
            const shouldAnimate = animateIds === true || (Array.isArray(animateIds) && animateIds.includes(node.action.id));
            const actionNode = createActionNode(node.action, index, shouldAnimate, parentMeta);
            container.appendChild(actionNode);
        }
    });
}

function createActionNode(action, index, shouldAnimate = false, parentMeta = { parentActionId: null, parentSection: 'root' }) {
    const node = document.createElement('div');
    node.className = 'action-node';
    if (shouldAnimate && animationsEnabled) {
        node.classList.add('settling');
        node.style.animationDelay = `${index * 0.1}s`;
    }
    node.dataset.id = action.id;
    node.dataset.index = index;
    node.dataset.type = action.action;
    node.dataset.parentId = parentMeta?.parentActionId || '';
    node.dataset.parentSection = parentMeta?.parentSection || 'root';

    // Get output information
    const outputInfo = getActionOutputInfo(action);
    const outputUUID = outputInfo?.outputUUID || null;
    const outputDisplay = outputInfo ? humanizeOutputName(outputInfo.outputName) : '';
    const showOutputBadge = Boolean(outputUUID && actionHasLinkableOutput(action));
    if (showOutputBadge) node.classList.add('has-output');
    const outputHtml = showOutputBadge ? `<div class="node-output" data-output-uuid="${escapeHtml(String(outputUUID))}" title="Output: ${escapeHtml(outputDisplay)}">
		                <span class="output-label">${escapeHtml(outputDisplay)}</span>
		            </div>` : '';

    let paramsHtml = '';
    // Show params if in edit mode OR if they have a value (not empty/default)
    if (!isControlAction(action) && (editMode || (action.params && Object.keys(action.params).length > 0))) {
        let hasVisibleParams = false;
        let innerHtml = '<div class="node-params">';
        const paramsObj = action.params || {};
        for (const [key, value] of Object.entries(paramsObj)) {
            // Skip UUID/OutputUUID/GroupingIdentifier as they're internal
            const lowerKey = String(key).toLowerCase();
            if (lowerKey === 'id' || lowerKey === 'uuid' || lowerKey === 'outputuuid' || lowerKey === 'groupingidentifier' || lowerKey === 'providedoutputuuid') {
                continue;
            }
            // Always show params in edit mode, or if they have a non-placeholder value in view mode
            const strVal = String(value ?? '');
            const isPlaceholder = isStandardPlaceholderToken(strVal);
            const displayValue = strVal;
            // Show if edit mode OR (has value AND not a placeholder)
            if (editMode || (displayValue && !isPlaceholder)) {
                hasVisibleParams = true;
                const inputHtml = getInputForType(action.id, key, value, !editMode);
                const paramClass = inputHtml.includes('param-checkbox') ? 'node-param checkbox-param' : 'node-param';
                innerHtml += `
                            <div class="${paramClass}">
                                <span class="param-label">${escapeHtml(key)}</span>
                                ${inputHtml}
                            </div>
                        `;
            }
        }
        innerHtml += '</div>';
        if (hasVisibleParams) {
            paramsHtml = innerHtml;
        }
    }

    const actionsHtml = editMode ? `
                <div class="node-header-right">
                    ${buildIdPillHtml(action.id)}
                    <div class="node-actions">
                        <button class="node-action-btn" onclick="duplicateAction(${action.id})" title="Duplicate"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                        <button class="node-action-btn delete" onclick="deleteAction(${action.id})" title="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                </div>
            ` : '';

    const dragHandle = editMode ? '<div class="node-drag-handle" data-reorder-handle="true" title="Drag to reorder" style="touch-action:none; user-select:none;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2"></circle><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="9" cy="18" r="2"></circle><circle cx="15" cy="18" r="2"></circle></svg></div>' : '';

    const companyBadgeHtml = getCompanyBadgeHtml(action.action);

    node.innerHTML = `
			                ${dragHandle}
			                <div class="node-icon">${getActionIcon(action.action)}</div>
			                <div class="node-content">
			                    <div class="node-header">
			                        <span class="node-title">${escapeHtml(getActionDisplayLabel(action) || (action.title || action.action))}${companyBadgeHtml}</span>
			                        ${outputHtml}
			                        ${actionsHtml}
			                    </div>
			                    ${paramsHtml}
			                </div>
			            `;
    return node;
}

function getInputForType(actionId, key, value, readonly = false) {
    if (String(key).toLowerCase() === 'uuid') {
        return '';
    }
    if (String(key).toLowerCase() === 'id') {
        const idLabel = getIdLabelForDisplay(value);
        if (readonly) {
            return `<span class="param-value param-id-display">${escapeHtml(idLabel || '')}</span>`;
        }
        const contextMenuAttr = '';
        return `<input type="text" class="param-value param-id-input" data-action-id="${actionId}" data-param="${escapeHtml(key)}" value="${escapeHtml(idLabel)}" placeholder="ID" onblur="handleIdInputBlur(this)" ${contextMenuAttr}>`;
    }
    const action = findActionLocation(actionId)?.action;
    if (action && isListEditorAction(action) && isListEditorParam(key)) {
        return renderListEditor(actionId, key, value, readonly);
    }
    if (!paramKeySupportsInlineLinks(key) && shouldUseVariableDropdown(value)) {
        if (readonly) {
            const display = resolveVariableSelectValue(value);
            return display ? `<span class="linked-value-inline">${escapeHtml(humanizeOutputName(normalizeIdLabel(display) || display))}</span>` : '';
        }
        const selectedValue = resolveVariableSelectValue(value);
        const options = getVariableDropdownOptions(actionId);
        const optionValues = new Set(options.map(opt => opt.value));
        if (selectedValue && !optionValues.has(selectedValue)) {
            const isVarToken = /^!var:/i.test(selectedValue);
            const resolvedLabel =
                (isVarToken ? selectedValue.slice(5) : null) ||
                resolveOutputNameByUUID(selectedValue, null) ||
                resolveOutputNameByUUID(normalizeIdLabel(selectedValue), null) ||
                normalizeIdLabel(selectedValue) ||
                selectedValue;
            options.unshift({ value: selectedValue, label: humanizeOutputName(resolvedLabel) });
        }
        const placeholderOption = `<option value="" disabled ${selectedValue ? '' : 'selected'}>Enter variable</option>`;
        const noneOption = `<option value="__none__">(none)</option>`;
        const optionHtml = options.map(opt => `<option value="${escapeAttr(opt.value)}" ${opt.value === selectedValue ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('');
        const selectClass = `param-value param-select param-variable-select${selectedValue ? ' selected' : ''}`;
        const contextMenuAttr = 'oncontextmenu="showVariableMenu(event, this)"';
        return `<select class="${selectClass}" data-action-id="${actionId}" data-param="${escapeHtml(key)}" onchange="handleVariableSelectChange(this)" ${contextMenuAttr}>${placeholderOption}${noneOption}${optionHtml}</select>`;
    }
    if (key === 'Condition' || key === 'WFCondition') {
        const { optionsString, options, selected } = getConditionOptionsById(actionId, value);
        const selectedValue = options.includes(selected) ? selected : (options[0] || selected);
        const optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}" ${opt === selectedValue ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
        const fullOptionsString = optionsString || DEFAULT_CONDITION_OPTIONS;
        const contextMenuAttr = readonly ? '' : 'oncontextmenu="showVariableMenu(event, this)"';
        return `<select class="param-value param-select" data-action-id="${actionId}" data-param="${escapeHtml(key)}" data-full-options="${escapeHtml(fullOptionsString)}" ${readonly ? 'disabled' : ''} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)" ${contextMenuAttr}>${optionsHtml}</select>`;
    }
    const isObjectVal = value && typeof value === 'object' && !Array.isArray(value);
    if (isObjectVal) {
        const outputUUID = value?.Value?.OutputUUID || value?.OutputUUID || '';
        const storedOutputName = value?.Value?.OutputName || value?.OutputName || null;
        const outputName = resolveOutputNameByUUID(outputUUID, storedOutputName) || 'Linked Output';
        const safeParam = escapeHtml(key).replace(/'/g, "\\'");
        const displayName = humanizeOutputName(outputName);
        return `<div class="linked-output" data-output-uuid="${escapeHtml(outputUUID)}" title="Linked from: ${escapeHtml(outputName)}">
	                    <span class="linked-output-label">${escapeHtml(displayName)}</span>
	                    ${!readonly ? `<button type="button" class="node-action-btn" onclick="clearLinkedParam(${actionId}, '${safeParam}')" title="Unlink">Unlink</button>` : ''}
	                </div>`;
    }

    const strValue = String(value);
    const disabledAttr = readonly ? 'disabled' : '';
    const isTextLikeField = paramKeySupportsInlineLinks(key);

    if (isTextLikeField) {
        if (readonly) {
            return `<div class="param-value param-mixed-content">${formatLinkedValue(strValue)}</div>`;
        }
        const placeholder = getRichInputPlaceholder(key, strValue);
        const normalizedValue = STANDARD_PLACEHOLDER_RE.test(strValue.trim()) ? '' : strValue;
        const richHtml = formatRichInputHtml(normalizedValue);
        const contextMenuAttr = 'oncontextmenu="showVariableMenu(event, this)"';
        const inputHtml = `<div class="param-value param-rich-input" contenteditable="true" data-action-id="${actionId}" data-param="${escapeHtml(key)}" data-placeholder="${escapeAttr(placeholder)}" onblur="handleRichInputBlur(this)" ${contextMenuAttr}>${richHtml}</div>`;
        return wrapWithVariableInsert(inputHtml, readonly);
    }

    // Check for !ID: tokens first
    const trimmedValue = strValue.trim();
    const isPureLinkToken = isIdToken(trimmedValue) || /^!link:[^\s]+$/i.test(trimmedValue);
    if (isPureLinkToken && !isTextLikeField) {
        const linkLabel = normalizeIdLabel(trimmedValue);
        const resolvedName =
            resolveOutputNameByUUID(trimmedValue, null) ||
            resolveOutputNameByUUID(linkLabel, null) ||
            linkLabel;
        const displayName = humanizeOutputName(resolvedName);
        const safeParam = escapeHtml(key).replace(/'/g, "\\'");
        return `<div class="linked-output" data-link-label="${escapeHtml(linkLabel)}" title="Linked from: ${escapeHtml(linkLabel)}">
                    <span class="linked-output-label">${escapeHtml(displayName)}</span>
                    ${!readonly ? `<button type="button" class="node-action-btn" onclick="clearLinkedParam(${actionId}, '${safeParam}')" title="Unlink">Unlink</button>` : ''}
                </div>`;
    }

    // Check for variables like {{Ask Each Time}} - show as blue box
    const variableMatch = strValue.match(/^\{\{([^}]+)\}\}$/);
    if (variableMatch) {
        const varName = variableMatch[1].trim();
        // Check if it's a standard placeholder (STRING, VARIABLE, NUMBER, etc.)
        const isStandardPlaceholder = /^(STRING|VARIABLE|NUMBER|INTEGER|DECIMAL|BOOLEAN)$/i.test(varName);
        if (!isStandardPlaceholder) {
            // It's a named variable like "Ask Each Time" - show as blue box
            if (readonly) {
                return `<span class="linked-value-inline">${escapeHtml(varName)}</span>`;
            } else {
                // In edit mode, show as styled input that looks like blue box
                const contextMenuAttr = 'oncontextmenu="showVariableMenu(event, this)"';
                const inputHtml = `<input type="text" class="param-value param-variable-input" data-action-id="${actionId}" data-param="${escapeHtml(key)}" value="${escapeHtml(strValue)}" ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)" ${contextMenuAttr} placeholder="Enter variable">`;
                return wrapWithVariableInsert(inputHtml, readonly);
            }
        }
    }

    // Check for placeholders like {{STRING}}, {{VARIABLE}}, {{NUMBER}}, etc.
    const placeholderMatch = strValue.match(/^\{\{(\w+)\}\}$/);
    if (placeholderMatch && !readonly) {
        const placeholderType = placeholderMatch[1].toLowerCase();
        const contextMenuAttr = 'oncontextmenu="showVariableMenu(event, this)"';
        if (placeholderType === 'number' || placeholderType === 'integer' || placeholderType === 'decimal') {
            return `<input type="number" class="param-value param-number" data-action-id="${actionId}" data-param="${escapeHtml(key)}" placeholder="Enter number" onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)" ${contextMenuAttr}>`;
        } else if (placeholderType === 'boolean') {
            return `<input type="checkbox" class="param-checkbox" data-action-id="${actionId}" data-param="${escapeHtml(key)}" onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.checked)" ${contextMenuAttr}>`;
        } else {
            // Default to text input for STRING, VARIABLE, etc.
            const inputHtml = `<input type="text" class="param-value" data-action-id="${actionId}" data-param="${escapeHtml(key)}" placeholder="Enter ${placeholderType.toLowerCase()}" onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)" ${contextMenuAttr}>`;
            return wrapWithVariableInsert(inputHtml, readonly);
        }
    }

    const lowerVal = strValue.toLowerCase();

    // Boolean detection
    if (lowerVal === 'true' || lowerVal === 'false' || strValue === '{{BOOLEAN}}') {
        const checked = lowerVal === 'true' ? 'checked' : '';
        const contextMenuAttr = readonly ? '' : 'oncontextmenu="showVariableMenu(event, this)"';
        return `<input type="checkbox" class="param-checkbox" data-action-id="${actionId}" data-param="${escapeHtml(key)}" ${checked} ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.checked)" ${contextMenuAttr}>`;
    }

    // Number detection
    if (!isNaN(strValue) && strValue !== '' && !readonly) {
        const contextMenuAttr = 'oncontextmenu="showVariableMenu(event, this)"';
        return `<input type="number" class="param-value param-number" data-action-id="${actionId}" data-param="${escapeHtml(key)}" value="${escapeHtml(strValue)}" ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)" ${contextMenuAttr}>`;
    }

    // Option-style placeholders (e.g. "Small/Medium/Large" or "{{Small/Medium/Large}}")
    if (!readonly) {
        const braceOptionsMatch = strValue.match(/^\{\{([^}]+\/[^}]+)\}\}$/);
        const rawOptions = braceOptionsMatch ? braceOptionsMatch[1] : strValue;
        const trimmedOptions = String(rawOptions || '').trim();
        const looksLikeUrl = trimmedOptions.includes('://');
        const looksLikeDrivePath = /^[a-zA-Z]:/.test(trimmedOptions) && (trimmedOptions[2] === '/' || trimmedOptions[2] === '\\\\');
        const looksLikePath = trimmedOptions.startsWith('/') || looksLikeDrivePath;
        const hasLetters = /[a-zA-Z]/.test(trimmedOptions);
        const options = trimmedOptions.split('/').map(o => o.trim()).filter(Boolean);
        if (hasLetters && !looksLikeUrl && !looksLikePath && options.length >= 2) {
            const placeholderText = options.join('/');
            const contextMenuAttr = 'oncontextmenu="showVariableMenu(event, this)"';
            const inputHtml = `<input type="text" class="param-value param-option-placeholder" data-action-id="${actionId}" data-param="${escapeHtml(key)}" value="" placeholder="${escapeHtml(placeholderText)}" ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)" ${contextMenuAttr}>`;
            return wrapWithVariableInsert(inputHtml, readonly);
        }
    }

    // Check if this is a text field that can contain mixed content with links
    // (like LLMPrompt in Askllm which can have text mixed with !ID: tokens)
    const canHaveMixedLinks = (strValue.toLowerCase().includes('!id:') || strValue.toLowerCase().includes('!link:')) && strValue.length > 4;

    if (canHaveMixedLinks && !readonly) {
        // Use textarea for mixed content fields
        const contextMenuAttr = 'oncontextmenu="showVariableMenu(event, this)"';
        const inputHtml = `<textarea class="param-value param-textarea" data-action-id="${actionId}" data-param="${escapeHtml(key)}" ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)" ${contextMenuAttr} rows="3">${escapeHtml(strValue)}</textarea>`;
        return wrapWithVariableInsert(inputHtml, readonly);
    } else if (canHaveMixedLinks && readonly) {
        // Display mixed content with proper formatting
        return `<div class="param-value param-mixed-content">${formatLinkedValue(strValue)}</div>`;
    }

    // Default text input
    const contextMenuAttr = readonly ? '' : 'oncontextmenu="showVariableMenu(event, this)"';
    const inputHtml = `<input type="text" class="param-value" data-action-id="${actionId}" data-param="${escapeHtml(key)}" value="${escapeHtml(strValue)}" ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)" ${contextMenuAttr}>`;
    return wrapWithVariableInsert(inputHtml, readonly);
}

function humanizeOutputName(name) {
    if (!name) return 'Output';
    let result = String(name).replace(/^!id:/i, '').replace(/^!link:/i, '').trim() || 'Output';
    // If the result looks like a UUID, return a generic label instead
    if (isUuidLike(result)) {
        return 'Linked Output';
    }
    return result;
}

const BUILTIN_OUTPUT_LABELS = new Map([
    ['repeatitem', 'Repeat Item'],
    ['repeatindex', 'Repeat Index'],
]);

function resolveBuiltinOutputLabel(raw) {
    const normalized = normalizeIdLabel(raw);
    if (!normalized) return '';
    const key = normalized.replace(/\s+/g, '').toLowerCase();
    return BUILTIN_OUTPUT_LABELS.get(key) || '';
}

function extractLinkedLabelFromObject(value) {
    if (!value || typeof value !== 'object') return null;
    const directType = value.Type || value?.Value?.Type || null;
    const directVarName =
        value.VariableName ||
        value?.Value?.VariableName ||
        value?.Variable?.VariableName ||
        value?.Variable?.Value?.VariableName ||
        null;
    if ((directType === 'Variable' || value?.Type === 'Variable') && directVarName) {
        return { kind: 'variable', label: String(directVarName).trim() };
    }
    const variablePayload = value.Variable || value?.Value?.Variable || null;
    const nestedVarName =
        variablePayload?.VariableName ||
        variablePayload?.Value?.VariableName ||
        null;
    if (nestedVarName) {
        return { kind: 'variable', label: String(nestedVarName).trim() };
    }
    const outputUUID =
        value?.Value?.OutputUUID ||
        value?.OutputUUID ||
        value?.Variable?.Value?.OutputUUID ||
        value?.Value?.Value?.OutputUUID ||
        null;
    const outputName =
        value?.Value?.OutputName ||
        value?.OutputName ||
        value?.Variable?.Value?.OutputName ||
        value?.Value?.Value?.OutputName ||
        null;
    if (outputUUID || outputName) {
        const resolved = resolveOutputNameByUUID(outputUUID, outputName) || outputName || 'Linked Output';
        return { kind: 'output', label: String(resolved).trim() };
    }
    return null;
}

function formatLinkedValue(value) {
    if (!value) return '';
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const labelInfo = extractLinkedLabelFromObject(value);
        if (labelInfo?.label) {
            return `<span class="linked-value-inline">${escapeHtml(humanizeOutputName(labelInfo.label))}</span>`;
        }
        const outputUUID = value?.Value?.OutputUUID || value?.OutputUUID || '';
        const storedOutputName = value?.Value?.OutputName || value?.OutputName || null;
        const outputName = resolveOutputNameByUUID(outputUUID, storedOutputName) || storedOutputName || 'Linked Output';
        return `<span class="linked-value-inline">${escapeHtml(humanizeOutputName(outputName))}</span>`;
    }
    const strVal = String(value);
    const trimmedVal = strVal.trim();
    if (isStandardPlaceholderToken(trimmedVal)) {
        return '';
    }
    if (isIdToken(trimmedVal) || /^!link:[^\s]+$/i.test(trimmedVal)) {
        const linkLabel = normalizeIdLabel(trimmedVal);
        const resolvedName =
            resolveOutputNameByUUID(trimmedVal, null) ||
            resolveOutputNameByUUID(linkLabel, null) ||
            linkLabel;
        return `<span class="linked-value-inline">${escapeHtml(humanizeOutputName(resolvedName))}</span>`;
    }
    if (/^!var:/i.test(trimmedVal)) {
        const varLabel = normalizeVarLabel(trimmedVal);
        return varLabel ? `<span class="linked-value-inline">${escapeHtml(varLabel)}</span>` : '';
    }
    // Check for variables like {{Ask Each Time}}, {{Clipboard}}, etc.
    const variableMatch = strVal.match(/^\{\{([^}]+)\}\}$/);
    if (variableMatch) {
        const varName = variableMatch[1].trim();
        if (isStandardPlaceholderToken(`{{${varName}}}`)) return '';
        return `<span class="linked-value-inline">${escapeHtml(varName)}</span>`;
    }
    // Check if value contains !ID: tokens mixed with text
    if (strVal.toLowerCase().includes('!id:') || strVal.toLowerCase().includes('!link:') || strVal.toLowerCase().includes('!var:')) {
        // Parse mixed content
        const parts = strVal.split(/(!id:(?:\{\{[^}]+?\}\}|[^\s]+)|!link:[^\s]+|!var:(?:\{\{[^}]+?\}\}|[^\s]+))/gi);
        return parts.map(part => {
            if (part.toLowerCase().startsWith('!id:') || part.toLowerCase().startsWith('!link:')) {
                const linkLabel = normalizeIdLabel(part);
                const resolvedName =
                    resolveOutputNameByUUID(part, null) ||
                    resolveOutputNameByUUID(linkLabel, null) ||
                    linkLabel;
                return `<span class="linked-value-inline">${escapeHtml(humanizeOutputName(resolvedName))}</span>`;
            }
            if (part.toLowerCase().startsWith('!var:')) {
                const varLabel = normalizeVarLabel(part);
                return varLabel ? `<span class="linked-value-inline">${escapeHtml(varLabel)}</span>` : '';
            }
            // Also check for {{variable}} patterns in mixed content
            const varMatch = part.match(/\{\{([^}]+)\}\}/g);
            if (varMatch) {
                let result = part;
                varMatch.forEach(match => {
                    const varName = match.replace(/\{\{|\}\}/g, '').trim();
                    if (isStandardPlaceholderToken(match)) {
                        result = result.replace(match, '');
                    } else {
                        result = result.replace(match, `<span class="linked-value-inline">${escapeHtml(varName)}</span>`);
                    }
                });
                return result;
            }
            return escapeHtml(part);
        }).join('');
    }
    // Check for {{variable}} patterns in the string
    if (strVal.includes('{{') && strVal.includes('}}')) {
        return strVal.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
            if (isStandardPlaceholderToken(match)) return '';
            return `<span class="linked-value-inline">${escapeHtml(varName.trim())}</span>`;
        });
    }
    return escapeHtml(strVal);
}

function formatParamValue(value) {
    if (typeof value === 'string') {
        // Highlight variables like !ID:Label or {{Clipboard}}
        const withIdTokens = value.replace(/!id:(?:\{\{[^}]+?\}\}|[^\s]+)/gi, (token) => {
            const label = normalizeIdLabel(token);
            return `<span class="variable-tag">${escapeHtml(label || token)}</span>`;
        });
        return withIdTokens.replace(/\{\{([^}]+)\}\}/g, '<span class="variable-tag">$1</span>');
    }
    return String(value);
}

function getActionIcon(actionType) {
    const icons = {
        'If': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
        'Repeat': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
        'Ask.ForInput': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
        'Notification': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
        'Openurl': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
        'Showresult': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>',
        'Getclipboard': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
        'Text': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>',
        'Variable.Set': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>'
    };
    return icons[actionType] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>';
}

function updateActionParam(actionId, paramKey, value, options = {}) {
    const render = options.render !== false;
    const suppressAnimations = options.suppressAnimations === true;
    const loc = findActionLocation(actionId);
    const action = loc?.action;
    if (!action) return;
    if (!action.params) action.params = {};

    if (paramKey === 'Condition' || paramKey === 'WFCondition') {
        const prevValue = action.params.ConditionValue ?? action.params.WFConditionValue ?? action.params.Condition ?? action.params.WFCondition ?? '';
        if (String(prevValue) !== String(value)) {
            pushUndoState();
        }
        const selectEl = document.querySelector(`select[data-action-id="${actionId}"][data-param="${paramKey}"], select[data-action-id="${actionId}"][data-param="Condition"]`);
        const fullOptions = selectEl?.dataset.fullOptions || action.params.ConditionOptions || action.params.WFConditionOptions || DEFAULT_CONDITION_OPTIONS;
        action.params.ConditionOptions = fullOptions;
        action.params.WFConditionOptions = fullOptions;
        action.params.ConditionValue = value;
        action.params.WFConditionValue = value;
        action.params.Condition = value;
        action.params.WFCondition = value;
    } else {
        const prevValue = action.params[paramKey];
        if (prevValue !== value) {
            pushUndoState();
        }
        action.params[paramKey] = value;
    }
    commitActionChanges(null, { render, suppressAnimations });
}

function addMenuCase(actionId) {
    const loc = findActionLocation(actionId);
    const action = loc?.action;
    if (!action) return;
    if (!Array.isArray(action.Cases) || action.Cases.length === 0) {
        const menuItems = getMenuItemsFromParams(action.params);
        action.Cases = menuItems.length
            ? menuItems.map(title => ({ Title: title, Actions: [] }))
            : [];
    }
    pushUndoState();
    action.Cases.push({ Title: `Option ${action.Cases.length + 1}`, Actions: [] });
    commitActionChanges(null, { suppressAnimations: true });
}

function removeMenuCase(actionId, caseIndex) {
    const loc = findActionLocation(actionId);
    const action = loc?.action;
    if (!action) return;
    if (!Array.isArray(action.Cases) || action.Cases.length === 0) {
        const menuItems = getMenuItemsFromParams(action.params);
        if (menuItems.length) {
            action.Cases = menuItems.map(title => ({ Title: title, Actions: [] }));
        }
    }
    if (!Array.isArray(action.Cases)) return;
    const idx = Number(caseIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= action.Cases.length) return;
    if (action.Cases.length <= 1) return;
    pushUndoState();
    action.Cases.splice(idx, 1);
    commitActionChanges(null, { suppressAnimations: true });
}

function updateMenuCaseTitle(actionId, caseIndex, title) {
    const loc = findActionLocation(actionId);
    const action = loc?.action;
    if (!action) return;
    if (!Array.isArray(action.Cases) || action.Cases.length === 0) {
        const menuItems = getMenuItemsFromParams(action.params);
        action.Cases = menuItems.length
            ? menuItems.map(itemTitle => ({ Title: itemTitle, Actions: [] }))
            : [];
    }
    const idx = Number(caseIndex);
    if (!Number.isFinite(idx) || idx < 0) return;
    while (action.Cases.length <= idx) {
        action.Cases.push({ Title: `Option ${action.Cases.length + 1}`, Actions: [] });
    }
    const nextTitle = String(title || '').trim() || `Option ${idx + 1}`;
    const prevTitle = action.Cases[idx]?.Title ?? '';
    if (prevTitle !== nextTitle) {
        pushUndoState();
        action.Cases[idx].Title = nextTitle;
        commitActionChanges(null, { suppressAnimations: true });
    }
}

let deleteTargetId = null;
let deleteTargetIds = null;
let deleteTargetType = null; // 'action', 'project', 'project-batch'

function showDeleteModal(type, id) {
    deleteTargetId = null;
    deleteTargetIds = null;
    deleteTargetType = type;
    if (Array.isArray(id)) {
        deleteTargetIds = id.filter(Boolean);
        deleteTargetType = type === 'project' ? 'project-batch' : type;
    } else {
        deleteTargetId = id;
    }

    const titleEl = document.querySelector('#delete-modal h3');
    const textEl = document.querySelector('#delete-modal p');

    if (deleteTargetType === 'project-batch') {
        const count = deleteTargetIds?.length || 0;
        const label = count === 1 ? 'Project' : 'Projects';
        const pronoun = count === 1 ? 'this project' : 'these projects';
        titleEl.textContent = `Delete ${count} ${label}?`;
        textEl.textContent = `Are you sure you want to delete ${pronoun}? This cannot be undone.`;
    } else if (type === 'project') {
        titleEl.textContent = 'Delete Project?';
        textEl.textContent = 'Are you sure you want to delete this project? This cannot be undone.';
    } else {
        titleEl.textContent = 'Delete Action?';
        textEl.textContent = 'Are you sure you want to delete this action? This cannot be undone.';
    }

    document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    deleteTargetId = null;
    deleteTargetIds = null;
    deleteTargetType = null;
}

function confirmDeleteAction() {
    if (!deleteTargetId && (!deleteTargetIds || deleteTargetIds.length === 0)) return;

    if (deleteTargetType === 'project-batch') {
        const idsToDelete = new Set(deleteTargetIds || []);
        projects = projects.filter(p => !idsToDelete.has(p.id));
        saveProjects();
        if (currentProject && idsToDelete.has(currentProject.id)) {
            currentProject = null;
            currentActions = [];
            showProjectsView();
        } else {
            renderProjectsGrid();
        }
        setProjectSelectionMode(false);
    } else if (deleteTargetType === 'project') {
        projects = projects.filter(p => p.id !== deleteTargetId);
        saveProjects();
        if (currentProject && currentProject.id === deleteTargetId) {
            currentProject = null;
            currentActions = [];
            showProjectsView();
        } else {
            renderProjectsGrid();
        }
        if (deleteTargetId) {
            selectedProjectIds.delete(deleteTargetId);
        }
        setProjectSelectionMode(false);
    } else if (deleteTargetType === 'action') {
        pushUndoState();
        // Recursively collect all action IDs to delete (including nested ones)
        const idsToDelete = new Set([deleteTargetId]);

        function collectNestedActionIds(action) {
            if (isConditionalAction(action)) {
                // Collect actions from then and else arrays
                if (Array.isArray(action.then)) {
                    action.then.forEach(a => {
                        if (a && a.id) {
                            idsToDelete.add(a.id);
                            collectNestedActionIds(a);
                        }
                    });
                }
                if (Array.isArray(action.else)) {
                    action.else.forEach(a => {
                        if (a && a.id) {
                            idsToDelete.add(a.id);
                            collectNestedActionIds(a);
                        }
                    });
                }
            } else if (isRepeatAction(action)) {
                // Collect actions from do array
                if (Array.isArray(action.do)) {
                    action.do.forEach(a => {
                        if (a && a.id) {
                            idsToDelete.add(a.id);
                            collectNestedActionIds(a);
                        }
                    });
                }
            }
        }

        const actionInfo = findActionLocation(deleteTargetId);
        if (actionInfo?.action) {
            collectNestedActionIds(actionInfo.action);
        }

        // Remove the selected action (and its nested children) from wherever it lives
        removeActionById(deleteTargetId);

        // Clean up any stray nested references with matching IDs
        const pruneNestedArrays = (arr) => {
            if (!Array.isArray(arr)) return;
            for (let i = arr.length - 1; i >= 0; i--) {
                const act = arr[i];
                if (!act) continue;
                if (idsToDelete.has(act.id)) {
                    arr.splice(i, 1);
                    continue;
                }
                if (isConditionalAction(act)) {
                    pruneNestedArrays(act.then);
                    pruneNestedArrays(act.else);
                } else if (isRepeatAction(act)) {
                    pruneNestedArrays(act.do);
                }
            }
        };
        pruneNestedArrays(currentActions);
        commitActionChanges();
    }
    closeDeleteModal();
}

function deleteAction(actionId) {
    showDeleteModal('action', actionId);
}

function duplicateAction(actionId) {
    const loc = findActionLocation(actionId);
    if (!loc) return;
    pushUndoState();
    const newAction = cloneActionDeep(loc.action);
    loc.parentArray.splice(loc.index + 1, 0, newAction);
    commitActionChanges([newAction.id]);
}

function commitActionChanges(animateIds = null, options = {}) {
    const render = options.render !== false;
    const suppressAnimations = options.suppressAnimations === true;
    currentActions = ensureActionUUIDs(currentActions);
    currentActions = normalizeControlFlowToNested(currentActions);
    if (currentProject) {
        currentProject.actions = currentActions;
        saveProjects();
    }
    if (render) {
        renderActions(animateIds, { suppressAnimations });
    } else {
        pruneMissingOutputLinks();
        rebuildOutputNameIndex(currentActions);
        updateProgramExportCache();
    }
    updateUndoRedoButtons();
}

function scrollPreviewToBottom() {
    requestAnimationFrame(() => {
        const canvas = document.getElementById('preview-canvas');
        if (canvas) {
            canvas.scrollTop = canvas.scrollHeight;
        }
    });
}

// ============ Placement Helpers ============
function insertActionIntoZone(controlAction, sectionKey, movedAction, zoneEl, clientY) {
    if (!controlAction || !movedAction) return;
    const targetArray = ensureSectionArray(controlAction, sectionKey);
    if (!targetArray) return;

    // Determine insertion index based on cursor position vs visible children
    let insertIndex = targetArray.length;
    const contentEl = Array.from(zoneEl.children).find(c => c.classList?.contains('control-section-content')) || zoneEl;
    const childNodes = Array.from(contentEl.children)
        .filter(n =>
            n?.dataset?.id &&
            (n.classList?.contains('action-node') ||
                n.classList?.contains('if-block') ||
                n.classList?.contains('repeat-block') ||
                n.classList?.contains('menu-block'))
        );
    for (const child of childNodes) {
        const childId = parseInt(child.dataset.id);
        if (!Number.isFinite(childId)) continue;
        const midY = child.getBoundingClientRect().top + child.getBoundingClientRect().height / 2;
        if (clientY < midY) {
            const idx = targetArray.findIndex(a => a.id === childId);
            if (idx !== -1) {
                insertIndex = idx;
                break;
            }
        }
    }
    targetArray.splice(insertIndex, 0, movedAction);
}

function insertIntoRootByPosition(moved, clientY) {
    let targetIndex = currentActions.length;
    const container = document.getElementById('actions-container');
    if (container) {
        const rootNodes = Array.from(container.querySelectorAll('.action-node, .if-block, .repeat-block, .menu-block')).filter(n => !n.dataset.parentId && n.dataset.id);
        for (let i = 0; i < rootNodes.length; i++) {
            const rect = rootNodes[i].getBoundingClientRect();
            if (clientY < rect.top + rect.height / 2) {
                const targetId = parseInt(rootNodes[i].dataset.actionId || rootNodes[i].dataset.id);
                const loc = findActionLocation(targetId);
                if (loc && loc.parentArray === currentActions) {
                    targetIndex = loc.index;
                    break;
                }
            }
        }
    }
    currentActions.splice(targetIndex, 0, moved);
}

// ============ Reorder (Pointer Drag) ============
function initActionReordering() {
    if (reorderListenersAttached) return;
    const container = document.getElementById('actions-container');
    if (!container) return;

    reorderListenersAttached = true;

    container.addEventListener('pointerdown', reorderOnPointerDown);
    window.addEventListener('pointermove', reorderOnPointerMove, { passive: false });
    window.addEventListener('pointerup', reorderOnPointerUp);
    window.addEventListener('pointercancel', reorderOnPointerCancel);
}

function reorderOnPointerDown(e) {
    if (!editMode) return;
    if (reorderState) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Don't start a drag when the user is interacting with controls/inputs.
    if (e.target.closest('input, textarea, select, button, a, [contenteditable="true"], .node-actions, .control-actions, .linked-output')) {
        return;
    }

    const itemEl = e.target.closest('.action-node, .if-block, .repeat-block, .menu-block');
    if (!itemEl?.dataset?.id) return;

    // On touch devices, dragging anywhere conflicts with scroll. Keep touch drag on the handle.
    if (e.pointerType === 'touch' && !e.target.closest('[data-reorder-handle="true"]')) {
        return;
    }

    const actionId = Number(itemEl.dataset.id);
    if (!Number.isFinite(actionId)) return;

    const loc = findActionLocation(actionId);
    if (!loc?.action) return;

    const rect = itemEl.getBoundingClientRect();
    reorderState = {
        phase: 'pending',
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        handleEl: itemEl,
        draggedId: actionId,
        draggedRoot: loc.action,
        ghostEl: itemEl,
        placeholderEl: null,
        startX: e.clientX,
        startY: e.clientY,
        lastClientY: e.clientY,
        moveDirY: 0,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        currentZone: null
    };

    try {
        itemEl.setPointerCapture(e.pointerId);
    } catch (err) { }

    e.preventDefault();
}

function reorderOnPointerMove(e) {
    const state = reorderState;
    if (!state) return;
    if (e.pointerId !== state.pointerId) return;

    if (state.phase === 'pending') {
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        if (Math.hypot(dx, dy) < 6) return;
        state.moveDirY = dy;
        state.lastClientY = e.clientY;
        reorderBeginDrag(state);
    }

    if (state.phase !== 'dragging') return;

    e.preventDefault();
    const deltaY = e.clientY - (state.lastClientY ?? e.clientY);
    if (Math.abs(deltaY) > 1) state.moveDirY = deltaY;
    state.lastClientY = e.clientY;
    reorderUpdateGhostPosition(state, e.clientX, e.clientY);
    reorderAutoScrollPreview(e.clientY);
    reorderRequestPlaceholderUpdate(state, e.clientX, e.clientY);
}

function reorderOnPointerUp(e) {
    const state = reorderState;
    if (!state) return;
    if (e.pointerId !== state.pointerId) return;

    reorderState = null;

    try {
        state.handleEl?.releasePointerCapture(state.pointerId);
    } catch (err) { }

    if (state.phase !== 'dragging' || !state.placeholderEl) {
        return;
    }

    const placeholderEl = state.placeholderEl;
    const listEl = placeholderEl.parentElement;
    const zone =
        placeholderEl.closest('.if-then.drop-zone, .if-else.drop-zone, .repeat-body.drop-zone, .menu-case-body.drop-zone') ||
        document.getElementById('actions-container');
    const targetInfo = reorderGetTargetInfo(zone);
    const targetIndex = reorderGetPlaceholderIndex(listEl, placeholderEl);

    const beforeState = captureWorkspaceState();
    const moved = reorderApplyMove(state.draggedId, targetInfo, targetIndex, state.draggedRoot);
    reorderCleanup(state);

    if (moved) {
        pushUndoSnapshot(beforeState);
        commitActionChanges();
    } else {
        renderActions();
    }
}

function reorderOnPointerCancel(e) {
    const state = reorderState;
    if (!state) return;
    if (e.pointerId !== state.pointerId) return;

    reorderState = null;
    try {
        state.handleEl?.releasePointerCapture(state.pointerId);
    } catch (err) { }

    if (state.phase !== 'dragging') {
        return;
    }

    reorderCleanup(state);
    renderActions();
}

function reorderBeginDrag(state) {
    const placeholder = document.createElement('div');
    placeholder.className = 'drag-placeholder';
    placeholder.style.height = `${Math.max(24, state.height)}px`;
    placeholder.style.boxSizing = 'border-box';
    placeholder.style.pointerEvents = 'none';
    placeholder.innerHTML = '<div class="drag-placeholder-inner"></div>';

    state.placeholderEl = placeholder;

    const parent = state.ghostEl.parentNode;
    if (!parent) return;
    parent.insertBefore(placeholder, state.ghostEl);

    const ghost = state.ghostEl;
    ghost.classList.add('dragging');
    ghost.style.position = 'fixed';
    ghost.style.left = '0px';
    ghost.style.top = '0px';
    ghost.style.width = `${state.width}px`;
    ghost.style.height = `${state.height}px`;
    ghost.style.boxSizing = 'border-box';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '10000';
    ghost.style.margin = '0';
    ghost.style.cursor = 'grabbing';
    ghost.style.opacity = '0.9';

    document.body.appendChild(ghost);

    state.phase = 'dragging';
    reorderSetZonesActive(true);
    if (state.pointerType === 'touch') {
        document.body.classList.add('dragging-action');
    }

    reorderUpdateGhostPosition(state, state.startX, state.startY);
    reorderUpdatePlaceholderPosition(state, state.startX, state.startY);
}

function reorderUpdateGhostPosition(state, clientX, clientY) {
    const ghost = state?.ghostEl;
    if (!ghost) return;
    ghost.style.left = `${clientX - state.offsetX}px`;
    ghost.style.top = `${clientY - state.offsetY}px`;
}

function reorderAutoScrollPreview(clientY) {
    const canvas = document.getElementById('preview-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const edge = 64;
    const speed = 18;

    if (clientY < rect.top + edge) {
        canvas.scrollTop -= speed;
    } else if (clientY > rect.bottom - edge) {
        canvas.scrollTop += speed;
    }
}

function reorderRequestPlaceholderUpdate(state, clientX, clientY) {
    if (!state || state.phase !== 'dragging') return;
    state.pendingClientX = clientX;
    state.pendingClientY = clientY;
    if (state.placeholderRAF) return;
    state.placeholderRAF = requestAnimationFrame(() => {
        state.placeholderRAF = null;
        reorderUpdatePlaceholderPosition(state, state.pendingClientX, state.pendingClientY);
    });
}

function reorderUpdatePlaceholderPosition(state, clientX, clientY) {
    const placeholder = state.placeholderEl;
    if (!placeholder) return;

    const zone = reorderGetZoneFromPoint(clientX, clientY);
    if (!zone) {
        reorderSetZoneHover(state, null);
        return;
    }

    // Disallow dropping into self or descendants.
    const zoneParentId = zone.dataset?.actionId ? Number(zone.dataset.actionId) : null;
    if (
        zoneParentId &&
        (zoneParentId === state.draggedId || actionContainsId(state.draggedRoot, zoneParentId))
    ) {
        reorderSetZoneHover(state, null);
        return;
    }

    const contentEl = reorderGetZoneContent(zone);
    if (!contentEl) return;

    const beforeEl = reorderFindInsertBefore(contentEl, clientY, placeholder, state.moveDirY);
    if (beforeEl) {
        contentEl.insertBefore(placeholder, beforeEl);
    } else {
        reorderAppendPlaceholder(contentEl, placeholder);
    }

    reorderSetZoneHover(state, zone);
}

function reorderGetZoneFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;

    const nestedZone = el.closest('.if-then.drop-zone, .if-else.drop-zone, .repeat-body.drop-zone, .menu-case-body.drop-zone');
    if (nestedZone) return nestedZone;

    // Make it easy to drop into If/Repeat even when hovering the header/card.
    const ifBlock = el.closest('.if-block');
    if (ifBlock) {
        const thenZone = ifBlock.querySelector('.if-then.drop-zone');
        const elseZone = ifBlock.querySelector('.if-else.drop-zone');
        if (thenZone && elseZone) {
            const elseRect = elseZone.getBoundingClientRect();
            return clientY < elseRect.top ? thenZone : elseZone;
        }
        if (thenZone) return thenZone;
    }

    const repeatBlock = el.closest('.repeat-block');
    if (repeatBlock) {
        const bodyZone = repeatBlock.querySelector('.repeat-body.drop-zone');
        if (bodyZone) return bodyZone;
    }

    const actionsContainer = el.closest('#actions-container');
    if (actionsContainer) return actionsContainer;

    // If we're still in the preview canvas, treat as root drop.
    if (el.closest('#preview-canvas')) {
        return document.getElementById('actions-container');
    }

    return null;
}

function reorderGetZoneContent(zone) {
    if (!zone) return null;
    if (zone.id === 'actions-container') return zone;
    return (
        Array.from(zone.children).find(c => c.classList?.contains('control-section-content')) || zone
    );
}

function reorderIsItemElement(el) {
    return (
        !!el?.classList &&
        (el.classList.contains('action-node') ||
            el.classList.contains('if-block') ||
            el.classList.contains('repeat-block') ||
            el.classList.contains('menu-block'))
    );
}

function reorderFindInsertBefore(listEl, clientY, placeholderEl, dirY = 0) {
    const items = Array.from(listEl.children).filter(el => reorderIsItemElement(el) && el !== placeholderEl);

    if (!dirY) {
        let closestOffset = Number.NEGATIVE_INFINITY;
        let closestEl = null;

        items.forEach(el => {
            const rect = el.getBoundingClientRect();
            const offset = clientY - (rect.top + rect.height / 2);
            if (offset < 0 && offset > closestOffset) {
                closestOffset = offset;
                closestEl = el;
            }
        });

        return closestEl;
    }

    for (let i = 0; i < items.length; i++) {
        const el = items[i];
        const rect = el.getBoundingClientRect();
        if (clientY < rect.top + 2) return el;
        if (clientY >= rect.top && clientY <= rect.bottom) {
            if (dirY < 0) return el;
            return items[i + 1] || null;
        }
    }

    return null;
}

function reorderAppendPlaceholder(listEl, placeholderEl) {
    const hintEl = Array.from(listEl.children).find(c => c.classList?.contains('empty-section-hint')) || null;
    if (hintEl) {
        listEl.insertBefore(placeholderEl, hintEl);
    } else {
        listEl.appendChild(placeholderEl);
    }
}

function reorderSetZoneHover(state, zone) {
    if (state.currentZone && state.currentZone !== zone) {
        state.currentZone.classList.remove('drop-zone-hover');
    }
    state.currentZone = zone;
    if (!zone?.classList) return;
    // Don't outline the entire workspace when hovering the root drop target.
    if (zone.id === 'actions-container' || zone.id === 'preview-canvas') return;
    zone.classList.add('drop-zone-hover');
}

function reorderSetZonesActive(active) {
    const container = document.getElementById('actions-container');
    if (!container) return;
    container.querySelectorAll('.drop-zone').forEach(z => z.classList.toggle('drop-zone-active', active));
}

function reorderGetTargetInfo(zone) {
    if (!zone) return null;

    if (zone.id === 'actions-container') {
        return { parentId: null, section: 'root' };
    }

    const parentId = Number(zone.dataset?.actionId);
    if (!Number.isFinite(parentId)) return null;

    const dropZone = zone.dataset?.dropZone;
    const section =
        dropZone === 'if-then' ? 'then' :
            dropZone === 'if-else' ? 'else' :
                dropZone === 'repeat' ? 'do' :
                    null;
    if (dropZone === 'menu-case') {
        const caseIndex = Number(zone.dataset?.caseIndex);
        if (!Number.isFinite(caseIndex)) return null;
        return { parentId, section: `case:${caseIndex}` };
    }
    if (!section) return null;

    return { parentId, section };
}

function reorderGetPlaceholderIndex(listEl, placeholderEl) {
    if (!listEl) return 0;
    let index = 0;
    for (const child of Array.from(listEl.children)) {
        if (child === placeholderEl) break;
        if (reorderIsItemElement(child)) index += 1;
    }
    return index;
}

function reorderApplyMove(actionId, targetInfo, targetIndex, draggedRoot) {
    if (!targetInfo) return false;

    const targetParentId = targetInfo.parentId ? Number(targetInfo.parentId) : null;
    if (targetParentId && (targetParentId === actionId || actionContainsId(draggedRoot, targetParentId))) {
        return false;
    }

    const moved = removeActionById(actionId);
    if (!moved) return false;

    let targetArray;
    if (!targetParentId) {
        targetArray = currentActions;
    } else {
        const parentLoc = findActionLocation(targetParentId);
        targetArray = parentLoc?.action ? ensureSectionArray(parentLoc.action, targetInfo.section) : currentActions;
    }

    if (!Array.isArray(targetArray)) targetArray = currentActions;
    if (typeof targetIndex !== 'number' || targetIndex < 0 || targetIndex > targetArray.length) {
        targetIndex = targetArray.length;
    }

    targetArray.splice(targetIndex, 0, moved);
    return true;
}

function reorderCleanup(state) {
    reorderSetZonesActive(false);
    if (state?.pointerType === 'touch') {
        document.body.classList.remove('dragging-action');
    }
    if (state?.placeholderRAF) {
        cancelAnimationFrame(state.placeholderRAF);
        state.placeholderRAF = null;
    }
    if (state.currentZone) {
        state.currentZone.classList.remove('drop-zone-hover');
    }

    if (state.placeholderEl?.parentNode) {
        state.placeholderEl.parentNode.removeChild(state.placeholderEl);
    }

    if (state.ghostEl?.parentNode) {
        state.ghostEl.parentNode.removeChild(state.ghostEl);
    }
}
// ============ Menus ============
function togglePlusMenu() {
    const menu = document.getElementById('plus-menu');
    const btn = document.getElementById('plus-menu-btn');
    menu.classList.toggle('active');
    btn.classList.toggle('active');
}

function toggleProfileMenu() {
    document.getElementById('profile-menu')?.classList.toggle('active');
}

function setChatMode(mode) {
    chatMode = mode;
    document.getElementById('plus-menu')?.classList.remove('active');
    document.getElementById('plus-menu-btn')?.classList.remove('active');
    const input = document.getElementById('chat-input');
    if (mode === 'discussion') input.placeholder = 'Discussion mode...';
    else input.placeholder = 'Describe your shortcut...';
}

// ============ Force Action Modal ============
async function loadTemplates() {
    try {
        const response = await fetch('Templates/index.json');
        const files = await response.json();
        availableTemplates = files.map(f => {
            const file = typeof f === 'string' ? f : f?.file;
            const action = typeof file === 'string' ? file.replace('.json', '') : '';
            const label = formatActionNameForUI(action);
            const search = normalizeSearchKey(`${action} ${label} ${file || ''}`);
            return { file, action, label, search };
        }).filter(t => t.file && t.action);
    } catch (e) { console.error('Failed to load templates:', e); }
}

function openActionModal(mode = 'force') {
    actionModalMode = mode === 'add' ? 'add' : 'force';
    document.getElementById('plus-menu')?.classList.remove('active');
    document.getElementById('plus-menu-btn')?.classList.remove('active');
    const titleEl = document.getElementById('force-action-modal-title');
    if (titleEl) titleEl.textContent = actionModalMode === 'add' ? 'Add Action' : 'Force Action';
    document.getElementById('force-action-modal').classList.add('active');
    renderActionsList();
    const searchInput = document.getElementById('action-search');
    searchInput.value = '';
    searchInput.focus();
    searchInput.oninput = () => renderActionsList(searchInput.value);
}

function openForceActionModal() {
    openActionModal('force');
}

function openAddActionModal() {
    openActionModal('add');
}

function closeForceActionModal() {
    document.getElementById('force-action-modal').classList.remove('active');
}

function renderActionsList(filter = '') {
    const list = document.getElementById('actions-list');
    list.innerHTML = '';
    const term = normalizeSearchKey(filter);
    const filtered = term
        ? availableTemplates.filter(t => t.search.includes(term))
        : availableTemplates;
    filtered.forEach(t => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.style.cssText = 'padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer;';
        const companyBadge = getCompanyBadgeHtml(t.action);
        item.innerHTML = `<div class="node-icon" style="width:32px;height:32px;">${getActionIcon(t.action)}</div><span>${escapeHtml(t.label || t.action)}${companyBadge}</span>`;
        item.onclick = () => {
            if (actionModalMode === 'add') {
                addActionDirectly(t);
            } else {
                addForcedAction(t);
            }
        };
        list.appendChild(item);
    });
}

let actionModalMode = 'force';
let placementMode = false;
let pendingAction = null;
let placementCursor = null;
let placementMoveHandler = null;
let placementClickHandler = null;
let placementKeyHandler = null;

async function addActionDirectly(template) {
    closeForceActionModal();
    try {
        const response = await fetch(`Templates/${template.file}`);
        let text = await response.text();
        // Remove comments (lines starting with # or //, or inline comments)
        text = text.split('\n').map(line => {
            // Simple check: if line has # or //, check if it's inside quotes
            let inString = false;
            let result = '';
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
                    inString = !inString;
                }
                if (!inString && (char === '#' || (char === '/' && line[i + 1] === '/'))) {
                    // Found comment start outside string
                    break;
                }
                result += char;
            }
            return result;
        }).join('\n');
        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (jsonErr) {
            console.warn('JSON parse error, using fallback:', jsonErr);
            data = { action: template.action, params: {} };
        }
        const newAction = { id: Date.now(), action: data.action || template.action, title: data.action || template.action, params: data.params || {} };
        getActionUUID(newAction);
        currentActions.push(newAction);
        commitActionChanges([newAction.id]);
        scrollPreviewToBottom();
    } catch (e) { console.error('Failed to load action template:', e); }
}

function enterPlacementMode(action) {
    placementMode = true;
    pendingAction = action;

    // Create floating cursor element
    if (placementCursor) placementCursor.remove();
    placementCursor = document.createElement('div');
    placementCursor.className = 'placement-cursor';
    const companyBadge = getCompanyBadgeHtml(action.action);
    placementCursor.innerHTML = `
                <div class="placement-cursor-content">
                    <div class="node-icon">${getActionIcon(action.action)}</div>
                    <span>${escapeHtml(getActionDisplayLabel(action) || (action.title || action.action))}${companyBadge}</span>
                    <span class="placement-hint">Click to place action</span>
                </div>
            `;
    document.body.appendChild(placementCursor);

    // Update cursor position on mouse move
    placementMoveHandler = (e) => {
        if (!placementMode) return;
        placementCursor.style.left = e.clientX + 'px';
        placementCursor.style.top = e.clientY + 'px';

        // Highlight drop zones - prioritize drop zones over action nodes
        const container = document.getElementById('actions-container');
        let allZones = Array.from(container.querySelectorAll('.drop-zone, .action-node, .if-block, .repeat-block, .menu-block, #actions-container, .root-drop-zone'));
        // Also include the preview canvas as a fallback
        const previewCanvas = document.getElementById('preview-canvas');
        if (previewCanvas) allZones.push(previewCanvas);
        let hoveredZone = null;

        allZones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                // Prioritize drop zones
                if (zone.classList.contains('drop-zone')) {
                    hoveredZone = zone;
                } else if (!hoveredZone) {
                    hoveredZone = zone;
                }
            }
        });

        // Remove all hover classes first
        allZones.forEach(zone => zone.classList.remove('placement-hover'));
        // Add hover to the topmost/prioritized zone
        if (hoveredZone && (hoveredZone.id === 'actions-container' || hoveredZone.id === 'preview-canvas')) {
            hoveredZone = null;
        }
        if (hoveredZone) {
            hoveredZone.classList.add('placement-hover');
        }
    };

    document.addEventListener('mousemove', placementMoveHandler);

    // Handle click to place (use single click listener to avoid double fire)
    placementClickHandler = (e) => {
        if (!placementMode) return;
        if (e.button !== 0) return;
        if (!pendingAction) return;
        pushUndoState();

        const container = document.getElementById('actions-container');
        let allZones = Array.from(container.querySelectorAll('.drop-zone, .action-node, .if-block, .repeat-block, .menu-block, #actions-container'));
        // Also include the preview canvas as a fallback
        const previewCanvas = document.getElementById('preview-canvas');
        if (previewCanvas) allZones.push(previewCanvas);
        let placed = false;
        let targetZone = null;

        // Find the zone under the cursor, prioritizing drop zones
        allZones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                if (zone.classList.contains('drop-zone')) {
                    targetZone = zone;
                    placed = true;
                } else if (!targetZone) {
                    targetZone = zone;
                    placed = true;
                }
            }
        });

        if (targetZone) {
            if (targetZone.classList.contains('drop-zone')) {
                const actionId = parseInt(targetZone.dataset.actionId);
                const dropZone = targetZone.dataset.dropZone;
                const controlInfo = findActionLocation(actionId);
                if (controlInfo?.action) {
                    const caseIndex = Number(targetZone.dataset.caseIndex);
                    const sectionKey = (dropZone === 'menu-case' && Number.isFinite(caseIndex))
                        ? `case:${caseIndex}`
                        : dropZone === 'if-then'
                            ? 'then'
                            : dropZone === 'if-else'
                                ? 'else'
                                : 'do';
                    insertActionIntoZone(controlInfo.action, sectionKey, pendingAction, targetZone, e.clientY);
                    placed = true;
                }
            } else if (targetZone.classList.contains('action-node') || targetZone.classList.contains('if-block') || targetZone.classList.contains('repeat-block') || targetZone.classList.contains('menu-block')) {
                // Place after the action node within same parent
                const targetId = parseInt(targetZone.dataset.id || targetZone.dataset.actionId);
                const targetInfo = findActionLocation(targetId);
                if (targetInfo) {
                    const insertIndex = targetInfo.index + 1;
                    targetInfo.parentArray.splice(insertIndex, 0, pendingAction);
                    placed = true;
                }
            } else if (targetZone.id === 'actions-container' || targetZone.classList.contains('root-drop-zone')) {
                insertIntoRootByPosition(pendingAction, e.clientY);
                placed = true;
            } else if (targetZone.id === 'preview-canvas') {
                // Place at end when clicking on empty canvas area
                currentActions.push(pendingAction);
                placed = true;
            }
        }

        if (!placed) {
            // Place at end if no specific zone was detected
            currentActions.push(pendingAction);
        }

        // Clean up
        exitPlacementMode();
        commitActionChanges([pendingAction.id]);
    };

    document.addEventListener('click', placementClickHandler);
    placementKeyHandler = (e) => {
        if (e.key === 'Escape') {
            exitPlacementMode();
        }
    };
    document.addEventListener('keydown', placementKeyHandler, { once: true });
}

function exitPlacementMode() {
    placementMode = false;
    pendingAction = null;
    if (placementCursor) {
        placementCursor.remove();
        placementCursor = null;
    }
    if (placementMoveHandler) {
        document.removeEventListener('mousemove', placementMoveHandler);
        placementMoveHandler = null;
    }
    if (placementClickHandler) {
        document.removeEventListener('click', placementClickHandler, true);
        placementClickHandler = null;
    }
    if (placementKeyHandler) {
        document.removeEventListener('keydown', placementKeyHandler);
        placementKeyHandler = null;
    }
    document.getElementById('actions-container')?.querySelectorAll('.placement-hover').forEach(el => {
        el.classList.remove('placement-hover');
    });
}

// ============ Download ============
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function uploadShortcutForInstall(blob, filename) {
    const res = await fetch(`${API_BASE}/shortcut`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Filename': filename
        },
        body: blob
    });
    const data = await res.json();
    if (!data?.ok || !data?.url) {
        throw new Error(data?.message || 'Upload failed');
    }
    return data.url;
}

function openShortcutImport(shortcutUrl) {
    const shortcutsAppURL = `shortcuts://import-shortcut?url=${encodeURIComponent(shortcutUrl)}`;
    window.location.href = shortcutsAppURL;
    setTimeout(() => {
        window.location.href = shortcutUrl;
    }, 1200);
}

function openDownloadModal() {
    document.getElementById('download-modal').classList.add('active');
}

function closeDownloadModal() {
    document.getElementById('download-modal').classList.remove('active');
    document.getElementById('download-status').style.display = 'none';
}

async function executeDownload(type) {
    if (currentActions.length === 0) {
        alert('No actions to download. Build your shortcut first!');
        return;
    }

    const statusEl = document.getElementById('download-status');
    const statusText = document.getElementById('download-status-text');
    statusEl.style.display = 'block';
    statusText.textContent = 'Converting to shortcut format...';

    try {
        const exportCache = getProgramExportCache();
        const programObj = exportCache.programObj;
        const programJson = exportCache.programJson;
        // Create a clean filename: preserve spaces, remove only truly invalid characters
        const rawName = String(programObj?.name || currentProject?.name || 'My Shortcut').trim();
        const baseName = rawName
            .replace(/[<>:"/\\|?*]/g, '') // Remove filesystem-invalid chars
            .replace(/\s+/g, ' ')         // Normalize multiple spaces to single
            .trim() || 'My Shortcut';

        // Convert to plist
        statusText.textContent = 'Generating plist...';
        const convertRes = await fetch(`${API_BASE}/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: programJson
        });
        const convertData = await convertRes.json();
        if (!convertData.ok) throw new Error(convertData.message || 'Conversion failed');

        if (type === 'raw') {
            statusText.textContent = 'Preparing raw outputs...';
            const jsonBlob = new Blob([programJson], { type: 'application/json' });
            const plistBlob = new Blob([convertData.plist], { type: 'application/xml' });
            downloadBlob(jsonBlob, `${baseName}.json`);
            await new Promise(resolve => setTimeout(resolve, 150));
            downloadBlob(plistBlob, `${baseName}.plist`);
            closeDownloadModal();
            return;
        }

        // Sign the shortcut
        statusText.textContent = 'Signing shortcut...';
        const plistBlob = new Blob([convertData.plist], { type: 'application/xml' });
        const signRes = await fetch(`${API_BASE}/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: plistBlob
        });

        if (!signRes.ok) {
            throw new Error('Signing failed');
        }

        statusText.textContent = 'Downloading...';
        const signedBlob = await signRes.blob();
        downloadBlob(signedBlob, `${baseName}.shortcut`);
        // Shortcuts app import disabled; keep download-only behavior.
        // const hostedUrl = await uploadShortcutForInstall(signedBlob, `${baseName}.shortcut`);
        // openShortcutImport(hostedUrl);
        closeDownloadModal();
    } catch (err) {
        console.error('Download error:', err);
        statusText.textContent = err.message ? `Error: ${err.message}` : 'Download failed';
        setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
    }
}

// ============ Resize Handle ============
function initResizeHandle() {
    const chatPane = document.getElementById('chat-pane');
    const handle = document.getElementById('resize-handle');
    if (!chatPane || !handle) return;
    let isResizing = false;
    handle.addEventListener('mousedown', (e) => { 
        e.preventDefault();
        isResizing = true; 
        handle.classList.add('active'); 
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        e.preventDefault();
        let newWidth = e.clientX;
        if (newWidth < 320) newWidth = 320;
        if (newWidth > 800) newWidth = 800;
        chatPane.style.width = `${newWidth}px`;
    });
    document.addEventListener('mouseup', () => { 
        if (!isResizing) return;
        isResizing = false; 
        handle.classList.remove('active'); 
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    });
}

// ============ Edit Mode ============
function toggleEditMode() {
    editMode = !editMode;
    const btn = document.getElementById('edit-btn');
    const btnText = document.getElementById('edit-btn-text');
    const addBtn = document.getElementById('add-action-btn');
    if (editMode) {
        btn.classList.add('primary');
        btnText.textContent = 'Done';
        document.getElementById('actions-container')?.classList.add('edit-mode');
        if (addBtn) addBtn.style.display = 'flex';
    } else {
        btn.classList.remove('primary');
        btnText.textContent = 'Edit';
        document.getElementById('actions-container')?.classList.remove('edit-mode');
        if (addBtn) addBtn.style.display = 'none';
    }
    updateUndoRedoButtons();
    if (!editMode) {
        flushRichInputs();
        renderActions(null, { suppressAnimations: true });
        return;
    }
    renderActions();
}

// ============ Pipeline Orbs (in chat) ============
const PIPELINE_STEPS = [
    { id: 'catalog', label: 'Thinking', hint: 'Understanding your request' },
    { id: 'build', label: 'Build', hint: 'Creating your shortcut' },
    { id: 'summarize', label: 'Finish', hint: 'Finalizing the build' }
];

const MIN_PIPELINE_ACTIVE_MS = 350;
const pipelineStepMinActiveMs = new Map();
const pipelineStepStartedAt = new Map();
const pipelineStepCompleteTimers = new Map();
let currentPipelineStep = null;
let pipelinePendingStartTimer = null;
let pipelinePendingStartStep = null;
let pipelinePendingStartHint = '';
let pipelineQueuedStep = null;
let pipelineQueuedHint = '';
let pipelinePendingCompletionStep = null;
let pipelinePendingCompletionHint = '';
let pipelineRemovalTimer = null;

function getRandomMs(minMs, maxMs) {
    const min = Math.min(minMs, maxMs);
    const max = Math.max(minMs, maxMs);
    return Math.floor(min + Math.random() * (max - min + 1));
}

function getPipelineMinActiveMs(step) {
    if (step === 'summarize') return 0;
    if (step === 'catalog') return 0;
    return MIN_PIPELINE_ACTIVE_MS;
}

function clearPipelinePendingStart() {
    if (pipelinePendingStartTimer) {
        clearTimeout(pipelinePendingStartTimer);
        pipelinePendingStartTimer = null;
    }
    pipelinePendingStartStep = null;
    pipelinePendingStartHint = '';
}

function clearPipelineStepTimer(step) {
    const t = pipelineStepCompleteTimers.get(step);
    if (t) {
        clearTimeout(t);
        pipelineStepCompleteTimers.delete(step);
    }
}

function clearPipelineRemovalTimer() {
    if (pipelineRemovalTimer) {
        clearTimeout(pipelineRemovalTimer);
        pipelineRemovalTimer = null;
    }
}

function schedulePipelineOrbsRemoval(delayMs = 0) {
    clearPipelineRemovalTimer();
    if (delayMs > 0) {
        pipelineRemovalTimer = setTimeout(() => {
            pipelineRemovalTimer = null;
            removePipelineOrbs();
        }, delayMs);
        return;
    }
    removePipelineOrbs();
}

function showPipelineOrbs() {
    const container = document.getElementById('messages');
    const existing = document.getElementById('pipeline-orbs');
    if (existing) existing.remove();

    const orbsDiv = document.createElement('div');
    orbsDiv.id = 'pipeline-orbs';
    orbsDiv.className = 'pipeline-orbs';
    if (pipelineMode === 'full_catalog') {
        orbsDiv.classList.add('full-catalog');
    }
    orbsDiv.innerHTML = `
        <div class="pipeline-orbs-row" role="group" aria-label="Generation progress">
            ${PIPELINE_STEPS.map((step, idx) => `
                <div class="orb-wrapper" data-orb-wrapper="${step.id}">
                    <div class="orb" id="orb-${step.id}" data-orb-step="${step.id}">
                        <span class="orb-text">${step.label}</span>
                    </div>
                </div>
                ${idx < PIPELINE_STEPS.length - 1 ? '<div class="orb-line"></div>' : ''}
            `).join('')}
        </div>
        <div class="pipeline-orbs-hint" id="pipeline-live-hint"></div>
    `;
    container.appendChild(orbsDiv);
    container.scrollTop = container.scrollHeight;
    resetPipelineSteps();
    updatePipelineProgress('assess', 'started');
}

function updatePipelineOrb(step, status, hint = '') {
    const orb = document.getElementById(`orb-${step}`);
    if (!orb) return;
    orb.classList.remove('active', 'completed');
    if (status === 'started') orb.classList.add('active');
    else if (status === 'completed') orb.classList.add('completed');

    if (status === 'started' || status === 'completed' || hint) {
        const state = status === 'completed' ? 'completed' : status === 'started' ? 'active' : 'idle';
        setPipelineHint(hint || getDefaultHint(step, state));
    }
}

function getDefaultHint(step, state = 'idle') {
    const meta = PIPELINE_STEPS.find(s => s.id === step);
    if (state === 'completed') return 'Done';
    return meta?.hint || 'In progress...';
}

function removePipelineOrbs() {
    clearPipelineRemovalTimer();
    clearPipelinePendingStart();
    currentPipelineStep = null;
    pipelineQueuedStep = null;
    pipelineQueuedHint = '';
    pipelinePendingCompletionStep = null;
    pipelinePendingCompletionHint = '';
    pipelineStepStartedAt?.clear?.();
    if (pipelineStepCompleteTimers && typeof pipelineStepCompleteTimers.forEach === 'function') {
        pipelineStepCompleteTimers.forEach((t) => { try { clearTimeout(t); } catch (e) { } });
        pipelineStepCompleteTimers.clear();
    }
    stopLiveHintTicker();
    document.getElementById('pipeline-orbs')?.remove();
}

// ============ Forced Actions ============
async function addForcedAction(template) {
    closeForceActionModal();
    if (forcedActions.find(a => a.action === template.action)) return; // Already forced
    forcedActions.push({ action: template.action, file: template.file });
    renderForcedActions();
    addMessageToUI(`Will use **${formatActionNameForUI(template.action)}** in next response`, 'assistant');
}

function removeForcedAction(action) {
    forcedActions = forcedActions.filter(a => a.action !== action);
    renderForcedActions();
}

function renderForcedActions() {
    const container = document.getElementById('forced-actions');
    if (!container) return;
    if (forcedActions.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    container.innerHTML = forcedActions.map(a => `
                <div class="forced-action-pill">
                    <span title="${escapeHtml(a.action)}">${escapeHtml(formatActionNameForUI(a.action))}</span>
                    <button onclick="removeForcedAction('${escapeJsString(a.action)}')">&times;</button>
                </div>
            `).join('');
}

// ============ Mode Toggle (in plus menu) ============
function toggleMode(mode) {
    if (chatMode === mode) {
        chatMode = 'standard';
    } else {
        chatMode = mode;
    }
    updateModeIndicators();
    setChatMode(chatMode);
    // Don't close menu - let user see the state change
}

function updateModeIndicators() {
    const discussionToggle = document.getElementById('discussion-mode-toggle');

    discussionToggle?.classList.toggle('active', chatMode === 'discussion');
}

// ============ Animations Toggle ============
function toggleAnimations() {
    animationsEnabled = !animationsEnabled;
    setStoredValue('animations', animationsEnabled ? 'enabled' : 'disabled');
    document.body.classList.toggle('no-animations', !animationsEnabled);
    const text = document.getElementById('animations-toggle-text');
    if (text) text.textContent = animationsEnabled ? 'Disable Animations' : 'Enable Animations';
    document.getElementById('profile-menu')?.classList.remove('active');
}

function initAnimations() {
    if (!animationsEnabled) {
        document.body.classList.add('no-animations');
        const text = document.getElementById('animations-toggle-text');
        if (text) text.textContent = 'Enable Animations';
    }
}

// ============ Context Menu (Right Click / Variable Insert) ============
function showVariableMenu(event, inputEl) {
    event.preventDefault();
    contextMenuTarget = inputEl;
    if (isRichInputElement(inputEl)) {
        saveRichInputSelection(inputEl);
    }
    const menu = document.getElementById('variable-context-menu');

    // Build dynamic menu with linkable actions
    let menuHtml = '<div class="context-menu-header">Insert Variable</div>';
    let hasItems = false;
    currentActions = ensureActionUUIDs(currentActions);
    rebuildOutputNameIndex();

    // Add linkable actions (outputs from previous actions in order)
    const currentActionId = parseInt(inputEl.dataset.actionId);
    const flatActions = flattenActions();
    const currentIndex = flatActions.findIndex(a => a.id === currentActionId);
    const previousActions = currentIndex > 0 ? flatActions.slice(0, currentIndex) : [];
    const repeatOptions = getRepeatVariableOptions(currentActionId);
    if (repeatOptions.length > 0) {
        hasItems = true;
        menuHtml += '<div class="context-menu-divider"></div>';
        menuHtml += '<div class="context-menu-header">Repeat Variables</div>';
        repeatOptions.forEach(opt => {
            menuHtml += `<div class="context-menu-item" data-token="${escapeAttr(opt.value)}">↻ ${escapeHtml(opt.label)}</div>`;
        });
    }
    const linkableActions = previousActions
        .map(a => ({ action: a, output: getActionOutputInfo(a) }))
        .filter(entry => entry.output && actionHasLinkableOutput(entry.action));
    if (linkableActions.length > 0) {
        hasItems = true;
        menuHtml += '<div class="context-menu-divider"></div>';
        menuHtml += '<div class="context-menu-header">Link to Action</div>';
        linkableActions.forEach(({ action: a, output }) => {
            const uuid = output.outputUUID;
            const label = output.outputName || a.title || a.action || 'Action';
            const safeLabel = escapeHtml(label).replace(/\"/g, '&quot;');
            menuHtml += `<div class="context-menu-item" data-source-id="${a.id}" data-source-uuid="${uuid || ''}" data-source-label="${safeLabel}"><span class="context-menu-icon" aria-hidden="true"></span>${escapeHtml(label)}</div>`;
        });
    } else if (!hasItems) {
        menuHtml += '<div class="context-menu-divider"></div>';
        menuHtml += '<div class="context-menu-item context-menu-item-empty">No variables</div>';
    }

    menu.innerHTML = menuHtml;

    // Position menu - ensure it doesn't go off screen on first open
    const margin = 8;
    const x = event.pageX;
    const y = event.pageY;
    menu.style.left = '0px';
    menu.style.top = '0px';
    menu.style.visibility = 'hidden';
    menu.classList.add('active');
    const rect = menu.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - margin) {
        left = window.innerWidth - rect.width - margin;
    }
    if (top + rect.height > window.innerHeight - margin) {
        top = window.innerHeight - rect.height - margin;
    }
    left = Math.max(margin, left);
    top = Math.max(margin, top);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';

    // Wire link clicks
    const linkItems = menu.querySelectorAll('[data-source-id]');
    linkItems.forEach(item => {
        item.addEventListener('click', () => {
            const sourceId = parseInt(item.getAttribute('data-source-id'));
            linkActionParam(currentActionId, inputEl.dataset.param, sourceId, item.getAttribute('data-source-uuid'), item.getAttribute('data-source-label'));
        });
    });

    const tokenItems = menu.querySelectorAll('[data-token]');
    tokenItems.forEach(item => {
        item.addEventListener('click', () => {
            const token = item.getAttribute('data-token');
            applyTokenToContextTarget(token);
        });
    });

    // Position already clamped; no further adjustment needed.
}

function initContextMenu() {
    document.addEventListener('click', () => {
        document.getElementById('variable-context-menu')?.classList.remove('active');
    });
}

function initRichInputHandlers() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.variable-pill-remove');
        if (!btn) return;
        const pill = btn.closest('.variable-pill');
        const input = btn.closest('.param-rich-input');
        if (!pill || !input) return;
        pill.remove();
        handleRichInputChange(input, { render: false });
        normalizeRichInputDisplay(input);
        input.focus();
    });

    document.addEventListener('keydown', (e) => {
        const input = e.target;
        if (!isRichInputElement(input)) return;
        if (e.key !== 'Backspace' && e.key !== 'Delete') return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (!range.collapsed) return;

        let node = range.startContainer;
        let offset = range.startOffset;
        if (node.nodeType === Node.TEXT_NODE) {
            if (e.key === 'Backspace' && offset > 0) return;
            if (e.key === 'Delete' && offset < (node.textContent || '').length) return;
            node = e.key === 'Backspace' ? node.previousSibling : node.nextSibling;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const childNodes = node.childNodes;
            if (e.key === 'Backspace') {
                node = offset > 0 ? childNodes[offset - 1] : node.previousSibling;
            } else {
                node = childNodes[offset] || node.nextSibling;
            }
        }

        if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
        if (!node.classList.contains('variable-pill')) return;

        e.preventDefault();
        const nextFocus = e.key === 'Backspace' ? node.previousSibling : node.nextSibling;
        node.remove();
        handleRichInputChange(input, { render: false });
        normalizeRichInputDisplay(input);
        input.focus();
        if (nextFocus && nextFocus.nodeType === Node.TEXT_NODE) {
            const newRange = document.createRange();
            newRange.setStart(nextFocus, e.key === 'Backspace' ? nextFocus.textContent.length : 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    });

    // Variable pill drag-and-drop within rich inputs
    initPillDragHandlers();
}

// ============ Variable Pill Drag & Drop ============
let pillDragState = null;

function initPillDragHandlers() {
    document.addEventListener('pointerdown', handlePillDragStart);
    document.addEventListener('pointermove', handlePillDragMove);
    document.addEventListener('pointerup', handlePillDragEnd);
    document.addEventListener('pointercancel', handlePillDragEnd);
}

function handlePillDragStart(e) {
    // Only handle left mouse button or touch
    if (e.button && e.button !== 0) return;
    
    // Check if clicking on remove button - don't start drag
    if (e.target.closest('.variable-pill-remove')) return;
    
    const pill = e.target.closest('.variable-pill');
    if (!pill) return;
    
    const richInput = pill.closest('.param-rich-input');
    if (!richInput) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = pill.getBoundingClientRect();
    const token = pill.dataset.token;
    const label = pill.querySelector('.variable-pill-label')?.textContent || token;
    
    // Create ghost element
    const ghost = document.createElement('div');
    ghost.className = 'variable-pill-drag-ghost';
    ghost.textContent = label;
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
    document.body.appendChild(ghost);
    
    pill.classList.add('dragging');
    document.body.classList.add('dragging-pill');
    
    pillDragState = {
        pill,
        ghost,
        richInput,
        token,
        startX: e.clientX,
        startY: e.clientY,
        moved: false
    };
    
    // Capture pointer
    pill.setPointerCapture(e.pointerId);
}

function handlePillDragMove(e) {
    if (!pillDragState) return;
    
    e.preventDefault();
    
    // Update ghost position
    pillDragState.ghost.style.left = e.clientX + 'px';
    pillDragState.ghost.style.top = e.clientY + 'px';
    
    // Check if moved enough to be considered a drag
    const dx = e.clientX - pillDragState.startX;
    const dy = e.clientY - pillDragState.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        pillDragState.moved = true;
    }
    
    // Find drop position in rich input
    const richInput = pillDragState.richInput;
    const range = getDropPositionInRichInput(richInput, e.clientX, e.clientY);
    
    // Store the range for drop
    pillDragState.dropRange = range;
}

function handlePillDragEnd(e) {
    if (!pillDragState) return;
    
    const { pill, ghost, richInput, token, moved, dropRange } = pillDragState;
    
    // Cleanup
    ghost.remove();
    pill.classList.remove('dragging');
    document.body.classList.remove('dragging-pill');
    
    // Release pointer capture
    try {
        pill.releasePointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
    
    // If actually moved, reposition the pill
    if (moved && dropRange) {
        // Remove the original pill
        pill.remove();
        
        // Insert at new position
        const pillWrapper = document.createElement('span');
        pillWrapper.innerHTML = buildVariablePillHtml(token);
        const newPill = pillWrapper.firstElementChild;
        
        // Insert spacing if needed
        const fragment = document.createDocumentFragment();
        const textBefore = dropRange.startContainer.nodeType === Node.TEXT_NODE 
            ? dropRange.startContainer.textContent.slice(0, dropRange.startOffset)
            : '';
        const textAfter = dropRange.startContainer.nodeType === Node.TEXT_NODE
            ? dropRange.startContainer.textContent.slice(dropRange.startOffset)
            : '';
        
        const needsLeadingSpace = textBefore.length > 0 && !/\s$/.test(textBefore);
        const needsTrailingSpace = textAfter.length > 0 && !/^\s/.test(textAfter);
        
        if (needsLeadingSpace) fragment.appendChild(document.createTextNode(' '));
        fragment.appendChild(newPill);
        if (needsTrailingSpace) fragment.appendChild(document.createTextNode(' '));
        
        dropRange.insertNode(fragment);
        
        // Update the data
        handleRichInputChange(richInput, { render: false });
        normalizeRichInputDisplay(richInput);
    }
    
    pillDragState = null;
}

function getDropPositionInRichInput(richInput, clientX, clientY) {
    if (!richInput) return null;
    
    // Use caretPositionFromPoint or caretRangeFromPoint
    let range;
    
    if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(clientX, clientY);
        if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
        }
    } else if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(clientX, clientY);
    }
    
    // Validate range is within richInput
    if (range && richInput.contains(range.startContainer)) {
        // Don't drop inside another pill
        if (range.startContainer.closest && range.startContainer.closest('.variable-pill')) {
            // Move after the pill instead
            const nearestPill = range.startContainer.closest('.variable-pill');
            range = document.createRange();
            range.setStartAfter(nearestPill);
            range.collapse(true);
        } else if (range.startContainer.nodeType === Node.ELEMENT_NODE && 
                   range.startContainer.classList?.contains('variable-pill')) {
            range = document.createRange();
            range.setStartAfter(range.startContainer);
            range.collapse(true);
        }
        return range;
    }
    
    // Fallback: append at end
    range = document.createRange();
    range.selectNodeContents(richInput);
    range.collapse(false);
    return range;
}

function applyTokenToContextTarget(token) {
    if (!contextMenuTarget || !token) return;
    const actionId = parseInt(contextMenuTarget.dataset.actionId);
    const paramKey = contextMenuTarget.dataset.param;
    if (contextMenuTarget.classList?.contains('param-variable-select')) {
        contextMenuTarget.value = token;
        handleVariableSelectChange(contextMenuTarget);
        document.getElementById('variable-context-menu')?.classList.remove('active');
        return;
    }
    if (paramKeySupportsInlineLinks(paramKey)) {
        if (isRichInputElement(contextMenuTarget)) {
            insertTokenIntoRichInput(contextMenuTarget, token);
            normalizeRichInputDisplay(contextMenuTarget);
        } else if (typeof contextMenuTarget.value === 'string') {
            const start = contextMenuTarget.selectionStart || contextMenuTarget.value.length;
            const end = contextMenuTarget.selectionEnd || contextMenuTarget.value.length;
            const text = contextMenuTarget.value;
            contextMenuTarget.value = text.slice(0, start) + token + text.slice(end);
            contextMenuTarget.focus();
            contextMenuTarget.setSelectionRange(start + token.length, start + token.length);
            contextMenuTarget.dispatchEvent(new Event('change'));
        }
        document.getElementById('variable-context-menu')?.classList.remove('active');
        return;
    }
    if (Number.isFinite(actionId) && paramKey) {
        updateActionParam(actionId, paramKey, token);
    }
    document.getElementById('variable-context-menu')?.classList.remove('active');
}

function insertVariable(varName) {
    const varText = formatIdToken(varName);
    if (!varText) return;
    applyTokenToContextTarget(varText);
}

function linkActionParam(targetId, paramKey, sourceId, sourceUuid, sourceLabel) {
    const targetInfo = findActionLocation(targetId);
    const sourceInfo = findActionLocation(sourceId);
    const target = targetInfo?.action;
    const source = sourceInfo?.action;
    if (!target || !source) return;

    currentActions = ensureActionUUIDs(currentActions);
    rebuildOutputNameIndex();
    const sourceOutput = getActionOutputInfo(source);
    let outputUUID = sourceUuid ? String(sourceUuid) : (sourceOutput?.outputUUID || source?.params?.UUID || '');
    const outputName = sourceLabel || sourceOutput?.outputName || source?.title || source?.action || 'Previous Output';

    // Only allow linking when the source exposes an output
    const availableOutputs = collectAvailableOutputs();
    if (!outputUUID) {
        if (!source.params) source.params = {};
        source.params.UUID = genUUID();
        outputUUID = source.params.UUID;
    }
    if (outputUUID && !availableOutputs.has(String(outputUUID))) {
        availableOutputs.add(String(outputUUID));
        if (sourceOutput?.outputId) availableOutputs.add(String(sourceOutput.outputId));
    }

    // Text-like fields should allow mixing text + links, so insert an inline link token.
    if (paramKeySupportsInlineLinks(paramKey) && contextMenuTarget) {
        const base = sourceOutput?.outputId || outputUUID;
        const token = formatIdToken(base);
        if (!token) return;
        if (isRichInputElement(contextMenuTarget)) {
            insertTokenIntoRichInput(contextMenuTarget, token);
            normalizeRichInputDisplay(contextMenuTarget);
        } else if (typeof contextMenuTarget.value === 'string') {
            const start = contextMenuTarget.selectionStart ?? contextMenuTarget.value.length;
            const end = contextMenuTarget.selectionEnd ?? contextMenuTarget.value.length;
            const currentText = contextMenuTarget.value;
            const left = currentText.slice(0, start);
            const right = currentText.slice(end);
            const needsLeadingSpace = left.length > 0 && !/\s$/.test(left);
            const needsTrailingSpace = right.length > 0 && !/^\s/.test(right);
            const insertText =
                (needsLeadingSpace ? ' ' : '') +
                token +
                (needsTrailingSpace ? ' ' : '');

            contextMenuTarget.value = left + insertText + right;
            const nextCursor = (left + insertText).length;
            contextMenuTarget.focus();
            try { contextMenuTarget.setSelectionRange(nextCursor, nextCursor); } catch { }
            contextMenuTarget.dispatchEvent(new Event('change'));
        }
        document.getElementById('variable-context-menu')?.classList.remove('active');
        return;
    }

    if (contextMenuTarget && contextMenuTarget.classList?.contains('param-variable-select')) {
        const base = sourceOutput?.outputId || outputUUID;
        const token = formatIdToken(base);
        if (!token) return;
        contextMenuTarget.value = token;
        handleVariableSelectChange(contextMenuTarget);
        document.getElementById('variable-context-menu')?.classList.remove('active');
        return;
    }

    if (!target.params) target.params = {};
    const existing = target.params[paramKey];
    const existingUuid = existing?.Value?.OutputUUID || existing?.OutputUUID || '';
    if (existingUuid && String(existingUuid) === String(outputUUID)) {
        return;
    }
    pushUndoState();
    target.params[paramKey] = {
        Value: {
            OutputName: outputName,
            OutputUUID: outputUUID, // Use the same UUID as source
            Type: 'ActionOutput'
        },
        WFSerializationType: 'WFTextTokenAttachment'
    };
    commitActionChanges([targetId, sourceId]);
}

function clearLinkedParam(actionId, paramKey) {
    const action = findActionLocation(actionId)?.action;
    if (!action) return;
    const currentValue = action.params?.[paramKey];
    const useDropdown = !paramKeySupportsInlineLinks(paramKey) && shouldUseVariableDropdown(currentValue);
    const fallback = useDropdown ? '{{VARIABLE}}' : buildParamPlaceholder(paramKey);
    if (!action.params) action.params = {};
    if (action.params[paramKey] === fallback) return;
    pushUndoState();
    action.params[paramKey] = fallback;
    commitActionChanges([actionId]);
}

// Mobile: add button to insert variable
function addVariableInsertButton(inputEl) {
    // Check if on touch device
    if ('ontouchstart' in window) {
        const btn = document.createElement('button');
        btn.className = 'insert-var-btn';
        btn.innerHTML = '{}';
        btn.title = 'Insert Variable';
        btn.onclick = (e) => {
            e.preventDefault();
            showVariableMenu(e, inputEl);
        };
        inputEl.parentElement.appendChild(btn);
    }
}

// ============ Tutorial System ============
const tutorialStepsDesktop = [
    { target: '#chat-input', title: 'Chat Input', text: 'Describe the shortcut you want to build. The AI will create it for you!' },
    { target: '#plus-menu-btn', title: 'Quick Actions', text: 'Click here to access Force Action and Discussion Mode. Modes turn blue when active.' },
    { target: '#preview-canvas', title: 'Shortcut Preview', text: 'Your shortcut actions will appear here. Click Edit to drag and reorder them!' },
    { target: '#edit-btn', title: 'Edit Mode', text: 'Click Edit to modify, add, or remove actions. You can also right-click inputs to insert variables.' },
    { target: '#top-download-btn', title: 'Download', text: 'When you\'re done, download your shortcut to use in the Shortcuts app!' }
];

const tutorialStepsMobile = [
    { target: '#chat-input', title: 'Chat Input', text: 'Describe the shortcut you want to build. The AI will create it for you!' },
    { target: '#mobile-project-edit-btn', title: 'Edit Project', text: 'Tap here to edit the project name, description, or icon.' },
    { target: '#mobile-shortcut-card', title: 'Shortcut Card', text: 'Your shortcut summary lives here with quick actions at a glance.' },
    { target: '#mobile-card-inspect-btn', title: 'Inspect Actions', text: 'Open the action preview to review or edit your shortcut.' },
    { target: '#mobile-card-download-btn', title: 'Download', text: 'Grab the finished shortcut for the Shortcuts app.' }
];

function getTutorialSteps() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return tutorialStepsDesktop;
    }
    return window.matchMedia('(max-width: 1024px)').matches ? tutorialStepsMobile : tutorialStepsDesktop;
}

function startTutorial() {
    tutorialStep = 0;
    document.getElementById('profile-menu')?.classList.remove('active');
    showTutorialStep();
}

function showTutorialStep() {
    const overlay = document.getElementById('tutorial-overlay');
    const spotlight = document.getElementById('tutorial-spotlight');
    const popup = document.getElementById('tutorial-popup');
    const title = document.getElementById('tutorial-title');
    const text = document.getElementById('tutorial-text');
    const indicator = document.getElementById('tutorial-indicator');
    const nextBtn = document.getElementById('tutorial-next');

    const steps = getTutorialSteps();
    if (tutorialStep >= steps.length) {
        skipTutorial();
        return;
    }

    const step = steps[tutorialStep];
    const targetEl = document.querySelector(step.target);

    overlay.classList.add('active');
    title.textContent = step.title;
    text.textContent = step.text;
    indicator.innerHTML = steps.map((_, i) => `<span class="${i === tutorialStep ? 'active' : ''}"></span>`).join('');
    nextBtn.textContent = tutorialStep === steps.length - 1 ? 'Done' : 'Next';

    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        spotlight.style.left = (rect.left - 10) + 'px';
        spotlight.style.top = (rect.top - 10) + 'px';
        spotlight.style.width = (rect.width + 20) + 'px';
        spotlight.style.height = (rect.height + 20) + 'px';
        spotlight.style.display = 'block';

        // Position popup near target
        const popupWidth = 320;
        const popupHeight = 250; // Safe estimate
        const margin = 20;

        // Horizontal positioning
        let left = rect.left;
        // Clamp left to be within screen
        left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));
        popup.style.left = left + 'px';

        // Vertical positioning
        let top = rect.bottom + margin;

        // Check if it fits below
        if (top + popupHeight > window.innerHeight - margin) {
            // Try above
            const topAbove = rect.top - popupHeight - margin;
            if (topAbove > margin) {
                top = topAbove;
            } else {
                // If neither fits perfectly, put it where there is more space
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                if (spaceAbove > spaceBelow) {
                    top = Math.max(margin, topAbove); // Clamp to top edge
                } else {
                    top = Math.min(window.innerHeight - popupHeight - margin, top); // Clamp to bottom edge
                }
            }
        }
        popup.style.top = top + 'px';
    }
}

function nextTutorialStep() {
    tutorialStep++;
    showTutorialStep();
}

function skipTutorial() {
    document.getElementById('tutorial-overlay').classList.remove('active');
    setStoredValue('tutorial_done', 'true');
    hasCompletedTutorial = true;
}

function checkFirstTimeTutorial() {
    if (!hasCompletedTutorial && currentProject) {
        // Check if this is their first ever project
        const allProjects = parseStoredJson('projects', []);
        if (allProjects.length === 1) {
            setTimeout(() => startTutorial(), 500);
        }
    }
}

// ============ View Updates ============
function updateViewButtons() {
    const downloadBtn = document.getElementById('top-download-btn');
    const workspaceView = document.getElementById('workspace-view');
    const inWorkspace = workspaceView ? !workspaceView.classList.contains('hidden') : isWorkspacePage();
    if (downloadBtn) {
        downloadBtn.style.display = inWorkspace ? 'flex' : 'none';
    }
}

// Initialize new features
document.addEventListener('DOMContentLoaded', () => {
    initAnimations();
    initContextMenu();
    initRichInputHandlers();
    updateModeIndicators();
    renderForcedActions();
    initInputCounters();
});

function initInputCounters() {
    const inputs = [
        { id: 'mobile-project-name-input', counterId: 'mobile-project-name-counter', max: PROJECT_NAME_MAX },
        { id: 'project-name-input', counterId: 'project-name-counter', max: PROJECT_NAME_MAX },
        { id: 'project-settings-name', counterId: 'project-settings-name-counter', max: PROJECT_NAME_MAX },
        { id: 'project-settings-description', counterId: 'project-settings-description-counter', max: PROJECT_DESCRIPTION_MAX }
    ];

    inputs.forEach(({ id, counterId, max }) => {
        const input = document.getElementById(id);
        const counter = document.getElementById(counterId);
        if (!input || !counter) return;

        const updateCounter = () => {
            const len = input.value.length;
            counter.textContent = `${len}/${max}`;
            if (len >= max) {
                counter.style.color = 'var(--danger-color)';
            } else {
                counter.style.color = 'var(--text-muted)';
            }
        };

        input.addEventListener('input', updateCounter);
        // Initial update
        updateCounter();
        
        // Also update when value is set programmatically (if we can catch it, or just rely on other functions calling it)
        // We can use a MutationObserver if needed, but for now manual calls in update functions might be better.
        // Or just rely on the fact that when we set .value we usually trigger an event or we can just call updateCounter manually.
    });
}

// Helper to manually trigger counter updates when values change programmatically
function updateInputCounters() {
    const inputs = [
        { id: 'mobile-project-name-input', counterId: 'mobile-project-name-counter', max: PROJECT_NAME_MAX },
        { id: 'project-name-input', counterId: 'project-name-counter', max: PROJECT_NAME_MAX },
        { id: 'project-settings-name', counterId: 'project-settings-name-counter', max: PROJECT_NAME_MAX },
        { id: 'project-settings-description', counterId: 'project-settings-description-counter', max: PROJECT_DESCRIPTION_MAX }
    ];
    
    inputs.forEach(({ id, counterId, max }) => {
        const input = document.getElementById(id);
        const counter = document.getElementById(counterId);
        if (input && counter) {
            const len = input.value.length;
            counter.textContent = `${len}/${max}`;
             if (len >= max) {
                counter.style.color = 'var(--danger-color)';
            } else {
                counter.style.color = 'var(--text-muted)';
            }
        }
    });
}
