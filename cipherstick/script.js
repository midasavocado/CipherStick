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

    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mobileNavDropdown = document.getElementById('mobile-nav-dropdown');
    if (mobileNavToggle && mobileNavDropdown) {
        mobileNavToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = document.body.classList.toggle('mobile-nav-open');
            mobileNavToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            mobileNavToggle.classList.toggle('is-open', isOpen);
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#mobile-nav-dropdown') && !e.target.closest('#mobile-nav-toggle')) {
                document.body.classList.remove('mobile-nav-open');
                mobileNavToggle.setAttribute('aria-expanded', 'false');
                mobileNavToggle.classList.remove('is-open');
            }
        });
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                document.body.classList.remove('mobile-nav-open');
                mobileNavToggle.setAttribute('aria-expanded', 'false');
                mobileNavToggle.classList.remove('is-open');
            }
        });
    }

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

    const marquee = document.querySelector('.marketplace-strip');
    const marqueeFrame = document.querySelector('.marketplace-frame');
    if (marquee && marqueeFrame) {
        const STORAGE_PREFIX = 'shortcutstudio';
        const storageKey = (suffix) => `${STORAGE_PREFIX}_${suffix}`;
        const readJson = (suffix, fallback) => {
            try {
                const raw = localStorage.getItem(storageKey(suffix));
                return raw ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        };
        const writeJson = (suffix, value) => {
            try {
                localStorage.setItem(storageKey(suffix), JSON.stringify(value));
            } catch {
                // Ignore storage failures (private mode, quota, etc).
            }
        };

        const baseTrack = marquee.querySelector('.marketplace-track');
        if (!baseTrack) {
            return;
        }

        const defaultCards = Array.from(baseTrack.children).map((node) => node.cloneNode(true));
        const USE_STORED_MARKETPLACE_ITEMS = false;
        const placeholderIdeas = [
            {
                id: 'screenshot-to-photos',
                name: 'Screenshot to Photos',
                description: 'Capture a screenshot and save it to your camera roll.',
                upvotes: 420,
                downloads: 1700
            },
            {
                id: 'background-remover',
                name: 'Background Remover',
                description: 'Pick a photo, remove the background, and save the result.',
                upvotes: 312,
                downloads: 1200
            },
            {
                id: 'voice-memo-to-text',
                name: 'Voice Memo to Text',
                description: 'Transcribe audio and copy the text to your clipboard.',
                upvotes: 510,
                downloads: 2100
            },
            {
                id: 'qr-code-maker',
                name: 'QR Code Maker',
                description: 'Turn any text into a QR code and save it as an image.',
                upvotes: 260,
                downloads: 980
            },
            {
                id: 'clipboard-case-switch',
                name: 'Clipboard Case Switch',
                description: 'Grab clipboard text, change the case, and copy it back.',
                upvotes: 198,
                downloads: 750
            },
            {
                id: 'weather-snapshot',
                name: 'Weather Snapshot',
                description: 'Show current conditions plus a quick forecast summary.',
                upvotes: 376,
                downloads: 1400
            },
            {
                id: 'barcode-to-clipboard',
                name: 'Barcode to Clipboard',
                description: 'Scan a barcode and instantly copy the result.',
                upvotes: 155,
                downloads: 620
            },
            {
                id: 'dictate-and-message',
                name: 'Dictate & Message',
                description: 'Dictate text and send it as a message in one tap.',
                upvotes: 290,
                downloads: 1100
            },
            {
                id: 'extract-text-photo',
                name: 'Extract Text from Photo',
                description: 'Choose a photo, extract the text, and show the result.',
                upvotes: 340,
                downloads: 1300
            },
            {
                id: 'open-maps-pin',
                name: 'Open Maps Pin',
                description: 'Grab your location and open it in Maps instantly.',
                upvotes: 210,
                downloads: 840
            },
            {
                id: 'quick-timer',
                name: 'Quick Timer',
                description: 'Start a timer with a single tap and get a notification.',
                upvotes: 180,
                downloads: 700
            },
            {
                id: 'random-number-alert',
                name: 'Random Number Alert',
                description: 'Generate a random number and show it in an alert.',
                upvotes: 230,
                downloads: 880
            }
        ];

        const shuffleArray = (items) => {
            const copy = items.slice();
            for (let i = copy.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
        };

        const getRandomIdeas = (count = 8) => {
            const shuffled = shuffleArray(placeholderIdeas);
            return shuffled.slice(0, Math.min(shuffled.length, count));
        };
        const buildCard = (item) => {
            const description = item.description || item.summary || 'Custom shortcut built with ShortcutStudio.';
            const card = document.createElement('div');
            card.className = 'ss-card example-card';
            if (item.id) {
                card.dataset.marketplaceId = item.id;
            }
            card.innerHTML = `
                <div class="card-metrics">
                    <span class="card-metric">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 21s-6-4.35-9-8.35C.5 9.5 2.3 6 6 6c2 0 3.4 1.1 4 2.1C10.6 7.1 12 6 14 6c3.7 0 5.5 3.5 3 6.65C18 16.65 12 21 12 21z"></path>
                        </svg>
                        ${Number(item.upvotes || 0)}
                    </span>
                    <span class="card-metric">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 3v12"></path>
                            <path d="m7 10 5 5 5-5"></path>
                            <path d="M5 21h14"></path>
                        </svg>
                        ${Number(item.downloads || 0)}
                    </span>
                </div>
                <div class="card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <path d="M14 2v6h6"></path>
                    </svg>
                </div>
                <h3>${item.name || 'Untitled Project'}</h3>
                <p>${description}</p>
                <a href="marketplace-item.html?id=${item.id || ''}" class="btn btn-primary-sm"
                    style="margin-top: 1rem; width: 100%; text-align: center;">Get this shortcut</a>
            `;
            return card;
        };

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const mobileQuery = window.matchMedia('(max-width: 900px)');
        let marqueeState = null;
        let marqueeRafId = null;
        const SPEED_EASE = 3;

        const parseCssTime = (value) => {
            const raw = String(value || '').trim();
            if (!raw) return null;
            if (raw.endsWith('ms')) {
                const ms = parseFloat(raw);
                return Number.isFinite(ms) ? ms / 1000 : null;
            }
            if (raw.endsWith('s')) {
                const sec = parseFloat(raw);
                return Number.isFinite(sec) ? sec : null;
            }
            const numeric = parseFloat(raw);
            return Number.isFinite(numeric) ? numeric : null;
        };

        const getGapValue = () => {
            const style = getComputedStyle(baseTrack);
            const gapValue = style.columnGap || style.gap || '0';
            const parsed = parseFloat(gapValue);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
            const cards = Array.from(baseTrack.children);
            if (cards.length > 1) {
                const firstRect = cards[0].getBoundingClientRect();
                const secondRect = cards[1].getBoundingClientRect();
                const measured = secondRect.left - firstRect.right;
                return Number.isFinite(measured) ? measured : 0;
            }
            return 0;
        };

        const getTrackMetrics = () => {
            const cards = Array.from(baseTrack.children);
            if (!cards.length) {
                return null;
            }
            const gap = getGapValue();
            const widths = cards.map((card) => card.getBoundingClientRect().width);
            const totalWidth = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, cards.length - 1);
            const duration = parseCssTime(getComputedStyle(marquee).getPropertyValue('--marquee-duration')) || 32.2;
            const baseSpeed = totalWidth > 0 ? totalWidth / duration : 0;
            return { gap, baseSpeed };
        };

        const stopMarquee = () => {
            if (marqueeRafId) {
                cancelAnimationFrame(marqueeRafId);
                marqueeRafId = null;
            }
            marqueeState = null;
            baseTrack.style.transform = 'translate3d(0, 0, 0)';
        };

        const startMarquee = () => {
            stopMarquee();
            marquee.querySelectorAll('.marketplace-track.clone').forEach((node) => node.remove());
            if (baseTrack.children.length === 0) {
                marqueeFrame.classList.add('empty');
                return;
            }
            marqueeFrame.classList.remove('empty');
            if (mobileQuery.matches || prefersReducedMotion.matches) {
                return;
            }
            const metrics = getTrackMetrics();
            if (!metrics || metrics.baseSpeed <= 0) {
                return;
            }
            marquee.classList.add('marquee-js');
            baseTrack.style.willChange = 'transform';
            marqueeState = {
                offset: 0,
                currentSpeed: metrics.baseSpeed,
                targetSpeed: metrics.baseSpeed,
                baseSpeed: metrics.baseSpeed,
                gap: metrics.gap,
                lastTime: null
            };

            const tick = (time) => {
                if (!marqueeState) {
                    return;
                }
                if (mobileQuery.matches || prefersReducedMotion.matches || marqueeFrame.offsetParent === null) {
                    stopMarquee();
                    return;
                }
                if (marqueeState.lastTime === null) {
                    marqueeState.lastTime = time;
                }
                const delta = (time - marqueeState.lastTime) / 1000;
                marqueeState.lastTime = time;
                const ease = Math.min(1, delta * SPEED_EASE);
                marqueeState.currentSpeed += (marqueeState.targetSpeed - marqueeState.currentSpeed) * ease;
                marqueeState.offset -= marqueeState.currentSpeed * delta;
                const gap = marqueeState.gap;
                let first = baseTrack.children[0];
                let stepWidth = first ? first.getBoundingClientRect().width + gap : 0;
                while (first && stepWidth > 0 && marqueeState.offset <= -stepWidth) {
                    baseTrack.appendChild(first);
                    marqueeState.offset += stepWidth;
                    first = baseTrack.children[0];
                    stepWidth = first ? first.getBoundingClientRect().width + gap : 0;
                }
                baseTrack.style.transform = `translate3d(${marqueeState.offset}px, 0, 0)`;
                marqueeRafId = requestAnimationFrame(tick);
            };

            marqueeRafId = requestAnimationFrame(tick);
        };

        const renderMarketplaceItems = (items, options = {}) => {
            const { persist = false, replace = false } = options;
            const normalized = Array.isArray(items) ? items : [];
            if (persist) {
                writeJson('marketplaceItems', { items: normalized, replace });
            }
            baseTrack.innerHTML = '';
            if (!replace) {
                defaultCards.forEach((node) => {
                    baseTrack.appendChild(node.cloneNode(true));
                });
            }
            if (normalized.length) {
                normalized.forEach((item) => {
                    baseTrack.appendChild(buildCard(item));
                });
            }
            requestAnimationFrame(startMarquee);
        };

        if (USE_STORED_MARKETPLACE_ITEMS) {
            const storedPayload = readJson('marketplaceItems', []);
            const storedItems = Array.isArray(storedPayload) ? storedPayload : storedPayload?.items;
            const storedReplace = !Array.isArray(storedPayload) && Boolean(storedPayload?.replace);
            renderMarketplaceItems(Array.isArray(storedItems) ? storedItems : [], { replace: storedReplace });
        } else {
            renderMarketplaceItems(getRandomIdeas(10), { replace: true });
        }

        window.ShortcutStudio = window.ShortcutStudio || {};
        window.ShortcutStudio.setMarketplaceItems = (items, options = {}) => {
            const replace = options.replace !== false;
            renderMarketplaceItems(items, { persist: options.persist !== false, replace });
        };
        window.ShortcutStudio.getMarketplaceItems = () => {
            const payload = readJson('marketplaceItems', []);
            return Array.isArray(payload) ? payload : (payload?.items || []);
        };

        const setHoverState = (isHovering) => {
            if (!marqueeState) {
                return;
            }
            marqueeState.targetSpeed = isHovering ? 0 : marqueeState.baseSpeed;
        };

        marqueeFrame.addEventListener('mouseenter', () => setHoverState(true));
        marqueeFrame.addEventListener('mouseleave', () => setHoverState(false));

        window.addEventListener('resize', () => {
            clearTimeout(window.__marketplaceMarqueeResize);
            window.__marketplaceMarqueeResize = setTimeout(startMarquee, 150);
        });

        mobileQuery.addEventListener('change', () => {
            startMarquee();
        });

        prefersReducedMotion.addEventListener('change', () => {
            startMarquee();
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

document.querySelectorAll('.reveal-on-scroll, .section-header, .ss-card').forEach(el => {
    if (el.closest('.marketplace-strip')) return;
    el.classList.add('reveal-on-scroll'); // Ensure class is present
    scrollObserver.observe(el);
});


// 2. Background Spotlight Animation
// Tilt effect for cards/suggestions (if any exist)
document.querySelectorAll('.hover-lift').forEach(el => {
    const rect = el.getBoundingClientRect();
    // Simple spotlight on cards if supported or hover calculations
});
