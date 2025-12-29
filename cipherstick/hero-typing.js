// Hero Typing Animation
const phrases = [
    "Describe which shortcut to build...",
    "Summarize the weather today",
    "Send a text to my mom",
    "Create a morning routine",
    "Add task to my todo list",
    "Play my favorite playlist",
    "Get directions home",
    "Set a reminder for 3pm"
];

let currentPhraseIndex = 0;
let currentCharIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

function typeWriter() {
    const heroInput = document.getElementById('hero-input');
    if (!heroInput) return;

    const currentPhrase = phrases[currentPhraseIndex];

    if (isDeleting) {
        // Delete character
        heroInput.placeholder = currentPhrase.substring(0, currentCharIndex - 1);
        currentCharIndex--;
        typingSpeed = 50;

        if (currentCharIndex === 0) {
            isDeleting = false;
            currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
            typingSpeed = 500; // Pause before typing next phrase
        }
    } else {
        // Type character
        heroInput.placeholder = currentPhrase.substring(0, currentCharIndex + 1);
        currentCharIndex++;
        typingSpeed = 100;

        if (currentCharIndex === currentPhrase.length) {
            isDeleting = true;
            typingSpeed = 2000; // Pause before deleting
        }
    }

    setTimeout(typeWriter, typingSpeed);
}

// Start animation when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(typeWriter, 1000);
    });
} else {
    setTimeout(typeWriter, 1000);
}
