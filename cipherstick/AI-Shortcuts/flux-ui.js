// Custom Alert System
const FluxUI = {
    // Show custom alert
    alert(message, title = 'Alert') {
        this.showModal({
            title,
            message,
            buttons: [{ label: 'OK', primary: true, onClick: () => this.closeModal() }]
        });
    },

    // Show custom confirm
    confirm(message, title = 'Confirm', onConfirm, onCancel) {
        this.showModal({
            title,
            message,
            buttons: [
                { label: 'Cancel', onClick: () => { this.closeModal(); if (onCancel) onCancel(); } },
                { label: 'Confirm', primary: true, onClick: () => { this.closeModal(); if (onConfirm) onConfirm(); } }
            ]
        });
    },

    // Show custom prompt
    prompt(message, title = 'Input', defaultValue = '', onSubmit) {
        const modalHtml = `
            <div id="flux-modal" class="flux-modal-overlay active">
                <div class="flux-modal-card">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <input type="text" id="flux-prompt-input" class="input-glass" value="${defaultValue}" style="margin: 1rem 0; width: 100%;">
                    <div class="flex gap-2 justify-end" style="margin-top: 1.5rem;">
                        <button class="btn btn-secondary" onclick="FluxUI.closeModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="FluxUI.submitPrompt()">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this._promptCallback = onSubmit;
        document.getElementById('flux-prompt-input').focus();
    },

    submitPrompt() {
        const value = document.getElementById('flux-prompt-input').value;
        this.closeModal();
        if (this._promptCallback) this._promptCallback(value);
    },

    // Generic modal system
    showModal({ title, message, buttons = [] }) {
        const buttonsHtml = buttons.map(btn =>
            `<button class="btn ${btn.primary ? 'btn-primary' : 'btn-secondary'}" 
                     onclick="${btn.onClick ? `(${btn.onClick.toString()})()` : 'FluxUI.closeModal()'}">${btn.label}</button>`
        ).join('');

        const modalHtml = `
            <div id="flux-modal" class="flux-modal-overlay active">
                <div class="flux-modal-card">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="flex gap-2 justify-end" style="margin-top: 1.5rem;">
                        ${buttonsHtml}
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    closeModal() {
        const modal = document.getElementById('flux-modal');
        if (modal) modal.remove();
    },

    // Tutorial System
    tutorial: {
        steps: [],
        currentStep: 0,

        start(steps) {
            this.steps = steps;
            this.currentStep = 0;
            this.showStep();
        },

        showStep() {
            if (this.currentStep >= this.steps.length) {
                this.end();
                return;
            }

            const step = this.steps[this.currentStep];
            const target = document.querySelector(step.target);
            if (!target) {
                this.next();
                return;
            }

            // Remove existing tutorial
            const existing = document.getElementById('flux-tutorial');
            if (existing) existing.remove();

            // Get target position
            const rect = target.getBoundingClientRect();

            // Create tutorial box
            const tutorialHtml = `
                <div id="flux-tutorial" class="flux-tutorial">
                    <div class="flux-tutorial-overlay"></div>
                    <div class="flux-tutorial-highlight" style="
                        top: ${rect.top - 8}px;
                        left: ${rect.left - 8}px;
                        width: ${rect.width + 16}px;
                        height: ${rect.height + 16}px;
                    "></div>
                    <div class="flux-tutorial-box" style="
                        top: ${rect.bottom + 16}px;
                        left: ${Math.max(20, Math.min(window.innerWidth - 320, rect.left))}px;
                    ">
                        <h4>${step.title}</h4>
                        <p>${step.message}</p>
                        <div class="flex justify-between items-center" style="margin-top: 1rem;">
                            <span style="font-size: 0.85rem; color: var(--text-muted);">${this.currentStep + 1} / ${this.steps.length}</span>
                            <div class="flex gap-2">
                                ${this.currentStep > 0 ? '<button class="btn btn-secondary btn-sm" onclick="FluxUI.tutorial.prev()">Back</button>' : ''}
                                <button class="btn btn-primary btn-sm" onclick="FluxUI.tutorial.next()">${this.currentStep < this.steps.length - 1 ? 'Next' : 'Finish'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', tutorialHtml);
        },

        next() {
            this.currentStep++;
            this.showStep();
        },

        prev() {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.showStep();
            }
        },

        end() {
            const tutorial = document.getElementById('flux-tutorial');
            if (tutorial) tutorial.remove();
            localStorage.setItem('flux_tutorial_complete', 'true');
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FluxUI;
}
