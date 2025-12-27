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
    document.querySelectorAll('.hero-suggestion-btn').forEach(btn => {
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
        window.location.href = `app.html?prompt=${prompt}`;
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


// 2. Parallax Effect for Hero
document.addEventListener('mousemove', (e) => {
    const heroVisuals = document.querySelector('.hero-visuals');
    if (!heroVisuals) return;

    // Only active when mouse is over hero or generally on screen
    const x = (window.innerWidth - e.pageX * 2) / 100;
    const y = (window.innerHeight - e.pageY * 2) / 100;

    document.querySelectorAll('.float-card').forEach(card => {
        const speed = card.getAttribute('data-speed') || 0.05;
        const xOffset = x * speed * 100;
        const yOffset = y * speed * 100;

        // Apply translation while preserving the 'float' animation (translateY)
        // Since float animation uses transform, we can't easily overwrite it without composition.
        // A simple trick is to apply parallax to a wrapper or use margin/top/left properties, or use compositing.
        // However, standard transform overwrite kills the CSS animation.
        // Better approach: Apply parallax to the GRID container, or individual transforms if we wrap.

        // Easier: Just move the card. The CSS animation 'float' uses translateY.
        // We can use translate3d(x, y, 0) for parallax.
        // To combine, we can wrap the card content or just accept that mouse movement overrides the bobbing slightly,
        // OR we can add the parallax offset to custom properties.

        // Let's use custom properties for cleaner composition if browser supports, but simple translate is safer.
        // We will just apply it to the element. The CSS 'float' animation might keyframe 'transform'. 
        // If we set style.transform, it overrides the keyframe content unless we are careful.

        // Strategy: Keyframes modify 'transform', JS modifies 'transform'. Conflict.
        // Solution: Wrap the card in a div that handles the FLOAT animation, and apply PARALLAX to the inner card (or vice versa).

        // Update: The current HTML structure has .float-card. Let's assume we can just move them.
        // Actually, let's change properties 'left' and 'top' slightly? No, performance.
        // Correct fix: Use CSS variable for the offset in the transform.

        card.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    });

    // Also move background blobs slightly differently
    document.querySelectorAll('.hero-glow').forEach((blob, index) => {
        const speed = (index + 1) * 0.02;
        blob.style.transform = `translate(${x * speed * 50}px, ${y * speed * 50}px)`;
    });
});