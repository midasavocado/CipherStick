// Landing page functionality
document.addEventListener('DOMContentLoaded', () => {
    // Hero Input handling
    const heroInput = document.getElementById('hero-input');
    const heroBtn = document.getElementById('hero-generate-btn');

    if (heroBtn && heroInput) {
        heroBtn.addEventListener('click', handleHeroSubmit);
        heroInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleHeroSubmit();
        });
    }

    // Suggestion pills
    document.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.getAttribute('data-prompt');
            if (prompt) fillHero(prompt);
        });
    });

    // Contact form stub
    const contactBtn = document.getElementById('contact-submit-btn');
    if (contactBtn) {
        contactBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const originalText = contactBtn.textContent;
            contactBtn.textContent = 'Message Sent!';
            contactBtn.disabled = true;
            setTimeout(() => {
                contactBtn.textContent = originalText;
                contactBtn.disabled = false;
                document.querySelector('.contact-form').reset();
            }, 3000);
        });
    }
});

function handleHeroSubmit() {
    const input = document.getElementById('hero-input');
    if (input && input.value.trim()) {
        const prompt = encodeURIComponent(input.value.trim());
        window.location.href = `login.html?prompt=${prompt}`;
    }
}

function fillHero(text) {
    const input = document.getElementById('hero-input');
    if (input) {
        input.value = text;
        input.focus();
    }
}

// --- Animation Logic ---

// 1. Scroll Reveal Observer
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
        }
    });
}, {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
});

document.querySelectorAll('.reveal-on-scroll, .section-header, .b44-card').forEach(el => {
    el.classList.add('reveal-on-scroll'); // Ensure class is present
    scrollObserver.observe(el);
});


// 2. Background Spotlight Animation
// Tilt effect for cards/suggestions (if any exist)
document.querySelectorAll('.hover-lift').forEach(el => {
    const rect = el.getBoundingClientRect();
    // Simple spotlight on cards if supported or hover calculations
});