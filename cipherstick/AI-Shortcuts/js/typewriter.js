// Typewriter Effect
const typewriterInput = document.getElementById('hero-input');
if (typewriterInput) {
    const phrases = [
        "Describe the shortcut you want to generate...",
        "Make a shortcut that downloads YouTube videos",
        "Make a shortcut that logs water intake",
        "Make a shortcut that splits the bill",
        "Make a shortcut that extracts text from images"
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 80; // 20% Faster typing

    function type() {
        const currentPhrase = phrases[phraseIndex];
        let displayText = currentPhrase.substring(0, charIndex);

        // Add cursor
        if (!isDeleting && charIndex < currentPhrase.length) {
            displayText += '|';
        }

        typewriterInput.placeholder = displayText;

        if (isDeleting) {
            charIndex--;
            typeSpeed = 50; // Faster deleting
        } else {
            charIndex++;
            typeSpeed = 100 + Math.random() * 50; // Human-like variation
        }

        if (!isDeleting && charIndex > currentPhrase.length) {
            isDeleting = true;
            typeSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typeSpeed = 500; // Pause before new phrase
        }

        setTimeout(type, typeSpeed);
    }

    // Start the effect
    setTimeout(type, 1000);
}
