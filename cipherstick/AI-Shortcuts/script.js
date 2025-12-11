// Landing page functionality only

// Generate shortcut from landing page - redirects to app
function generateShortcut() {
    const input = document.getElementById('hero-input');
    if (input && input.value.trim()) {
        window.location.href = `app.html?prompt=${encodeURIComponent(input.value.trim())}`;
    }
}