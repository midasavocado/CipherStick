// Marketplace Search Functionality
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
