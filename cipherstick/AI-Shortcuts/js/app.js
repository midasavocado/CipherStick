// ============ Configuration ============
        const API_BASE = 'https://secrets.mwsaulsbury.workers.dev';
        const IS_PRO_USER = false; // Set to true for pro users
        const APP_VERSION = '2025-12-14-6';
        console.log(`[App] Loaded js/app.js v${APP_VERSION}`);

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

        // ============ Init ============
        document.addEventListener('DOMContentLoaded', () => {
            initApp();
            initTheme();
            initResizeHandle();
            loadTemplates();
            initEventListeners();
        });

        function initApp() {
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('id');
            const initialPrompt = urlParams.get('prompt');
            if (projectId) {
                loadProject(projectId);
            } else if (initialPrompt) {
                createNewProject(initialPrompt);
            } else {
                showProjectsView();
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
	            document.getElementById('project-name-input')?.addEventListener('blur', function () {
	                if (!currentProject) return;
	                const nextName = this.value.trim();
	                if (!nextName) return;
	                if (nextName !== currentProject.name) {
	                    pushUndoState();
	                    currentProject.name = nextName;
	                    saveProjects();
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
        function showProjectsView() {
            document.getElementById('projects-view').classList.remove('hidden');
            document.getElementById('workspace-view').classList.add('hidden');
            window.history.replaceState({}, '', 'app.html');
            renderProjectsGrid();
        }

        function showWorkspaceView() {
            document.getElementById('projects-view').classList.add('hidden');
            document.getElementById('workspace-view').classList.remove('hidden');
        }

        // ============ Projects ============
        function renderProjectsGrid() {
            const grid = document.getElementById('projects-grid');
            if (!grid) return;
            const newCard = grid.querySelector('.new-project-card');
            grid.innerHTML = '';
            if (newCard) grid.appendChild(newCard);

            projects.forEach(p => {
                const card = document.createElement('div');
                card.className = 'project-card';
                card.onclick = () => loadProject(p.id);
                const date = new Date(p.updated).toLocaleDateString();
                const actionCount = p.actions ? p.actions.length : 0;
                card.innerHTML = `
                    <h3>${escapeHtml(p.name)}</h3>
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

        function createNewProject(initialPrompt = null) {
            const id = 'proj_' + Date.now();
            const newProject = {
                id,
                name: 'New Shortcut',
                created: Date.now(),
                updated: Date.now(),
                history: [],
                actions: [],
                programObj: null
            };
            projects.unshift(newProject);
            saveProjects();
            loadProject(id);
            if (initialPrompt) {
                setTimeout(() => {
                    document.getElementById('chat-input').value = initialPrompt;
                    handleSend();
                }, 300);
            }
        }

        function loadProject(id) {
            currentProject = projects.find(p => p.id === id);
            if (!currentProject) { showProjectsView(); return; }
            currentExportCache = null;
            currentActions = ensureActionUUIDs(currentProject.actions || []);
            currentActions = normalizeControlFlowToNested(currentActions);
            currentProject.actions = currentActions;
            saveProjects();
		            currentProgramObj = currentProject.programObj || null;
		            resetUndoRedoHistory();
	            showWorkspaceView();
	            document.getElementById('project-name-input').value = currentProject.name;
	            window.history.replaceState({}, '', `app.html?id=${id}`);
            const messagesEl = document.getElementById('messages');
            messagesEl.innerHTML = '';
            // No welcome message - show empty state instead
	            if (currentProject.history.length > 0) {
	                currentProject.history.forEach(msg => addMessageToUI(msg.content, msg.role));
	            }
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

        function serializeActionForExport(action) {
            if (!action || typeof action !== 'object') return action;
            const out = {
                action: action.action || action.title || 'Unknown',
                params: clonePlainObject(action.params || {})
            };
            if (Array.isArray(action.then)) out.then = action.then.map(serializeActionForExport);
            if (Array.isArray(action.else)) out.else = action.else.map(serializeActionForExport);
            if (Array.isArray(action.do)) out.do = action.do.map(serializeActionForExport);
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
                out.push(serializeActionForExport(node.action));
            });
            return out;
        }

        function buildProgramExport(actions = currentActions) {
            return {
                name: currentProject?.name || 'My Shortcut',
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
	                if (typeof state.name === 'string' && state.name.trim()) {
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
	            const shouldShow = !!currentProject && !!editMode;
	            if (undoBtn) {
	                undoBtn.disabled = !currentProject || undoStack.length === 0;
	                undoBtn.style.display = shouldShow ? 'inline-flex' : 'none';
	            }
	            if (redoBtn) {
	                redoBtn.disabled = !currentProject || redoStack.length === 0;
	                redoBtn.style.display = shouldShow ? 'inline-flex' : 'none';
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
            return (crypto?.randomUUID?.() || ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
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
                return a;
            });
        }

        // Normalize flat WFControlFlowMode marker lists into nested JSON blocks ({ then/else/do }).
        // This prevents reordering from moving only the start-marker and accidentally "swallowing" actions.
        function normalizeControlFlowToNested(actions) {
            if (!Array.isArray(actions)) return [];

            const root = [];
            const stack = [{ kind: 'root', id: null, node: null, target: root }];

            const currentTarget = () => stack[stack.length - 1].target;

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
            }
            return null;
        }

        function actionContainsId(action, targetId) {
            if (!action) return false;
            const checkArray = (arr) => Array.isArray(arr) && arr.some(a => a?.id === targetId || actionContainsId(a, targetId));
            return checkArray(action.then) || checkArray(action.else) || checkArray(action.do);
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
                }
            });
            return result;
        }

        function buildParamPlaceholder(paramKey) {
            // Avoid leaking template-style placeholders (e.g. {{OUTPUT}}) into the UI.
            // Use empty string instead; the UI already provides contextual placeholders.
            return '';
        }

        const SIMPLE_ID_LABEL_RE = /^[A-Za-z0-9_.\-|#@]+$/;

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
            // (e.g., Text/Prompt/Body/Title/Message/etc.)
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
                key.includes('description')
            );
        }

        const INLINE_TOKEN_RE = /!id:(?:\{\{[^}]+?\}\}|[^\s]+)|!link:[^\s]+|\{\{[^}]+?\}\}/gi;
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
                        ${readonly ? '' : '<button type="button" class="var-insert-btn" onclick="openVariableMenuFromButton(this)">+</button>'}
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
                    <button type="button" class="var-insert-btn" onclick="openVariableMenuFromButton(this)">+</button>
                </div>
            `;
        }

        function openVariableMenuFromButton(btn) {
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
            if (lowerKey.includes('prompt')) return 'Enter prompt';
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
            return isIdToken(strValue) || /^!link:/i.test(strValue);
        }

        function getVariableDropdownOptions(actionId) {
            const flatActions = flattenActions();
            const currentIndex = flatActions.findIndex(a => a.id === actionId);
            const previousActions = currentIndex > 0 ? flatActions.slice(0, currentIndex) : [];
            const options = [];
            const seen = new Set();
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
            if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
                return trimmed.slice(2, -2).trim();
            }
            return trimmed;
        }

        function buildVariablePillHtml(token) {
            const rawToken = String(token || '');
            const label = getTokenDisplayLabel(rawToken);
            const resolved =
                resolveOutputNameByUUID(rawToken, null) ||
                resolveOutputNameByUUID(label, null);
            const display = humanizeOutputName(resolved || label || rawToken);
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
	            const outputUUID = action.params.UUID;
	            if (!outputUUID) return null;
	            const rawUUID = String(outputUUID).trim();
                const rawIdValue = action.params.ID ?? action.params.Id ?? action.params.id ?? null;
                const idLabel = normalizeIdLabel(rawIdValue);
                const hasExplicitId = isExplicitIdLabel(String(rawIdValue ?? ''));
	            const rawNameCandidate =
	                (action.params.CustomOutputNameEnabled && typeof action.params.CustomOutputName === 'string' && action.params.CustomOutputName.trim())
                    ? action.params.CustomOutputName.trim()
                    : (typeof action.params.OutputName === 'string' && action.params.OutputName.trim())
                        ? action.params.OutputName.trim()
                        : (hasExplicitId && idLabel ? idLabel : (isIdToken(rawUUID) ? normalizeIdLabel(rawUUID) : ''))
                            || action.title || action.action || 'Action Output';

	            const outputName = String(rawNameCandidate || '').trim() || 'Action Output';
	            return { outputUUID: rawUUID, outputName, outputId: hasExplicitId ? idLabel : null };
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
	            return outputNameIndexByUUID.get(normalized || key) || fallbackName;
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
	                if (t.toLowerCase().startsWith('!id:') || t.toLowerCase().startsWith('!link:')) return true;
	                if (uuidLike.test(t)) return true;
	                return false;
	            };

	            const tokenIsValidLink = (token, currentIndex) => {
	                const t = String(token || '').trim();
	                if (!tokenIsLinkish(t)) return true;
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

	            const scrubString = (key, rawValue, currentIndex) => {
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
	                    if (!tokenIsValidLink(trimmed, currentIndex)) {
	                        mutated = true;
	                        return '';
	                    }
	                    return rawValue;
	                }

	                // Mixed text: replace only invalid tokens.
	                if (!str.toLowerCase().includes('!id:') && !str.toLowerCase().includes('!link:')) return rawValue;
	                const replaced = str.replace(/!id:(?:\{\{[^}]+?\}\}|[^\s]+)/gi, (token) => {
	                    if (!tokenIsValidLink(token, currentIndex)) {
	                        mutated = true;
	                        return '';
	                    }
	                    return token;
	                }).replace(/!link:[^\s]+/gi, (token) => {
	                    if (!tokenIsValidLink(token, currentIndex)) {
	                        mutated = true;
	                        return '';
	                    }
	                    return token;
	                });
	                return replaced.replace(/\s{2,}/g, ' ');
	            };

	            const scrubAction = (action) => {
	                if (!action?.params) return;
	                const currentIndex = actionIndexById.get(action.id);
	                Object.entries(action.params).forEach(([key, value]) => {
	                    if (typeof value === 'string') {
	                        const next = scrubString(key, value, currentIndex);
	                        if (next !== value) action.params[key] = next;
	                        return;
	                    }
	                    if (value && typeof value === 'object') {
	                        const linkedUuid = value?.Value?.OutputUUID || value?.OutputUUID || '';
	                        const linkedKeyRaw = linkedUuid ? String(linkedUuid) : '';
	                        let linkedKey = linkedKeyRaw.trim();
	                        if (!linkedKey) return;
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
	            (action.then || []).forEach(scrubAction);
	            (action.else || []).forEach(scrubAction);
	        } else if (isRepeatAction(action)) {
	            (action.do || []).forEach(scrubAction);
	        }
	    };
	    (currentActions || []).forEach(scrubAction);
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
	            ['getcurrentapp', 'Get Current App'],
	            ['getfoldercontents', 'Get Folder Contents'],
	            ['file.getfoldercontents', 'Get Folder Contents'],
	            ['returntohomescreen', 'Return to Home Screen'],
	            ['waittoreturn', 'Wait to Return'],
	            ['savetocameraroll', 'Save to Camera Roll'],
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
	            'priority', 'qrcode', 'qr', 'roll', 'screen', 'setting', 'settings', 'shortcuts', 'sound', 'spell', 'store',
	            'string', 'text', 'timer', 'to', 'transcribe', 'url', 'variable', 'video', 'volume', 'weather', 'web',
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

        function addMessageToUI(text, role) {
            const container = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = `message ${role}`;
            const avatar = role === 'user'
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
                : 'S';
            div.innerHTML = `<div class="message-avatar">${avatar}</div><div class="message-bubble">${formatMessage(text)}</div>`;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function formatMessage(text) {
            return renderMarkdown(String(text || ''));
        }

        function renderMarkdown(src) {
            const text = String(src || '').replace(/\r\n/g, '\n');
            if (!text) return '';

            const lines = text.split('\n');
            const blocks = [];
            let i = 0;

            const isFence = (line) => /^\s*```/.test(line);
            const isHeading = (line) => /^\s*#{1,3}\s+/.test(line);
            const isQuote = (line) => /^\s*>\s?/.test(line);
            const isUl = (line) => /^\s*[-*+]\s+/.test(line);
            const isOl = (line) => /^\s*\d+\.\s+/.test(line);

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

                const headingMatch = line.match(/^\s*(#{1,3})\s+(.+?)\s*$/);
                if (headingMatch) {
                    const level = headingMatch[1].length; // 1–3
                    const headingText = headingMatch[2];
                    const tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
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
                    blocks.push(`<blockquote>${renderMarkdown(quoteLines.join('\n'))}</blockquote>`);
                    continue;
                }

                if (isUl(line)) {
                    const items = [];
                    while (i < lines.length && isUl(lines[i])) {
                        items.push((lines[i] || '').replace(/^\s*[-*+]\s+/, ''));
                        i++;
                    }
                    blocks.push(`<ul>${items.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`);
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
                    if (isFence(l) || isHeading(l) || isQuote(l) || isUl(l) || isOl(l)) break;
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
                t = t.replace(/\*\*([^<]+?)\*\*/g, '<strong>$1</strong>');
                t = t.replace(/\*([^<]+?)\*/g, '<em>$1</em>');
                return t;
            }).join('');
        }

        function escapeAttr(str) {
            return escapeHtml(String(str || '')).replace(/`/g, '&#96;');
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function showTypingIndicator() {
            const container = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message assistant';
            div.id = 'typing-indicator';
            div.innerHTML = `<div class="message-avatar">S</div><div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function removeTypingIndicator() {
            document.getElementById('typing-indicator')?.remove();
        }

        function updateMarkdownPreview() {
            const preview = document.getElementById('markdown-preview');
            if (preview) {
                preview.style.display = 'none';
                preview.innerHTML = '';
            }
        }

	        // ============ AI API ============
	        function buildProgramPreviewActions(actions = currentActions) {
	            if (!Array.isArray(actions)) return [];
	            return actions.map(a => {
	                const entry = { action: a.action || a.title || 'Unknown', params: a.params || {} };
	                if (Array.isArray(a.then)) entry.then = buildProgramPreviewActions(a.then);
	                if (Array.isArray(a.else)) entry.else = buildProgramPreviewActions(a.else);
	                if (Array.isArray(a.do)) entry.do = buildProgramPreviewActions(a.do);
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
	            const isDiscussionMode = chatMode === 'discussion';
	            if (!isDiscussionMode) showPipelineOrbs();
	            showTypingIndicator();

	            try {
	                const plan = (getStoredValue('plan') || 'free') === 'paid' ? 'paid' : 'free';
	                // Default back to your preferred model; backend will fall back if it's unavailable.
	                const model = getStoredValue('model') || 'openai/gpt-oss-120b:free';
                console.log(`[ShortcutStudio] Using model: ${model} (plan: ${plan})`);

	                const forceInstruction = forcedActions.length
	                    ? `You MUST include these actions somewhere in the next response and any generated shortcut: ${forcedActions.map(f => f.action).join(', ')}. This is a minimum requirement; you may include other actions too.`
	                    : '';

	                const userTurns = (currentProject?.history || []).filter(m => m.role === 'user');
	                const isFollowUp = userTurns.length > 1;
		                const mode = isDiscussionMode ? 'clarify' : (isFollowUp ? 'update' : 'plan');
		                const basePrompt = userTurns[0]?.content || userPrompt;
		                let programText = getCurrentProgramPreviewText();
		                const recentHistory = currentProject?.history?.slice(-10) || [];
		                const context = {
		                    basePrompt,
		                    programText,
	                    history: recentHistory
	                };
	                const body = {
	                    name: currentProject.name,
	                    prompt: userPrompt,
	                    followUp: isFollowUp,
	                    mode,
	                    context,
	                    history: recentHistory,
	                    model,
	                    plan,
	                    forcedActions,
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
                let finalData = null;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.trim() || !line.trim().startsWith('{')) continue;
                        try {
                            const packet = JSON.parse(line);
                            console.log('[AI stream]', packet);
                            handleStreamPacket(packet);
                            if (packet.type === 'final' || packet.type === 'error') {
                                finalData = packet;
                            }
                        } catch (e) { console.warn('Parse error:', e); }
                    }
                }

                removeTypingIndicator();

                if (finalData) {
                    handleFinalResponse(finalData);
                }
                removePipelineOrbs();
            } catch (err) {
                console.error('API Error:', err);
                removeTypingIndicator();
                removePipelineOrbs();
                addMessageToUI('⚠️ Failed to connect to the AI service. Please try again.', 'assistant');
            }

            isGenerating = false;
        }

        function handleStreamPacket(packet) {
            if (packet.type === 'progress') {
                updatePipelineProgress(packet.step, packet.status, packet.hint);
            }
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
	            if (pipelineStepCompleteTimers && typeof pipelineStepCompleteTimers.forEach === 'function') {
	                pipelineStepCompleteTimers.forEach((t) => { try { clearTimeout(t); } catch (e) { } });
	                pipelineStepCompleteTimers.clear();
	            }
	            pipelineStepStartedAt?.clear?.();

	            PIPELINE_STEPS.forEach(({ id }) => {
	                const el = document.getElementById(`step-${id}`);
	                if (el) el.classList.remove('active', 'completed');
	                const orb = document.getElementById(`orb-${id}`);
	                orb?.classList.remove('active', 'completed');
	            });
	            const hintEl = document.getElementById('pipeline-orbs-hint');
	            if (hintEl) hintEl.textContent = getDefaultHint('plan', 'active');
	        }

        function updatePipelineProgress(step, status, hint = '') {
            const order = PIPELINE_STEPS.map(s => s.id);
            // Map backend steps to frontend steps
            const stepMap = {
                'assess': 'plan',
                'search': 'catalog',
                'build': 'build',
                'summarize': 'summarize'
            };
            const frontendStep = stepMap[step] || step;
            const idx = order.indexOf(frontendStep);
            const now = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();

            if (status === 'started') {
                const applyStart = () => {
                    const startNow = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
                    clearPipelinePendingStart();
                    currentPipelineStep = frontendStep;
                    clearPipelineStepTimer(frontendStep);
                    pipelineStepStartedAt.set(frontendStep, startNow);
                    if (idx > 0) {
                        for (let i = 0; i < idx; i++) {
                            clearPipelineStepTimer(order[i]);
                            updatePipelineOrb(order[i], 'completed');
                        }
                    }
                    updatePipelineOrb(frontendStep, 'started', hint);
                };

                const prevStep = idx > 0 ? order[idx - 1] : null;
                const prevStartedAt = prevStep ? pipelineStepStartedAt.get(prevStep) : null;
                const prevElapsed = (prevStep && typeof prevStartedAt === 'number') ? (now - prevStartedAt) : null;
                const delayMs = (prevStep && prevStep === currentPipelineStep && prevElapsed != null && prevElapsed < MIN_PIPELINE_ACTIVE_MS)
                    ? (MIN_PIPELINE_ACTIVE_MS - prevElapsed)
                    : 0;

                if (delayMs > 0) {
                    clearPipelinePendingStart();
                    pipelinePendingStartTimer = setTimeout(applyStart, delayMs);
                    return;
                }

                applyStart();
                return;
            }

            if (status === 'completed') {
                const startedAt = pipelineStepStartedAt.get(frontendStep);
                const elapsed = typeof startedAt === 'number' ? (now - startedAt) : null;
                const remaining = (elapsed != null && elapsed < MIN_PIPELINE_ACTIVE_MS)
                    ? (MIN_PIPELINE_ACTIVE_MS - elapsed)
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
	                addMessageToUI(`⚠️ ${data.message || 'An error occurred'}`, 'assistant');
	                return;
	            }
	            const isDiscussionMode = chatMode === 'discussion';
	            const nextName = typeof data.finalName === 'string' ? data.finalName.trim() : '';
	            const willApplyProgram = !!data.program && !isDiscussionMode;
	            const willApplyName = !!(nextName && currentProject && !isDiscussionMode && nextName !== currentProject.name);
	            if (willApplyProgram || willApplyName) {
	                pushUndoState();
	            }
	            PIPELINE_STEPS.forEach(({ id }) => updatePipelineOrb(id, 'completed'));

	            // Update project name from AI
	            if (willApplyName) {
	                currentProject.name = nextName;
	                document.getElementById('project-name-input').value = nextName;
	            }

	            // Store program object
	            if (willApplyProgram) {
	                currentProgramObj = data.program;
	                if (currentProject) currentProject.programObj = currentProgramObj;

	                // Extract actions from program
	                if (Array.isArray(data.program.actions)) {
	                    currentActions = data.program.actions.map((act, i) => {
	                        const actionObj = {
	                            id: Date.now() + i,
	                            action: act.action || 'Unknown',
	                            title: act.action || 'Action',
	                            params: act.params || {}
	                        };
	                        // Preserve nested structure (then/else/do arrays) if present
	                        if (Array.isArray(act.then)) actionObj.then = act.then;
	                        if (Array.isArray(act.else)) actionObj.else = act.else;
	                        if (Array.isArray(act.do)) actionObj.do = act.do;
	                        return actionObj;
	                    });
		                    currentActions = ensureActionUUIDs(currentActions);
		                    currentActions = normalizeControlFlowToNested(currentActions);
		                    if (currentProject) currentProject.actions = currentActions;
		                }
		            }

            // Add AI response to chat
            if (data.answer) {
                addMessageToUI(data.answer, 'assistant');
                if (currentProject) {
                    currentProject.history.push({ role: 'assistant', content: data.answer });
                }
            }

	            saveProjects();
	            if (willApplyProgram) {
	                // Animate all actions from AI response
	                renderActions(true);
	            }
	            updateUndoRedoButtons();
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
	                    const input = node.action.params?.Input || node.action.params?.WFInput || '{{VARIABLE}}';
                    const compareTo = node.action.params?.CompareTo || node.action.params?.WFConditionalActionString || '{{STRING}}';
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
                    const repeatItems = node.action.params?.Items || node.action.params?.RepeatItemVariableName || node.action.params?.WFRepeatItemVariableName || '';
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
                        const itemsInputHtml = editMode ? getInputForType(node.action.id, 'Items', repeatItems || '{{VARIABLE}}', false) : `<span class="repeat-value">${formatLinkedValue(repeatItems || '')}</span>`;
                        repeatHeaderHtml = `
                            <div class="repeat-condition-line">
                                <span class="repeat-label">Repeat with each item in</span>
                                ${itemsInputHtml}
                            </div>
                        `;
                    } else if (repeatCount) {
                        const countInputHtml = editMode ? getInputForType(node.action.id, 'Count', repeatCount, false) : `<span class="repeat-value">${formatLinkedValue(repeatCount)}</span>`;
                        repeatHeaderHtml = `
                            <div class="repeat-condition-line">
                                <span class="repeat-label">Repeat</span>
                                ${countInputHtml}
                                <span class="repeat-text">times</span>
                            </div>
                        `;
                    } else {
                        const countInputHtml = editMode ? getInputForType(node.action.id, 'Count', '{{NUMBER}}', false) : '<span class="repeat-value">(configure)</span>';
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
                    const isPlaceholder = strVal.startsWith('{{') && strVal.endsWith('}}');
                    const displayValue = strVal;
                    // Show if edit mode OR (has value AND not a placeholder)
                    if (editMode || (displayValue && !isPlaceholder)) {
                        hasVisibleParams = true;
                        const inputHtml = getInputForType(action.id, key, value, !editMode);
                        innerHtml += `
                            <div class="node-param">
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

			            node.innerHTML = `
			                ${dragHandle}
			                <div class="node-icon">${getActionIcon(action.action)}</div>
			                <div class="node-content">
			                    <div class="node-header">
			                        <span class="node-title">${escapeHtml(getActionDisplayLabel(action) || (action.title || action.action))}</span>
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
            return String(name).replace(/^!id:/i, '').replace(/^!link:/i, '').trim() || 'Output';
        }

        function formatLinkedValue(value) {
            if (!value) return '';
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const outputUUID = value?.Value?.OutputUUID || value?.OutputUUID || '';
                const storedOutputName = value?.Value?.OutputName || value?.OutputName || null;
                const outputName = resolveOutputNameByUUID(outputUUID, storedOutputName) || storedOutputName || 'Linked Output';
                return `<span class="linked-value-inline">${escapeHtml(humanizeOutputName(outputName))}</span>`;
            }
            const strVal = String(value);
            const trimmedVal = strVal.trim();
            if (isIdToken(trimmedVal) || /^!link:[^\s]+$/i.test(trimmedVal)) {
                const linkLabel = normalizeIdLabel(trimmedVal);
                const resolvedName =
                    resolveOutputNameByUUID(trimmedVal, null) ||
                    resolveOutputNameByUUID(linkLabel, null) ||
                    linkLabel;
                return `<span class="linked-value-inline">${escapeHtml(humanizeOutputName(resolvedName))}</span>`;
            }
            // Check for variables like {{Ask Each Time}}, {{Clipboard}}, etc.
            const variableMatch = strVal.match(/^\{\{([^}]+)\}\}$/);
            if (variableMatch) {
                const varName = variableMatch[1].trim();
                return `<span class="linked-value-inline">${escapeHtml(varName)}</span>`;
            }
            // Check if value contains !ID: tokens mixed with text
            if (strVal.toLowerCase().includes('!id:') || strVal.toLowerCase().includes('!link:')) {
                // Parse mixed content
                const parts = strVal.split(/(!id:(?:\{\{[^}]+?\}\}|[^\s]+)|!link:[^\s]+)/gi);
                return parts.map(part => {
                    if (part.toLowerCase().startsWith('!id:') || part.toLowerCase().startsWith('!link:')) {
                        const linkLabel = normalizeIdLabel(part);
                        const resolvedName =
                            resolveOutputNameByUUID(part, null) ||
                            resolveOutputNameByUUID(linkLabel, null) ||
                            linkLabel;
                        return `<span class="linked-value-inline">${escapeHtml(humanizeOutputName(resolvedName))}</span>`;
                    }
                    // Also check for {{variable}} patterns in mixed content
                    const varMatch = part.match(/\{\{([^}]+)\}\}/g);
                    if (varMatch) {
                        let result = part;
                        varMatch.forEach(match => {
                            const varName = match.replace(/\{\{|\}\}/g, '').trim();
                            result = result.replace(match, `<span class="linked-value-inline">${escapeHtml(varName)}</span>`);
                        });
                        return result;
                    }
                    return escapeHtml(part);
                }).join('');
            }
            // Check for {{variable}} patterns in the string
            if (strVal.includes('{{') && strVal.includes('}}')) {
                return strVal.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
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

        let deleteTargetId = null;
        let deleteTargetType = null; // 'action' or 'project'

        function showDeleteModal(type, id) {
            deleteTargetType = type;
            deleteTargetId = id;

            const titleEl = document.querySelector('#delete-modal h3');
            const textEl = document.querySelector('#delete-modal p');

            if (type === 'project') {
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
            deleteTargetType = null;
        }

        function confirmDeleteAction() {
            if (!deleteTargetId) return;

            if (deleteTargetType === 'project') {
                projects = projects.filter(p => p.id !== deleteTargetId);
                saveProjects();
                if (currentProject && currentProject.id === deleteTargetId) {
                    currentProject = null;
                    currentActions = [];
                    showProjectsView();
                } else {
                    renderProjectsGrid();
                }
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
	                    (n.classList?.contains('action-node') || n.classList?.contains('if-block') || n.classList?.contains('repeat-block'))
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
                const rootNodes = Array.from(container.querySelectorAll('.action-node, .if-block, .repeat-block')).filter(n => !n.dataset.parentId && n.dataset.id);
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

	            const itemEl = e.target.closest('.action-node, .if-block, .repeat-block');
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
	            } catch (err) {}

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
	            } catch (err) {}

	            if (state.phase !== 'dragging' || !state.placeholderEl) {
	                return;
	            }

	            const placeholderEl = state.placeholderEl;
	            const listEl = placeholderEl.parentElement;
		            const zone =
		                placeholderEl.closest('.if-then.drop-zone, .if-else.drop-zone, .repeat-body.drop-zone') ||
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
	            } catch (err) {}

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

		            const nestedZone = el.closest('.if-then.drop-zone, .if-else.drop-zone, .repeat-body.drop-zone');
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
	                (el.classList.contains('action-node') || el.classList.contains('if-block') || el.classList.contains('repeat-block'))
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

	        function openForceActionModal() {
	            document.getElementById('plus-menu')?.classList.remove('active');
	            document.getElementById('plus-menu-btn')?.classList.remove('active');
	            const titleEl = document.getElementById('force-action-modal-title');
	            if (titleEl) titleEl.textContent = editMode ? 'Add Action' : 'Force Action';
	            document.getElementById('force-action-modal').classList.add('active');
	            renderActionsList();
	            const searchInput = document.getElementById('action-search');
	            searchInput.value = '';
            searchInput.focus();
            searchInput.oninput = () => renderActionsList(searchInput.value);
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
                item.innerHTML = `<div class="node-icon" style="width:32px;height:32px;">${getActionIcon(t.action)}</div><span>${escapeHtml(t.label || t.action)}</span>`;
                item.onclick = () => {
                    if (editMode) {
                        addActionDirectly(t);
                    } else {
                        addForcedAction(t);
                    }
                };
                list.appendChild(item);
            });
        }

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
            placementCursor.innerHTML = `
                <div class="placement-cursor-content">
                    <div class="node-icon">${getActionIcon(action.action)}</div>
                    <span>${escapeHtml(getActionDisplayLabel(action) || (action.title || action.action))}</span>
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
            let allZones = Array.from(container.querySelectorAll('.drop-zone, .action-node, .if-block, .repeat-block, #actions-container, .root-drop-zone'));
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
	                let allZones = Array.from(container.querySelectorAll('.drop-zone, .action-node, .if-block, .repeat-block, #actions-container'));
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
                            const sectionKey = dropZone === 'if-then' ? 'then' : dropZone === 'if-else' ? 'else' : 'do';
                            insertActionIntoZone(controlInfo.action, sectionKey, pendingAction, targetZone, e.clientY);
                            placed = true;
                        }
                    } else if (targetZone.classList.contains('action-node') || targetZone.classList.contains('if-block') || targetZone.classList.contains('repeat-block')) {
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
                const baseName = String(programObj?.name || currentProject?.name || 'My Shortcut').replace(/[^a-z0-9]/gi, '_') || 'My_Shortcut';

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
                statusText.textContent = '⚠️ ' + (err.message || 'Download failed');
                setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
            }
        }

        // ============ Resize Handle ============
        function initResizeHandle() {
            const chatPane = document.getElementById('chat-pane');
            const handle = document.getElementById('resize-handle');
            if (!chatPane || !handle) return;
            let isResizing = false;
            handle.addEventListener('mousedown', () => { isResizing = true; handle.classList.add('active'); document.body.style.cursor = 'col-resize'; });
            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                let newWidth = e.clientX;
                if (newWidth < 320) newWidth = 320;
                if (newWidth > 600) newWidth = 600;
                chatPane.style.width = `${newWidth}px`;
            });
            document.addEventListener('mouseup', () => { isResizing = false; handle.classList.remove('active'); document.body.style.cursor = ''; });
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
            { id: 'plan', label: 'Planning', hint: 'Analyzing your request...' },
            { id: 'catalog', label: 'Searching', hint: 'Finding matching actions...' },
            { id: 'build', label: 'Building', hint: 'Assembling your shortcut...' },
            { id: 'summarize', label: 'Finalizing', hint: 'Polishing results...' }
        ];

	        const MIN_PIPELINE_ACTIVE_MS = 350;
	        const pipelineStepStartedAt = new Map();
	        const pipelineStepCompleteTimers = new Map();
	        let currentPipelineStep = null;
	        let pipelinePendingStartTimer = null;

	        function clearPipelinePendingStart() {
	            if (pipelinePendingStartTimer) {
	                clearTimeout(pipelinePendingStartTimer);
	                pipelinePendingStartTimer = null;
	            }
	        }

	        function clearPipelineStepTimer(step) {
	            const t = pipelineStepCompleteTimers.get(step);
	            if (t) {
	                clearTimeout(t);
	                pipelineStepCompleteTimers.delete(step);
	            }
	        }

	        function showPipelineOrbs() {
	            const container = document.getElementById('messages');
	            const existing = document.getElementById('pipeline-orbs');
	            if (existing) existing.remove();

	            const orbsDiv = document.createElement('div');
	            orbsDiv.id = 'pipeline-orbs';
	            orbsDiv.className = 'pipeline-orbs';
	            orbsDiv.innerHTML = `
	                <div class="pipeline-orbs-row" role="group" aria-label="Generation progress">
	                    ${PIPELINE_STEPS.map((step, idx) => `
	                        <div class="orb" id="orb-${step.id}" data-orb-step="${step.id}">
	                            <span>${step.label}</span>
	                        </div>
	                        ${idx < PIPELINE_STEPS.length - 1 ? '<div class="orb-line" aria-hidden="true"></div>' : ''}
	                    `).join('')}
	                </div>
	                <div class="pipeline-orbs-hint" id="pipeline-orbs-hint">${escapeHtml(PIPELINE_STEPS[0]?.hint || 'Working...')}</div>
	            `;
	            container.appendChild(orbsDiv);
	            container.scrollTop = container.scrollHeight;
	            resetPipelineSteps();
	            updatePipelineProgress('assess', 'started', 'Analyzing your request...');
	        }

	        function updatePipelineOrb(step, status, hint = '') {
	            const orb = document.getElementById(`orb-${step}`);
	            if (!orb) return;
	            orb.classList.remove('active', 'completed');
	            if (status === 'started') orb.classList.add('active');
	            else if (status === 'completed') orb.classList.add('completed');

	            const hintEl = document.getElementById('pipeline-orbs-hint');
	            if (hintEl && (status === 'started' || hint)) {
	                const state = status === 'completed' ? 'completed' : status === 'started' ? 'active' : 'idle';
	                hintEl.textContent = hint || getDefaultHint(step, state);
	            }
	        }
        
        function getDefaultHint(step, state = 'idle') {
            const meta = PIPELINE_STEPS.find(s => s.id === step);
            if (state === 'completed') return 'Done';
            if (state === 'active') return meta?.hint || 'In progress...';
            return 'Waiting...';
        }

	        function removePipelineOrbs() {
	            clearPipelinePendingStart();
	            currentPipelineStep = null;
	            pipelineStepStartedAt?.clear?.();
	            if (pipelineStepCompleteTimers && typeof pipelineStepCompleteTimers.forEach === 'function') {
	                pipelineStepCompleteTimers.forEach((t) => { try { clearTimeout(t); } catch (e) { } });
	                pipelineStepCompleteTimers.clear();
	            }
	            document.getElementById('pipeline-orbs')?.remove();
	        }

        // ============ Forced Actions ============
        async function addForcedAction(template) {
            closeForceActionModal();
            if (forcedActions.find(a => a.action === template.action)) return; // Already forced
            forcedActions.push({ action: template.action, file: template.file });
            renderForcedActions();
            addMessageToUI(`🎯 Will use **${formatActionNameForUI(template.action)}** in next response`, 'assistant');
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
                    <button onclick="removeForcedAction(${escapeHtml(JSON.stringify(String(a.action)) )})">&times;</button>
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
            currentActions = ensureActionUUIDs(currentActions);
            rebuildOutputNameIndex();

            // Add linkable actions (outputs from previous actions in order)
            const currentActionId = parseInt(inputEl.dataset.actionId);
            const flatActions = flattenActions();
            const currentIndex = flatActions.findIndex(a => a.id === currentActionId);
            const previousActions = currentIndex > 0 ? flatActions.slice(0, currentIndex) : [];
	            const linkableActions = previousActions
	                .map(a => ({ action: a, output: getActionOutputInfo(a) }))
	                .filter(entry => entry.output && actionHasLinkableOutput(entry.action));
            if (linkableActions.length > 0) {
                menuHtml += '<div class="context-menu-divider"></div>';
                menuHtml += '<div class="context-menu-header">Link to Action</div>';
                linkableActions.forEach(({ action: a, output }) => {
                    const uuid = output.outputUUID;
                    const label = output.outputName || a.title || a.action || 'Action';
                    const safeLabel = escapeHtml(label).replace(/\"/g, '&quot;');
                    menuHtml += `<div class="context-menu-item" data-source-id="${a.id}" data-source-uuid="${uuid || ''}" data-source-label="${safeLabel}">🔗 ${escapeHtml(label)}</div>`;
                });
            } else {
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
        }

        function insertVariable(varName) {
            if (!contextMenuTarget) return;
            const varText = formatIdToken(varName);
            if (!varText) return;
            if (isRichInputElement(contextMenuTarget)) {
                insertTokenIntoRichInput(contextMenuTarget, varText);
                normalizeRichInputDisplay(contextMenuTarget);
            } else {
                const start = contextMenuTarget.selectionStart || contextMenuTarget.value.length;
                const end = contextMenuTarget.selectionEnd || contextMenuTarget.value.length;
                const text = contextMenuTarget.value;
                contextMenuTarget.value = text.slice(0, start) + varText + text.slice(end);
                contextMenuTarget.focus();
                contextMenuTarget.setSelectionRange(start + varText.length, start + varText.length);
                contextMenuTarget.dispatchEvent(new Event('change'));
            }
            document.getElementById('variable-context-menu')?.classList.remove('active');
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
        const tutorialSteps = [
            { target: '#chat-input', title: 'Chat Input', text: 'Describe the shortcut you want to build. The AI will create it for you!' },
            { target: '#plus-menu-btn', title: 'Quick Actions', text: 'Click here to access Force Action and Discussion Mode. Modes turn blue when active.' },
            { target: '#preview-canvas', title: 'Shortcut Preview', text: 'Your shortcut actions will appear here. Click Edit to drag and reorder them!' },
            { target: '#edit-btn', title: 'Edit Mode', text: 'Click Edit to modify, add, or remove actions. You can also right-click inputs to insert variables.' },
            { target: '#top-download-btn', title: 'Download', text: 'When you\'re done, download your shortcut to use in the Shortcuts app!' }
        ];

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

            if (tutorialStep >= tutorialSteps.length) {
                skipTutorial();
                return;
            }

            const step = tutorialSteps[tutorialStep];
            const targetEl = document.querySelector(step.target);

            overlay.classList.add('active');
            title.textContent = step.title;
            text.textContent = step.text;
            indicator.innerHTML = tutorialSteps.map((_, i) => `<span class="${i === tutorialStep ? 'active' : ''}"></span>`).join('');
            nextBtn.textContent = tutorialStep === tutorialSteps.length - 1 ? 'Done' : 'Next';

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
            const inWorkspace = !document.getElementById('workspace-view').classList.contains('hidden');
            if (downloadBtn) {
                downloadBtn.style.display = inWorkspace ? 'flex' : 'none';
            }
        }

        // Update showProjectsView and showWorkspaceView
        const originalShowProjectsView = showProjectsView;
        showProjectsView = function () {
            document.getElementById('projects-view').classList.remove('hidden');
            document.getElementById('workspace-view').classList.add('hidden');
            window.history.replaceState({}, '', 'app.html');
            renderProjectsGrid();
            updateViewButtons();
        };

        const originalShowWorkspaceView = showWorkspaceView;
        showWorkspaceView = function () {
            document.getElementById('projects-view').classList.add('hidden');
            document.getElementById('workspace-view').classList.remove('hidden');
            updateViewButtons();
        };

        // Initialize new features
        document.addEventListener('DOMContentLoaded', () => {
            initAnimations();
            initContextMenu();
            initRichInputHandlers();
            updateModeIndicators();
            renderForcedActions();
        });
