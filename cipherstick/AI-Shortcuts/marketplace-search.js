// Marketplace Search Functionality
function searchMarketplace(query) {
    const searchTerm = query.toLowerCase().trim();
    const shortcutCards = document.querySelectorAll('.shortcut-card');

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
    const grid = document.querySelector('.shortcuts-grid');

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
