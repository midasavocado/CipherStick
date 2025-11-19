const API_ENDPOINT = 'https://ai-shortcuts.midasavocado.workers.dev';

// --- Configuration ---
const MODELS = [
    {
        id: 'auto',
        name: 'Auto (Default)',
        desc: 'Smart selection based on complexity',
        tier: 'auto',
        cost: 0, // Calculated at runtime
        speed: 'Variable'
    },
    {
        id: 'meta-llama/llama-3-8b-instruct:free',
        name: 'Llama 3 8B',
        desc: 'Fast, efficient, and free.',
        tier: 'low',
        cost: 0,
        speed: 'Fast'
    },
    {
        id: 'google/gemini-flash-1.5',
        name: 'Gemini Flash 1.5',
        desc: 'High speed, large context.',
        tier: 'low',
        cost: 1,
        speed: 'Super Fast'
    },
    {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        desc: 'Reliable standard model.',
        tier: 'medium',
        cost: 2,
        speed: 'Fast'
    },
    {
        id: 'meta-llama/llama-3-70b-instruct',
        name: 'Llama 3 70B',
        desc: 'High intelligence open model.',
        tier: 'medium',
        cost: 3,
        speed: 'Medium'
    },
    {
        id: 'openai/gpt-4o',
        name: 'GPT-5.1 (Preview)', // User requested name
        desc: 'Next-gen reasoning and creativity.',
        tier: 'pro',
        cost: 10,
        speed: 'Slow'
    },
    {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3.5 Opus',
        desc: 'Maximum nuance and coding capability.',
        tier: 'pro',
        cost: 15,
        speed: 'Slow'
    },
    {
        id: 'x-ai/grok-1', // Placeholder ID, mapped to something real if needed or just passed
        name: 'Grok 4.1',
        desc: 'Unfiltered, witty, and powerful.',
        tier: 'pro',
        cost: 12,
        speed: 'Medium'
    },
    {
        id: 'x-ai/grok-code',
        name: 'Grok Code',
        desc: 'Specialized for complex logic.',
        tier: 'pro',
        cost: 12,
        speed: 'Medium'
    }
];

// --- State ---
let chatHistory = JSON.parse(localStorage.getItem('flux_chat_history')) || [];
let tokenBalance = parseInt(localStorage.getItem('flux_tokens')) || 500;
let selectedModelId = 'auto';

// --- DOM Elements ---
const messagesContainer = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const forceInput = document.getElementById('force-actions-input');
const sendBtn = document.getElementById('btn-send');
const downloadBtn = document.getElementById('btn-download');
const visualizerContent = document.getElementById('visualizer-content');
const tokenDisplay = document.getElementById('token-balance');
const modelTrigger = document.getElementById('model-trigger');
const modelOptions = document.getElementById('model-options');
const modelDropdown = document.getElementById('model-dropdown');

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    updateTokenUI();
    renderModelOptions();
    checkUrlParams();

    // Event Listeners
    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // Custom Dropdown Logic
    modelTrigger.addEventListener('click', () => {
        modelDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!modelDropdown.contains(e.target)) {
            modelDropdown.classList.remove('open');
        }
    });
});

function renderModelOptions() {
    modelOptions.innerHTML = '';

    const tiers = ['auto', 'low', 'medium', 'pro'];
    const tierLabels = { auto: 'Smart Select', low: 'Starter (Low Cost)', medium: 'Standard', pro: 'Pro (High Performance)' };

    tiers.forEach(tier => {
        const tierModels = MODELS.filter(m => m.tier === tier);
        if (tierModels.length === 0) return;

        const groupLabel = document.createElement('div');
        groupLabel.className = 'select-group-label';
        groupLabel.textContent = tierLabels[tier];
        modelOptions.appendChild(groupLabel);

        tierModels.forEach(model => {
            const option = document.createElement('div');
            option.className = 'select-option';
            if (model.id === selectedModelId) option.classList.add('selected');

            option.innerHTML = `
        <div class="option-main">
          <span class="option-name">${model.name}</span>
          <span class="option-cost">${model.cost > 0 ? model.cost + ' credits' : 'Free'}</span>
        </div>
        <div class="option-desc">${model.desc}</div>
      `;

            option.onclick = () => selectModel(model);
            modelOptions.appendChild(option);
        });
    });
}

function selectModel(model) {
    selectedModelId = model.id;

    // Update Trigger UI
    const triggerName = modelTrigger.querySelector('.model-name');
    const triggerDesc = modelTrigger.querySelector('.model-desc');
    triggerName.textContent = model.name;
    triggerDesc.textContent = model.desc;

    modelDropdown.classList.remove('open');
    renderModelOptions(); // Re-render to update selected state
}

