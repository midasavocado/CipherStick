// Marketplace Search & Navigation
function storageKey(suffix) {
    return `shortcutstudio_${suffix}`;
}

function readStoredJson(suffix, fallback) {
    try {
        const raw = localStorage.getItem(storageKey(suffix));
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

// Navigate to shortcut detail page
function goToShortcut(id) {
    window.location.href = `marketplace-item.html?id=${encodeURIComponent(id)}`;
}

// Search functionality
function searchMarketplace(query) {
    const searchTerm = query.toLowerCase().trim();
    const shortcutCards = document.querySelectorAll('.shortcut-card');
    const noResults = document.getElementById('no-results');
    const grid = document.getElementById('shortcut-grid');

    let visibleCount = 0;

    shortcutCards.forEach(card => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.shortcut-description')?.textContent.toLowerCase() || '';
        const author = card.querySelector('.shortcut-author')?.textContent.toLowerCase() || '';

        const matches = title.includes(searchTerm) || 
                       description.includes(searchTerm) || 
                       author.includes(searchTerm);

        if (matches) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Show/hide no results message
    if (noResults) {
        noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }
    if (grid) {
        grid.style.display = visibleCount === 0 ? 'none' : '';
    }
}

// Filter chips functionality
function initFilterChips() {
    const filterChips = document.querySelectorAll('.filter-chip');
    
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Update active state
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const filter = chip.dataset.filter;
            applyFilter(filter);
        });
    });
}

// Apply filter/sort
function applyFilter(filter) {
    const grid = document.getElementById('shortcut-grid');
    if (!grid) return;
    
    const cards = Array.from(grid.querySelectorAll('.shortcut-card'));
    
    // Parse download count from stat
    const getDownloads = (card) => {
        const stats = card.querySelectorAll('.shortcut-stat');
        // Downloads is second stat (index 1)
        if (stats.length >= 2) {
            const text = stats[1].textContent.trim();
            return parseFloat(text.replace(/[^0-9.]/g, '')) * (text.includes('k') ? 1000 : 1);
        }
        return 0;
    };
    
    const getLikes = (card) => {
        const stats = card.querySelectorAll('.shortcut-stat');
        // Likes is first stat (index 0)
        if (stats.length >= 1) {
            const text = stats[0].textContent.trim();
            return parseFloat(text.replace(/[^0-9.]/g, '')) * (text.includes('k') ? 1000 : 1);
        }
        return 0;
    };

    if (filter === 'popular') {
        cards.sort((a, b) => getDownloads(b) - getDownloads(a));
    } else if (filter === 'trending') {
        // Trending = high likes relative to downloads
        cards.sort((a, b) => getLikes(b) - getLikes(a));
    } else if (filter === 'recent') {
        // Shuffle for demo (in real app would sort by date)
        cards.sort(() => Math.random() - 0.5);
    }
    // 'all' keeps original order

    // Re-append in sorted order
    cards.forEach(card => grid.appendChild(card));
}

// Category filtering
function initCategoryCards() {
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            // Update active state
            categoryCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const category = card.dataset.category;
            filterByCategory(category);
        });
    });
}

function filterByCategory(category) {
    const shortcutCards = document.querySelectorAll('.shortcut-card');
    const noResults = document.getElementById('no-results');
    const grid = document.getElementById('shortcut-grid');

    let visibleCount = 0;

    shortcutCards.forEach(card => {
        const cardCategories = (card.dataset.category || '').toLowerCase().split(',');
        
        if (category === 'all' || cardCategories.includes(category.toLowerCase())) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Show/hide no results
    if (noResults) {
        noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }
    if (grid) {
        grid.style.display = visibleCount === 0 ? 'none' : '';
    }
}

// Load user's marketplace items (if any stored)
function loadMarketplaceItems() {
    const grid = document.getElementById('shortcut-grid');
    if (!grid) return;
    
    const items = readStoredJson('marketplaceItems', []);
    if (!Array.isArray(items) || !items.length) return;
    
    items.forEach((item) => {
        if (!item || !item.id) return;
        if (grid.querySelector(`[data-id="${item.id}"]`)) return;
        grid.appendChild(buildMarketplaceCard(item));
    });
}

// Build card for user-created items
function buildMarketplaceCard(item) {
    const colors = ['blue', 'purple', 'green', 'orange', 'pink', 'cyan'];
    const colorClass = colors[Math.floor(Math.random() * colors.length)];
    
    const card = document.createElement('article');
    card.className = 'shortcut-card';
    card.dataset.id = item.id || '';
    card.dataset.category = item.category || 'utilities';
    card.onclick = () => goToShortcut(item.id);
    
    card.innerHTML = `
        <div class="shortcut-card-header">
            <div class="shortcut-icon ${colorClass}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <path d="M14 2v6h6"></path>
                </svg>
            </div>
            <div class="shortcut-info">
                <h3>${item.name || 'Untitled Shortcut'}</h3>
                <span class="shortcut-author">@you</span>
            </div>
        </div>
        <p class="shortcut-description">${item.description || item.summary || 'Custom shortcut built with ShortcutStudio.'}</p>
        <div class="action-preview-mini">
            <span class="action-count">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 3v12"></path>
                    <path d="m8 11 4 4 4-4"></path>
                    <path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"></path>
                </svg>
                ${item.actionCount || '?'} actions
            </span>
        </div>
        <div class="shortcut-stats">
            <span class="shortcut-stat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                </svg>
                ${item.upvotes || 0}
            </span>
            <span class="shortcut-stat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                ${item.downloads || 0}
            </span>
        </div>
        <div class="shortcut-actions" onclick="event.stopPropagation()">
            <button class="btn-get" onclick="goToShortcut('${item.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Get Shortcut
            </button>
        </div>
    `;
    
    return card;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initFilterChips();
    initCategoryCards();
    loadMarketplaceItems();
});
