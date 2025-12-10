
        // ============ Configuration ============
        const API_BASE = 'https://secrets.mwsaulsbury.workers.dev';
        const IS_PRO_USER = false; // Set to true for pro users

        // ============ State ============
        let currentProject = null;
        let projects = JSON.parse(localStorage.getItem('flux_projects')) || [];
        let chatMode = 'standard'; // 'standard', 'discussion', 'thinking'
        let availableTemplates = [];
        let currentActions = [];
        let currentProgramObj = null;
        let isGenerating = false;
        let editMode = false;
        let forcedActions = [];
        let animationsEnabled = localStorage.getItem('flux_animations') !== 'disabled';
        let contextMenuTarget = null;
        let tutorialStep = 0;
        let hasCompletedTutorial = localStorage.getItem('flux_tutorial_done') === 'true';

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
                if (currentProject && this.value.trim()) {
                    currentProject.name = this.value.trim();
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
        }

        function initTheme() {
            if (!localStorage.getItem('flux_theme')) {
                document.body.classList.add('mode-dark');
                localStorage.setItem('flux_theme', 'dark');
            } else {
                const theme = localStorage.getItem('flux_theme');
                document.body.classList.toggle('mode-dark', theme === 'dark');
            }
            updateThemeIcon();
        }

        function toggleTheme() {
            document.body.classList.toggle('mode-dark');
            localStorage.setItem('flux_theme', document.body.classList.contains('mode-dark') ? 'dark' : 'light');
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
            currentActions = currentProject.actions || [];
            currentProgramObj = currentProject.programObj || null;
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
        }

        function saveProjects() {
            localStorage.setItem('flux_projects', JSON.stringify(projects));
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
                : 'F';
            div.innerHTML = `<div class="message-avatar">${avatar}</div><div class="message-bubble">${formatMessage(text)}</div>`;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function formatMessage(text) {
            return escapeHtml(text)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
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
            div.innerHTML = `<div class="message-avatar">F</div><div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
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
        async function callGenerateAPI(userPrompt) {
            isGenerating = true;
            showPipelineOrbs();
            showTypingIndicator();

            try {
                const plan = (localStorage.getItem('flux_plan') || 'free') === 'paid' ? 'paid' : 'free';
                const model = plan === 'paid' ? 'grok-4.1-fast' : 'openai/gpt-oss-120b:free';
                console.log(`[Flux] Using model: ${model} (plan: ${plan})`);

                const isFollowUp = currentProject.history.filter(m => m.role === 'user').length > 1;
                const body = {
                    name: currentProject.name,
                    prompt: userPrompt,
                    basePrompt: isFollowUp ? currentProject.history[0]?.content : userPrompt,
                    followPrompt: isFollowUp ? userPrompt : undefined,
                    history: currentProject.history.slice(-10),
                    mode: chatMode === 'thinking' ? 'think' : 'plan',
                    model,
                    plan,
                    style: 'concise'
                };
                if (currentProgramObj) {
                    body.programPreview = JSON.stringify(currentProgramObj);
                }

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
                updatePipelineProgress(packet.step, packet.status);
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
            ['plan', 'catalog', 'build', 'summarize'].forEach(s => {
                const el = document.getElementById(`step-${s}`);
                if (el) el.classList.remove('active', 'completed');
                const orb = document.getElementById(`orb-${s}`);
                orb?.classList.remove('active', 'completed');
            });
        }

        function updatePipelineProgress(step, status) {
            const order = ['plan', 'catalog', 'build', 'summarize'];
            const idx = order.indexOf(step);
            if (idx > 0 && status === 'started') {
                for (let i = 0; i < idx; i++) {
                    updatePipelineOrb(order[i], 'completed');
                }
            }
            updatePipelineOrb(step, status);
        }

        function handleFinalResponse(data) {
            if (!data.ok) {
                addMessageToUI(`⚠️ ${data.message || 'An error occurred'}`, 'assistant');
                return;
            }
            ['plan', 'catalog', 'build', 'summarize'].forEach(s => updatePipelineOrb(s, 'completed'));

            // Update project name from AI
            if (data.finalName && currentProject) {
                currentProject.name = data.finalName;
                document.getElementById('project-name-input').value = data.finalName;
            }

            // Store program object
            if (data.program) {
                currentProgramObj = data.program;
                if (currentProject) currentProject.programObj = currentProgramObj;

                // Extract actions from program
                if (Array.isArray(data.program.actions)) {
                    currentActions = data.program.actions.map((act, i) => ({
                        id: Date.now() + i,
                        action: act.action || 'Unknown',
                        title: act.action || 'Action',
                        params: act.params || {}
                    }));
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
            // Animate all actions from AI response
            renderActions(true);
        }

        // ============ Actions Preview ============
        function renderActions(animateIds = null) {
            const container = document.getElementById('actions-container');
            const emptyState = document.getElementById('empty-state');

            if (currentActions.length === 0) {
                container.classList.add('hidden');
                emptyState.classList.remove('hidden');
                return;
            }

            emptyState.classList.add('hidden');
            container.classList.remove('hidden');
            container.innerHTML = '';

            currentActions.forEach((action, index) => {
                let shouldAnimate = false;
                if (animateIds === true) shouldAnimate = true;
                else if (Array.isArray(animateIds) && animateIds.includes(action.id)) shouldAnimate = true;

                const node = createActionNode(action, index, shouldAnimate);
                container.appendChild(node);
                if (index < currentActions.length - 1) {
                    const line = document.createElement('div');
                    line.className = 'connection-line';
                    container.appendChild(line);
                }
            });
            initDragAndDrop();
        }

        function createActionNode(action, index, shouldAnimate = false) {
            const node = document.createElement('div');
            node.className = 'action-node';
            if (shouldAnimate && animationsEnabled) {
                node.classList.add('settling');
                node.style.animationDelay = `${index * 0.1}s`;
            }
            node.draggable = editMode;
            node.dataset.id = action.id;
            node.dataset.index = index;
            node.dataset.type = action.action;

            let paramsHtml = '';
            // Show params if in edit mode OR if they have a value (not empty/default)
            if (action.params && Object.keys(action.params).length > 0) {
                let hasVisibleParams = false;
                let innerHtml = '<div class="node-params">';
                for (const [key, value] of Object.entries(action.params)) {
                    // In view mode, only show if value is present and not a placeholder
                    const strVal = String(value);
                    const isPlaceholder = strVal.startsWith('{{') && strVal.endsWith('}}');
                    if (editMode || (strVal && !isPlaceholder)) {
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
                <div class="node-actions">
                    <button class="node-action-btn" onclick="duplicateAction(${action.id})" title="Duplicate"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                    <button class="node-action-btn delete" onclick="deleteAction(${action.id})" title="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            ` : '';

            let controlScaffold = '';
            const lowerAction = (action.action || '').toLowerCase();
            if (lowerAction.includes('if')) {
                controlScaffold = `
                    <div class="control-block">
                        <div class="control-label">IF</div>
                        <div class="control-body">Then actions follow below.</div>
                        <div class="control-divider">ELSE</div>
                        <div class="control-body">Else actions follow below.</div>
                        <div class="control-end">END IF</div>
                    </div>
                `;
            } else if (lowerAction.includes('repeat')) {
                controlScaffold = `
                    <div class="control-block">
                        <div class="control-label">REPEAT</div>
                        <div class="control-body">Loop actions follow below.</div>
                        <div class="control-end">END REPEAT</div>
                    </div>
                `;
            }

            const dragHandle = editMode ? '<div class="node-drag-handle"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2"></circle><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="9" cy="18" r="2"></circle><circle cx="15" cy="18" r="2"></circle></svg></div>' : '';

            node.innerHTML = `
                ${dragHandle}
                <div class="node-icon">${getActionIcon(action.action)}</div>
                <div class="node-content">
                    <div class="node-header">
                        <span class="node-title">${escapeHtml(action.title || action.action)}</span>
                        ${actionsHtml}
                    </div>
                    ${paramsHtml}
                    ${controlScaffold}
                </div>
            `;
            return node;
        }

        function getInputForType(actionId, key, value, readonly = false) {
            const isObjectVal = value && typeof value === 'object' && !Array.isArray(value);
            if (isObjectVal) {
                const label = value?.Value?.OutputName || 'Linked Output';
                const safeParam = escapeHtml(key).replace(/'/g, "\\'");
                return `<div class="linked-output">${escapeHtml(label)} <button type="button" class="node-action-btn" onclick="clearLinkedParam(${actionId}, '${safeParam}')">Unlink</button></div>`;
            }

            const strValue = String(value);
            const lowerVal = strValue.toLowerCase();
            const disabledAttr = readonly ? 'disabled' : '';

            // Boolean detection
            if (lowerVal === 'true' || lowerVal === 'false' || strValue === '{{BOOLEAN}}') {
                const checked = lowerVal === 'true' ? 'checked' : '';
                return `<input type="checkbox" class="param-checkbox" data-action-id="${actionId}" data-param="${escapeHtml(key)}" ${checked} ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.checked)">`;
            }

            // Number detection
            if (!isNaN(strValue) && strValue !== '') {
                return `<input type="number" class="param-value param-number" data-action-id="${actionId}" data-param="${escapeHtml(key)}" value="${escapeHtml(strValue)}" ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)">`;
            }

            // Dropdown for options like {{option1/option2/option3}}
            const optionsMatch = strValue.match(/^\{\{([^}]+\/[^}]+)\}\}$/);
            if (optionsMatch) {
                const options = optionsMatch[1].split('/');
                const optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
                return `<select class="param-value param-select" data-action-id="${actionId}" data-param="${escapeHtml(key)}" ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)">${optionsHtml}</select>`;
            }

            // Default text input
            const contextMenuAttr = readonly ? '' : 'oncontextmenu="showVariableMenu(event, this)"';
            return `<input type="text" class="param-value" data-action-id="${actionId}" data-param="${escapeHtml(key)}" value="${escapeHtml(strValue)}" ${disabledAttr} onchange="updateActionParam(${actionId}, '${escapeHtml(key)}', this.value)" ${contextMenuAttr}>`;
        }

        function formatParamValue(value) {
            if (typeof value === 'string') {
                // Highlight variables like {{input}} or {{Clipboard}}
                return value.replace(/\{\{([^}]+)\}\}/g, '<span class="variable-tag">$1</span>');
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

        function updateActionParam(actionId, paramKey, value) {
            const action = currentActions.find(a => a.id === actionId);
            if (action) {
                action.params[paramKey] = value;
                if (currentProject) {
                    currentProject.actions = currentActions;
                    saveProjects();
                }
            }
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
                currentActions = currentActions.filter(a => a.id !== deleteTargetId);
                if (currentProject) {
                    currentProject.actions = currentActions;
                    saveProjects();
                }
                renderActions();
            }
            closeDeleteModal();
        }

        function deleteAction(actionId) {
            showDeleteModal('action', actionId);
        }

        function duplicateAction(actionId) {
            const action = currentActions.find(a => a.id === actionId);
            if (action) {
                const newAction = { ...action, id: Date.now(), params: { ...action.params } };
                const index = currentActions.findIndex(a => a.id === actionId);
                currentActions.splice(index + 1, 0, newAction);
                if (currentProject) {
                    currentProject.actions = currentActions;
                    saveProjects();
                }
                renderActions([newAction.id]);
            }
        }

        // ============ Drag and Drop ============
        function initDragAndDrop() {
            const container = document.getElementById('actions-container');
            const nodes = container.querySelectorAll('.action-node');
            let draggedEl = null;

            nodes.forEach(node => {
                node.addEventListener('dragstart', (e) => {
                    draggedEl = node;
                    node.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });
                node.addEventListener('dragend', () => {
                    if (draggedEl) { draggedEl.classList.remove('dragging'); draggedEl = null; }
                });
                node.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (!draggedEl || draggedEl === node) return;
                    const rect = node.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) container.insertBefore(draggedEl, node);
                    else container.insertBefore(draggedEl, node.nextSibling);
                });
                node.addEventListener('drop', (e) => { e.preventDefault(); updateActionsOrder(); });
            });
        }

        function updateActionsOrder() {
            const container = document.getElementById('actions-container');
            const nodes = container.querySelectorAll('.action-node');
            const newOrder = [];
            nodes.forEach(node => {
                const id = parseInt(node.dataset.id);
                const action = currentActions.find(a => a.id === id);
                if (action) newOrder.push(action);
            });
            currentActions = newOrder;
            if (currentProject) { currentProject.actions = currentActions; saveProjects(); }
            renderActions();
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
            if (mode === 'thinking') input.placeholder = '🧠 Thinking mode active...';
            else if (mode === 'discussion') input.placeholder = '💬 Discussion mode...';
            else input.placeholder = 'Describe your shortcut...';
        }

        // ============ Force Action Modal ============
        async function loadTemplates() {
            try {
                const response = await fetch('Templates/index.json');
                const files = await response.json();
                availableTemplates = files.map(f => typeof f === 'string' ? { file: f, action: f.replace('.json', '') } : { file: f.file, action: f.file.replace('.json', '') });
            } catch (e) { console.error('Failed to load templates:', e); }
        }

        function openForceActionModal() {
            document.getElementById('plus-menu')?.classList.remove('active');
            document.getElementById('plus-menu-btn')?.classList.remove('active');
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
            const term = filter.toLowerCase();
            const filtered = availableTemplates.filter(t => t.action.toLowerCase().includes(term));
            filtered.forEach(t => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.style.cssText = 'padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer;';
                item.innerHTML = `<div class="node-icon" style="width:32px;height:32px;">${getActionIcon(t.action)}</div><span>${escapeHtml(t.action)}</span>`;
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
                currentActions.push(newAction);
                if (currentProject) { currentProject.actions = currentActions; saveProjects(); }
                renderActions([newAction.id]);
            } catch (e) { console.error('Failed to load action template:', e); }
        }

        // ============ Download ============
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
                // Build program object
                const programObj = {
                    name: currentProject?.name || 'My Shortcut',
                    actions: currentActions.map(a => ({ action: a.action, params: a.params }))
                };

                // Convert to plist
                statusText.textContent = 'Generating plist...';
                const convertRes = await fetch(`${API_BASE}/convert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(programObj)
                });
                const convertData = await convertRes.json();
                if (!convertData.ok) throw new Error(convertData.message || 'Conversion failed');

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

                // Download
                statusText.textContent = 'Downloading...';
                const blob = await signRes.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${programObj.name.replace(/[^a-z0-9]/gi, '_')}.shortcut`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

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
            renderActions();
        }

        // ============ Pipeline Orbs (in chat) ============
        function showPipelineOrbs() {
            const container = document.getElementById('messages');
            const existing = document.getElementById('pipeline-orbs');
            if (existing) existing.remove();

            const orbsDiv = document.createElement('div');
            orbsDiv.id = 'pipeline-orbs';
            orbsDiv.className = 'pipeline-orbs';
            orbsDiv.innerHTML = `
                <div class="orb" id="orb-plan"><span>Planning</span></div>
                <div class="orb-line"></div>
                <div class="orb" id="orb-catalog"><span>Searching</span></div>
                <div class="orb-line"></div>
                <div class="orb" id="orb-build"><span>Building</span></div>
                <div class="orb-line"></div>
                <div class="orb" id="orb-summarize"><span>Finalizing</span></div>
            `;
            container.appendChild(orbsDiv);
            container.scrollTop = container.scrollHeight;
            resetPipelineSteps();
            updatePipelineOrb('plan', 'started');
        }

        function updatePipelineOrb(step, status) {
            const orb = document.getElementById(`orb-${step}`);
            if (!orb) return;
            orb.classList.remove('active', 'completed');
            if (status === 'started') orb.classList.add('active');
            else if (status === 'completed') orb.classList.add('completed');
        }

        function removePipelineOrbs() {
            document.getElementById('pipeline-orbs')?.remove();
        }

        // ============ Forced Actions ============
        function addForcedAction(template) {
            closeForceActionModal();
            if (forcedActions.find(a => a.action === template.action)) return; // Already forced
            // Immediately add the action to the workflow
            try {
                const response = await fetch(`Templates/${template.file}`);
                const data = await response.json();
                const newAction = {
                    id: Date.now(),
                    action: data.action || template.action,
                    title: data.action || template.action,
                    params: data.params || {}
                };
                currentActions.push(newAction);
                if (currentProject) {
                    currentProject.actions = currentActions;
                    saveProjects();
                }
                renderActions([newAction.id]);
                addMessageToUI(`🎯 Added action: ${newAction.title}`, 'assistant');
            } catch (e) {
                console.error('Force action failed:', e);
                alert('Could not add that action. Please try again.');
            }
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
                    <span>${escapeHtml(a.action)}</span>
                    <button onclick="removeForcedAction('${escapeHtml(a.action)}')">&times;</button>
                </div>
            `).join('');
        }

        // ============ Mode Toggle (in plus menu) ============
        function toggleMode(mode) {
            if (mode === 'thinking' && (localStorage.getItem('flux_plan') || 'free') !== 'paid') {
                alert('Thinking mode is a Pro feature.');
                return;
            }
            if (chatMode === mode) {
                chatMode = 'standard';
            } else {
                chatMode = mode;
            }
            updateModeIndicators();
            // Don't close menu - let user see the state change
        }

        function updateModeIndicators() {
            const discussionToggle = document.getElementById('discussion-mode-toggle');
            const thinkingToggle = document.getElementById('thinking-mode-toggle');

            discussionToggle?.classList.toggle('active', chatMode === 'discussion');
            thinkingToggle?.classList.toggle('active', chatMode === 'thinking');
        }

        // ============ Animations Toggle ============
        function toggleAnimations() {
            animationsEnabled = !animationsEnabled;
            localStorage.setItem('flux_animations', animationsEnabled ? 'enabled' : 'disabled');
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
            const menu = document.getElementById('variable-context-menu');

            // Build dynamic menu with linkable actions
            let menuHtml = '<div class="context-menu-header">Insert Variable</div>';
            menuHtml += '<div class="context-menu-item" onclick="insertVariable(\'Shortcut Input\')">📥 Shortcut Input</div>';
            menuHtml += '<div class="context-menu-item" onclick="insertVariable(\'Clipboard\')">📋 Clipboard</div>';
            menuHtml += '<div class="context-menu-item" onclick="insertVariable(\'Current Date\')">📅 Current Date</div>';
            menuHtml += '<div class="context-menu-item" onclick="insertVariable(\'Device Name\')">📱 Device Name</div>';
            menuHtml += '<div class="context-menu-item" onclick="insertVariable(\'Ask Each Time\')">❓ Ask Each Time</div>';

            // Add linkable actions (outputs from previous actions in order)
            const currentActionId = parseInt(inputEl.dataset.actionId);
            const currentIndex = currentActions.findIndex(a => a.id === currentActionId);
            const previousActions = currentIndex > 0 ? currentActions.slice(0, currentIndex) : [];
            if (previousActions.length > 0) {
                menuHtml += '<div class="context-menu-divider"></div>';
                menuHtml += '<div class="context-menu-header">Link to Action</div>';
                previousActions.forEach(a => {
                    const uuid = a.params?.UUID || a.params?.Uuid || a.params?.uuid || a.params?.ProvidedOutputUUID;
                    const label = a.title || a.action || 'Action';
                    const safeLabel = escapeHtml(label).replace(/\"/g, '&quot;');
                    menuHtml += `<div class="context-menu-item" data-source-id="${a.id}" data-source-uuid="${uuid || ''}" data-source-label="${safeLabel}">🔗 ${escapeHtml(label)}</div>`;
                });
            }

            menu.innerHTML = menuHtml;

            // Position menu - ensure it doesn't go off screen
            let x = event.pageX;
            let y = event.pageY;
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.classList.add('active');

            // Wire link clicks
            const linkItems = menu.querySelectorAll('[data-source-id]');
            linkItems.forEach(item => {
                item.addEventListener('click', () => {
                    const sourceId = parseInt(item.getAttribute('data-source-id'));
                    linkActionParam(currentActionId, inputEl.dataset.param, sourceId, item.getAttribute('data-source-uuid'), item.getAttribute('data-source-label'));
                });
            });

            // Adjust if going off bottom
            setTimeout(() => {
                const rect = menu.getBoundingClientRect();
                if (rect.bottom > window.innerHeight) {
                    menu.style.top = (y - rect.height) + 'px';
                }
                if (rect.right > window.innerWidth) {
                    menu.style.left = (x - rect.width) + 'px';
                }
            }, 0);
        }

        function initContextMenu() {
            document.addEventListener('click', () => {
                document.getElementById('variable-context-menu')?.classList.remove('active');
            });
        }

        function insertVariable(varName) {
            if (!contextMenuTarget) return;
            const start = contextMenuTarget.selectionStart || contextMenuTarget.value.length;
            const end = contextMenuTarget.selectionEnd || contextMenuTarget.value.length;
            const text = contextMenuTarget.value;
            const varText = `{{${varName}}}`;
            contextMenuTarget.value = text.slice(0, start) + varText + text.slice(end);
            contextMenuTarget.focus();
            contextMenuTarget.setSelectionRange(start + varText.length, start + varText.length);
            contextMenuTarget.dispatchEvent(new Event('change'));
            document.getElementById('variable-context-menu')?.classList.remove('active');
        }

        function linkActionParam(targetId, paramKey, sourceId, sourceUuid, sourceLabel) {
            const target = currentActions.find(a => a.id === targetId);
            const source = currentActions.find(a => a.id === sourceId);
            if (!target || !source) return;

            const outputUUID = (sourceUuid && String(sourceUuid)) || String(source.id);
            const outputName = sourceLabel || source.title || source.action || 'Previous Output';
            target.params[paramKey] = {
                Value: {
                    OutputName: outputName,
                    OutputUUID: outputUUID,
                    Type: 'ActionOutput'
                },
                WFSerializationType: 'WFTextTokenAttachment'
            };
            if (currentProject) {
                currentProject.actions = currentActions;
                saveProjects();
            }
            renderActions([targetId]);
        }

        function clearLinkedParam(actionId, paramKey) {
            const action = currentActions.find(a => a.id === actionId);
            if (!action) return;
            delete action.params[paramKey];
            if (currentProject) {
                currentProject.actions = currentActions;
                saveProjects();
            }
            renderActions([actionId]);
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
            { target: '#plus-menu-btn', title: 'Quick Actions', text: 'Click here to access Force Action, Discussion Mode, and Thinking Mode. Modes turn blue when active.' },
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
            localStorage.setItem('flux_tutorial_done', 'true');
            hasCompletedTutorial = true;
        }

        function checkFirstTimeTutorial() {
            if (!hasCompletedTutorial && currentProject) {
                // Check if this is their first ever project
                const allProjects = JSON.parse(localStorage.getItem('flux_projects')) || [];
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
            updateModeIndicators();
            renderForcedActions();
        });
    