function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get('prompt');
    if (prompt) {
        chatInput.value = prompt;
        window.history.replaceState({}, document.title, window.location.pathname);
        handleSend();
    }
}

function updateTokenUI() {
    tokenDisplay.textContent = tokenBalance;
    if (tokenBalance <= 0) {
        tokenDisplay.parentElement.style.borderColor = '#EF4444';
        tokenDisplay.parentElement.style.color = '#EF4444';
        sendBtn.disabled = true;
    } else {
        tokenDisplay.parentElement.style.borderColor = 'var(--border-color)';
        tokenDisplay.parentElement.style.color = 'var(--text-muted)';
        sendBtn.disabled = false;
    }
}

function loadHistory() {
    chatHistory.forEach(msg => addMessageToUI(msg.role, msg.content));
}

function addMessageToUI(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.textContent = content;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function determineAutoModel(prompt) {
    // Simple heuristic: Long prompts or "code" keywords -> Pro
    if (prompt.length > 200 || /script|code|complex|logic/.test(prompt.toLowerCase())) {
        return 'openai/gpt-4o'; // Map to "GPT-5.1"
    }
    return 'meta-llama/llama-3-70b-instruct'; // Default to Medium
}

async function handleSend() {
    const text = chatInput.value.trim();
    const constraints = forceInput ? forceInput.value.trim() : '';

    if (!text) return;

    // Determine actual model
    let actualModelId = selectedModelId;
    if (selectedModelId === 'auto') {
        actualModelId = determineAutoModel(text);
    }

    // Check Cost
    const modelConfig = MODELS.find(m => m.id === selectedModelId) || MODELS.find(m => m.id === actualModelId);
    const cost = modelConfig ? modelConfig.cost : 1;

    if (tokenBalance < cost) {
        alert(`Not enough credits! This model requires ${cost} credits.`);
        return;
    }

    // UI Updates
    addMessageToUI('user', text);
    chatInput.value = '';

    // Save to History
    chatHistory.push({ role: 'user', content: text });
    localStorage.setItem('flux_chat_history', JSON.stringify(chatHistory));

    // Decrement Token
    tokenBalance -= cost;
    localStorage.setItem('flux_tokens', tokenBalance);
    updateTokenUI();

    // Loading State
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant';
    loadingDiv.id = loadingId;
    loadingDiv.textContent = `Thinking with ${modelConfig.name}...`;
    messagesContainer.appendChild(loadingDiv);

    try {
        const response = await fetch(`${API_ENDPOINT}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: text,
                model: actualModelId,
                constraints: constraints,
                context: chatHistory.slice(-5)
            })
        });

        const data = await response.json();
        const loadingMsg = document.getElementById(loadingId);

        if (data.plist) {
            loadingMsg.textContent = `Generated "${data.name}"! Check the visualizer.`;
            chatHistory.push({ role: 'assistant', content: `Generated "${data.name}"!` });

            updateVisualizer(data.json);

            downloadBtn.disabled = false;
            downloadBtn.onclick = () => downloadPlist(data.plist, data.name);
        } else {
            loadingMsg.textContent = 'Error: ' + (data.error || 'Unknown error');
        }

        localStorage.setItem('flux_chat_history', JSON.stringify(chatHistory));

    } catch (e) {
        document.getElementById(loadingId).textContent = 'Network Error: ' + e.message;
    }
}

function updateVisualizer(program) {
    visualizerContent.innerHTML = '';

    if (!program || !program.actions) return;

    program.actions.forEach((action, index) => {
        const card = document.createElement('div');
        card.className = 'action-card';
        card.style.animationDelay = `${index * 0.05}s`;

        const type = action.type.split('.').pop();
        const name = type.charAt(0).toUpperCase() + type.slice(1);

        card.innerHTML = `
      <div class="action-icon-box">⚡️</div>
      <div class="action-details">
        <div class="action-name">${name}</div>
        <div class="action-desc">${JSON.stringify(action.parameters).slice(0, 60)}...</div>
      </div>
    `;

        card.onclick = () => {
            alert(`Action Details:\n${JSON.stringify(action, null, 2)}`);
        };

        visualizerContent.appendChild(card);
    });
}

function downloadPlist(plistContent, name) {
    const blob = new Blob([plistContent], { type: 'application/x-apple-aspen-xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.shortcut`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
