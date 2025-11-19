// Theme Configuration
// Single Theme: Vortex
const THEME_CLASS = 'theme-vortex';

// State
let currentMode = localStorage.getItem('app_mode') || 'dark';

// Init
document.addEventListener('DOMContentLoaded', () => {
    applyMode();
    setupScrollReveal();
    setupToggleButtons();
});

function applyMode() {
    const body = document.body;

    // Ensure base theme class is present
    if (!body.classList.contains(THEME_CLASS)) {
        body.classList.add(THEME_CLASS);
    }

    // Toggle Mode Classes
    if (currentMode === 'dark') {
        body.classList.remove('mode-light');
        body.classList.add('mode-dark');
    } else {
        body.classList.remove('mode-dark');
        body.classList.add('mode-light');
    }

    // Save
    localStorage.setItem('app_mode', currentMode);

    updateToggleIcons();
}

function toggleMode() {
    currentMode = currentMode === 'dark' ? 'light' : 'dark';
    applyMode();
}

function setupToggleButtons() {
    // Attach click handlers to any element with class .mode-toggle-btn
    const buttons = document.querySelectorAll('.mode-toggle-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', toggleMode);
    });
}

function updateToggleIcons() {
    const buttons = document.querySelectorAll('.mode-toggle-btn');
    buttons.forEach(btn => {
        // Sun for Light Mode (to switch to light), Moon for Dark Mode (to switch to dark)
        // Or icon representing CURRENT state? Usually icon represents what clicking will do.
        // Let's show the icon of the mode we are switching TO.
        // If dark -> show Sun. If light -> show Moon.
        btn.innerHTML = currentMode === 'dark' ?
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>' :
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

        btn.title = currentMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
}

function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .pricing-card, .market-card, .use-case-card, .testimonial-card').forEach(el => {
        el.classList.add('reveal-on-scroll');
        observer.observe(el);
    });
}
