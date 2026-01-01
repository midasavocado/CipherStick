// Custom Alert System
const ShortcutStudioUI = {
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

    // Generic modal system
    showModal({ title, message, buttons = [] }) {
        const overlay = document.createElement('div');
        overlay.id = 'shortcutstudio-modal';
        overlay.className = 'shortcutstudio-modal-overlay active';

        const card = document.createElement('div');
        card.className = 'shortcutstudio-modal-card';

        const h3 = document.createElement('h3');
        h3.textContent = title;
        card.appendChild(h3);

        const p = document.createElement('p');
        p.textContent = message;
        card.appendChild(p);

        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex gap-2 justify-end';
        btnContainer.style.marginTop = '1.5rem';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `btn ${btn.primary ? 'btn-primary' : 'btn-secondary'}`;
            button.textContent = btn.label;
            button.onclick = btn.onClick || (() => this.closeModal());
            btnContainer.appendChild(button);
        });

        card.appendChild(btnContainer);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    },

    closeModal() {
        const modal = document.getElementById('shortcutstudio-modal');
        if (modal) modal.remove();
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShortcutStudioUI;
}
