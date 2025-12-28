// Marketplace Search Functionality
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

function buildMarketplaceCard(item) {
    const card = document.createElement('div');
    card.className = 'ss-card market-card';
    card.dataset.marketplaceId = item.id || '';
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <path d="M14 2v6h6"></path>
            </svg>
        </div>
        <h3>${item.name || 'Untitled Project'}</h3>
        <p>${item.description || item.summary || 'Custom shortcut built with ShortcutStudio.'}</p>
        <div class="market-stats">
            <span>@you</span>
            <span>${Number(item.downloads || 0)} uses</span>
        </div>
        <div class="market-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
            <button class="btn-secondary" style="flex: 1; font-size: 0.8rem;">Remix</button>
            <button class="btn-primary-sm" style="flex: 1; font-size: 0.8rem;">Download</button>
        </div>
    `;
    return card;
}

function loadMarketplaceItems() {
    const grid = document.querySelector('.ss-grid');
    if (!grid) return;
    const items = readStoredJson('marketplaceItems', []);
    if (!Array.isArray(items) || !items.length) return;
    items.forEach((item) => {
        if (!item || !item.id) return;
        if (grid.querySelector(`[data-marketplace-id="${item.id}"]`)) return;
        grid.appendChild(buildMarketplaceCard(item));
    });
}

function searchMarketplace(query) {
    const searchTerm = query.toLowerCase().trim();
    const shortcutCards = document.querySelectorAll('.market-card');

    shortcutCards.forEach(card => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const description = card.querySelector('p')?.textContent.toLowerCase() || '';

        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });

    // Show "no results" message if needed
    const visibleCards = Array.from(shortcutCards).filter(card => card.style.display !== 'none');
    const grid = document.querySelector('.ss-grid'); // Fixed selector from .shortcuts-grid

    let noResultsMsg = document.getElementById('no-results-message');
    if (visibleCards.length === 0) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.id = 'no-results-message';
            noResultsMsg.style.textAlign = 'center';
            noResultsMsg.style.padding = '3rem';
            noResultsMsg.style.color = 'var(--text-muted)';
            noResultsMsg.innerHTML = '<p>No shortcuts found matching your search.</p>';
            grid.parentNode.insertBefore(noResultsMsg, grid.nextSibling);
        }
        noResultsMsg.style.display = 'block';
    } else {
        if (noResultsMsg) noResultsMsg.style.display = 'none';
    }
}

function filterMarketplace(filter) {
    // Dropdown handles active state automatically

    const cards = Array.from(document.querySelectorAll('.market-card'));
    const grid = document.querySelector('.ss-grid');

    // Mock sorting/filtering logic
    if (filter === 'popular') {
        // Sort by uses (descending)
        cards.sort((a, b) => {
            const usesA = parseInt(a.querySelector('.market-stats span:nth-child(2)').textContent) || 0;
            const usesB = parseInt(b.querySelector('.market-stats span:nth-child(2)').textContent) || 0;
            return usesB - usesA;
        });
    } else if (filter === 'recent') {
        // Random shuffle for "recent" mock
        cards.sort(() => Math.random() - 0.5);
    } else if (filter === 'trending') {
        // Sort by uses (ascending for mock "trending")
        cards.sort((a, b) => {
            const usesA = parseInt(a.querySelector('.market-stats span:nth-child(2)').textContent) || 0;
            const usesB = parseInt(b.querySelector('.market-stats span:nth-child(2)').textContent) || 0;
            return usesA - usesB;
        });
    } else {
        // All - Default order (DOM order)
        // In a real app, we'd reload from source or have an ID to sort by
    }

    // Re-append in new order
    cards.forEach(card => grid.appendChild(card));
}

document.addEventListener('DOMContentLoaded', () => {
    loadMarketplaceItems();
});
