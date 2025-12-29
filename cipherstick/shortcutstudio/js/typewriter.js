// Typewriter Effect (placeholder-only; pauses while user is typing)
const typewriterInput = document.getElementById('hero-input');
if (typewriterInput) {
  const phrases = [
    'Describe the shortcut you want to create...',
    'Make a shortcut that downloads YouTube videos',
    'Make a shortcut that logs water intake',
    'Make a shortcut that splits the bill',
    'Make a shortcut that extracts text from images'
  ];

  let phraseIndex = 0;
  // Start with the default placeholder already visible, then delete it in a typewriter style.
  let charIndex = phrases[0]?.length || 0;
  let isDeleting = true;
  let timeoutId = null;

  const typeSpeedMs = 55;
  const deleteSpeedMs = 35;
  const startDelayMs = 600;
  const endDelayMs = 1400;
  const idleDelayMs = 350;
  const initialDelayMs = 1100;

  const isUserInteracting = () =>
    document.activeElement === typewriterInput || (typewriterInput.value && typewriterInput.value.trim().length > 0);

  const setPlaceholder = (text, showCursor) => {
    typewriterInput.placeholder = showCursor ? `${text}|` : text;
  };

  function tick() {
    timeoutId = null;

    if (!typewriterInput.isConnected) return;
    if (document.hidden || isUserInteracting()) {
      timeoutId = window.setTimeout(tick, idleDelayMs);
      return;
    }

    const phrase = phrases[phraseIndex] || '';

    if (isDeleting) {
      charIndex = Math.max(0, charIndex - 1);
    } else {
      charIndex = Math.min(phrase.length, charIndex + 1);
    }

    const text = phrase.slice(0, charIndex);
    const atEnd = charIndex >= phrase.length;
    const atStart = charIndex <= 0;

    // Cursor should show while typing/deleting, but not while sitting idle at a full phrase.
    const showCursor = !(!isDeleting && atEnd);
    setPlaceholder(text, showCursor);

    let delay = isDeleting ? deleteSpeedMs : typeSpeedMs;
    if (!isDeleting && atEnd) {
      isDeleting = true;
      delay = endDelayMs;
    } else if (isDeleting && atStart) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      delay = startDelayMs;
    }

    timeoutId = window.setTimeout(tick, delay);
  }

  // Initialize placeholder to match the HTML default, then start deleting.
  setPlaceholder(phrases[0] || '', false);

  // Start the effect
  timeoutId = window.setTimeout(tick, initialDelayMs);

  window.addEventListener('beforeunload', () => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
}
