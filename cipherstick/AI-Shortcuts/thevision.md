# The Vision: ShortcutStudio

ShortcutStudio is the premier AI-powered platform for building Apple Shortcuts. Our goal is to democratize automation by turning natural language into powerful, functional, and safe `.shortcut` files.

## Core Pillars
1.  **Magic Experience**: The user types a thought, and a shortcut appears. The process should feel instantaneous and magical, visualized by our "Live Build" streaming interface.
2.  **Premium Quality**: We are not just a tool; we are a crafted experience. The UI is sleek, dark-moded, and animation-rich (glassmorphism, smooth transitions).
3.  **Safety & Reliability**: Generated shortcuts must be safe to run. Our backend enforces rate limits, sanitizes outputs, and uses a multi-pass AI architecture to ensure correctness.
4.  **Community**: A marketplace for sharing and discovering shortcuts, fostering a community of automation enthusiasts.

## Architecture
-   **Frontend**: Vanilla HTML/JS/CSS (no build step overhead) for maximum control and performance. Hosted on static hosting.
-   **Backend**: Cloudflare Workers (`secrets`) for high-performance, low-latency AI orchestration.
-   **AI**: OpenRouter (GPT-OSS-120B)
## Changelog

### 2025-12-27 1:45PM
-   **Comprehensive Audit**: Analyzed codebase for improvements.
-   **Worker Optimization**: Implemented rate limiting, TTL caching, parallel fetching, and request tracing.
-   **Streaming**: Added "Live Build" visualization with partial program streaming and CSS animations.
-   **Modularization**: Refactored `index.js` into `config`, `llm`, and `utils`.

### 2025-12-27 04:49PM
-   **Tried**: Hardened stream parsing to accept SSE `data:` lines, added live hint ticker, added fallback live-build skeleton growth.
-   **Errors**: None observed during edits.
-   **Worked**: Pipeline hint now updates continuously even without server progress packets; partial program rendering no longer blocked by animation toggle.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js` to start/stop hint/build tickers, parse streaming packets more robustly, and render partial programs without gating.

### 2025-12-27 05:02PM
-   **Tried**: Wired build step to `openRouterChatStreaming` and emitted `partial_program` packets via `attemptPartialProgramParse`.
-   **Errors**: None observed during edits.
-   **Worked**: Backend now sends incremental `partial_program` updates during generation.
-   **Failed**: None.
-   **Changes**: Updated `/secrets/src/index.js` to stream build content, throttle partial parsing, and fall back to non-streaming on failure.
