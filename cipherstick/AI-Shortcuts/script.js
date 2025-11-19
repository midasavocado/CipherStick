// Configuration
const WORKER_ORIGIN = 'https://ai-shortcuts.midasavocado.workers.dev'; // Update if needed
const DEFAULT_SHORTCUT_NAME = 'My Shortcut';

// State
let state = {
    conversation: [],
    program: null,
    plistText: '',
    isBusy: false,
    lastName: DEFAULT_SHORTCUT_NAME
};

// DOM Elements
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const messagesContainer = document.getElementById('messages');
const visualizerContainer = document.getElementById('visualizer-content');
const btnDownload = document.getElementById('btn-download');

// --- Local Storage ---
function loadHistory() {
    const saved = localStorage.getItem('ai_shortcuts_history');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.conversation = parsed;
            renderHistory();
        } catch (e) {
            console.error('Failed to load history', e);
        }
    }
}

function saveHistory() {
    localStorage.setItem('ai_shortcuts_history', JSON.stringify(state.conversation));
}

function renderHistory() {
    messagesContainer.innerHTML = '';
    state.conversation.forEach(msg => {
        appendMessageToDOM(msg.role, msg.content);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// --- UI Helpers ---

function appendMessageToDOM(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.textContent = text;
    messagesContainer.appendChild(msgDiv);
}

function pushMessage(role, text) {
    appendMessageToDOM(role, text);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    state.conversation.push({ role, content: text });
    saveHistory();
}

function showToast(msg, isError = false) {
    console.log(`[${isError ? 'ERROR' : 'INFO'}] ${msg}`);
    if (isError) alert(msg);
}

function updateVisualizer(program) {
    if (!visualizerContainer) return;
    visualizerContainer.innerHTML = '';

    if (!program || !program.actions) {
        visualizerContainer.innerHTML = `
      <div style="text-align: center; margin-top: 4rem; color: #666;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🪄</div>
        <p>Tell the AI what to build,<br>and watch the magic happen here.</p>
      </div>`;
        return;
    }

    // Simulate "streaming" effect for visualizer
    program.actions.forEach((action, index) => {
        setTimeout(() => {
            const card = document.createElement('div');
            card.className = 'action-card';

            const iconBox = document.createElement('div');
            iconBox.className = 'action-icon-box';
            // Simple icon logic based on action type
            let icon = '⚡️';
            if (action.id.includes('conditional')) icon = '🔀';
            else if (action.id.includes('text')) icon = '📝';
            else if (action.id.includes('repeat')) icon = '🔁';
            else if (action.id.includes('comment')) icon = '💬';
            else if (action.id.includes('variable')) icon = '📦';

            iconBox.textContent = icon;

            const details = document.createElement('div');
            details.className = 'action-details';

            const name = document.createElement('div');
            name.className = 'action-name';
            name.textContent = action.name || action.id.split('.').pop();

            const desc = document.createElement('div');
            desc.className = 'action-desc';
            desc.textContent = action.id; // Or a better description if available

            details.appendChild(name);
            details.appendChild(desc);

            card.appendChild(iconBox);
            card.appendChild(details);

            visualizerContainer.appendChild(card);

            // Auto scroll to bottom of visualizer
            visualizerContainer.scrollTop = visualizerContainer.scrollHeight;
        }, index * 150); // Stagger animations
    });
}

// --- API Interactions ---

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text || state.isBusy) return;

    pushMessage('user', text);
    chatInput.value = '';
    state.isBusy = true;
    btnSend.disabled = true;
    btnSend.innerHTML = '<div style="width: 20px; height: 20px; border: 2px solid #0b0c10; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>';

    // Add spin animation style if not present
    if (!document.getElementById('spin-style')) {
        const style = document.createElement('style');
        style.id = 'spin-style';
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    try {
        const response = await fetch(`${WORKER_ORIGIN}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: text,
                history: state.conversation.slice(0, -1)
            })
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalData = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const packet = JSON.parse(line);
                    if (packet.type === 'final') {
                        finalData = packet;
                    } else if (packet.type === 'error') {
                        throw new Error(packet.message);
                    }
                } catch (e) {
                    console.warn('Error parsing stream packet', e);
                }
            }
        }

        if (finalData) {
            state.program = finalData.program;
            state.lastName = finalData.finalName || state.lastName;
            pushMessage('assistant', finalData.answer || 'Shortcut generated!');
            updateVisualizer(state.program);
            if (btnDownload) btnDownload.disabled = false;
        } else {
            pushMessage('assistant', 'Something went wrong. No final data received.');
        }

    } catch (err) {
        console.error(err);
        pushMessage('assistant', `Error: ${err.message}`);
    } finally {
        state.isBusy = false;
        btnSend.disabled = false;
        btnSend.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>`;
    }
}

async function handleDownload() {
    if (!state.program) return;

    const btnText = btnDownload.textContent;
    btnDownload.textContent = 'Signing...';
    btnDownload.disabled = true;

    try {
        const convertResp = await fetch(`${WORKER_ORIGIN}/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ program: state.program, name: state.lastName })
        });

        if (!convertResp.ok) throw new Error('Conversion failed');
        const convertData = await convertResp.json();
        const plist = convertData.plist;

        const file = new File([plist], `${state.lastName}.plist`, { type: 'application/xml' });
        const form = new FormData();
        form.append('file', file);

        const signResp = await fetch(`${WORKER_ORIGIN}/sign`, { method: 'POST', body: form });
        if (!signResp.ok) throw new Error('Signing failed');

        const blob = await signResp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.lastName}.shortcut`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showToast('Download started!');

    } catch (err) {
        console.error(err);
        showToast('Download failed: ' + err.message, true);
    } finally {
        btnDownload.textContent = btnText;
        btnDownload.disabled = false;
    }
}

// --- Event Listeners ---

if (btnSend) {
    btnSend.addEventListener('click', handleSend);
}

if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
}

if (btnDownload) {
    btnDownload.addEventListener('click', handleDownload);
}

// Initialize
loadHistory();
if (messagesContainer && state.conversation.length === 0) {
    pushMessage('assistant', 'Hello! Describe the shortcut you want to create.');
}
