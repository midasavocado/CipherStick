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

### 2025-12-27 05:04PM
-   **Tried**: Removed the auto-injected “I'm building your shortcut now…” message.
-   **Errors**: None observed during edits.
-   **Worked**: No unsolicited intro message appears before streaming updates.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js` to remove the timed message injection during generation.

### 2025-12-27 05:08PM
-   **Tried**: Render streamed partial programs using real action nodes instead of placeholder cards.
-   **Errors**: None observed during edits.
-   **Worked**: Streaming preview now matches the actual visualization layout.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js` streaming renderer and added streaming styles for action nodes in `css/pages/app.css`.

### 2025-12-27 05:18PM
-   **Tried**: Added a top-level toggle to skip action selection and send the full template catalog to the model.
-   **Errors**: None observed during edits.
-   **Worked**: Planner step can be bypassed and all templates are included in the build payload.
-   **Failed**: None.
-   **Changes**: Updated `/secrets/src/index.js` with `USE_ALL_TEMPLATES` toggle and adjusted search hints for full-catalog mode.

### 2025-12-27 05:22PM
-   **Tried**: Added a backend UI signal for full-catalog mode and a front-end pipeline animation variant.
-   **Errors**: None observed during edits.
-   **Worked**: Full-catalog runs can toggle enhanced orb animations on the client.
-   **Failed**: None.
-   **Changes**: Updated `/secrets/src/index.js` to emit `ui` packets and `js/app.js`/`css/pages/app.css` to apply the full-catalog orb style.

### 2025-12-27 05:30PM
-   **Tried**: Eliminated subrequest overload by bundling a template summary for full-catalog mode.
-   **Errors**: None observed during edits.
-   **Worked**: Full-catalog runs no longer fetch 100+ templates via subrequests.
-   **Failed**: None.
-   **Changes**: Added `/secrets/src/templates.summary.js` and updated `/secrets/src/index.js` to use it when `USE_ALL_TEMPLATES` is enabled.

### 2025-12-27 05:34PM
-   **Tried**: Replaced the template summary with a full bundled AllTemplates script.
-   **Errors**: None observed during edits.
-   **Worked**: Full-catalog mode now uses the bundled full template set without subrequests.
-   **Failed**: None.
-   **Changes**: Added `/secrets/src/AllTemplates.js`, removed `/secrets/src/templates.summary.js`, and updated `/secrets/src/index.js` to use the new bundle.

### 2025-12-27 05:40PM
-   **Tried**: Shortened summary outputs and removed fake streaming visuals in the preview.
-   **Errors**: None observed during edits.
-   **Worked**: Summaries are limited to short paragraphs and the preview only updates when real actions stream.
-   **Failed**: None.
-   **Changes**: Updated `/secrets/src/index.js` summary prompt/creativity rules, trimmed the AllTemplates bundle usage, and updated `js/app.js` to stop live hint/build tickers.

### 2025-12-27 05:45PM
-   **Tried**: Simplified full-catalog progress hints and added a menu-case visualizer layout.
-   **Errors**: None observed during edits.
-   **Worked**: Full-catalog mode now shows “Examining templates” and Choose From Menu renders like a control block with cases.
-   **Failed**: None.
-   **Changes**: Updated `/secrets/src/index.js` and `js/app.js`.

### 2025-12-27 05:49PM
-   **Tried**: Ensured Add Action opens in edit mode so it behaves like “Add Action,” not “Force Action.”
-   **Errors**: None observed during edits.
-   **Worked**: Clicking Add Action now toggles edit mode first.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-27 06:01PM
-   **Tried**: Tuned summary formatting, fixed action modal modes, and smoothed full-catalog orb sequencing.
-   **Errors**: None observed during edits.
-   **Worked**: Summaries prefer markdown bullets; Add Action now always adds to the end while Force Action always forces; full-catalog orbs no longer advance at the same instant.
-   **Failed**: None.
-   **Changes**: Updated `/secrets/src/index.js` and `js/app.js`.

### 2025-12-27 06:02PM
-   **Tried**: Clarified ChooseFromMenu vs List.ChooseFrom and refined action labels.
-   **Errors**: None observed during edits.
-   **Worked**: Menu vs list selection is disambiguated in prompts and UI labels.
-   **Failed**: None.
-   **Changes**: Updated `/secrets/src/index.js` and `js/app.js`.

### 2025-12-27 06:24PM
-   **Tried**: Stopped output-link pruning from treating any string starting with `!ID:` as a pure link token.
-   **Errors**: None observed during edits.
-   **Worked**: Mixed-text expressions beginning with `!ID:` no longer get blanked during final render.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js` to tighten link-token detection in `pruneMissingOutputLinks`.

### 2025-12-27 06:28PM
-   **Tried**: Removed the example shortcut line in the clarification prompt.
-   **Errors**: None observed during edits.
-   **Worked**: Clarification prompt no longer includes the example shortcut string.
-   **Failed**: None.
-   **Changes**: Commented out the example line in `/secrets/src/index.js`.

### 2025-12-27 06:41PM
-   **Tried**: Removed UUID-style fields from exported/preview JSON since IDs handle linking.
-   **Errors**: None observed during edits.
-   **Worked**: JSON export/preview no longer includes `UUID`/`OutputUUID`-style fields.
-   **Failed**: None.
-   **Changes**: Added param-key stripping in `js/app.js` export/preview helpers.

### 2025-12-27 07:17PM
-   **Tried**: Made Choose From Menu render like If blocks, parsed WFControlFlowMode menu markers into Cases, and ensured exports preserve menu Cases for plist output. Also forced SaveToCameraRoll/Clipboard.Set to route mixed text through a Text action so inputs link via action-output nodes instead of attachmentsByRange.
-   **Errors**: None observed during edits.
-   **Worked**: Menu cases display as If-style blocks and PLIST-style menu markers now round-trip into nested Cases; exports include menu cases and conversion stays compatible with the plist structure.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`, `css/pages/app.css`, and `secrets/src/lib/conversions.js`.

### 2025-12-27 08:10PM
-   **Tried**: Added project batch selection/delete UI, hid Add Action outside edit mode, fixed variable-insert “+” buttons, and expanded Choose From Menu editing with add/remove/rename controls. Also tightened ChooseFromMenu guidance in prompts and inserted Text actions before string compares in If conversion.
-   **Errors**: None observed during edits.
-   **Worked**: Projects can be multi-selected for deletion, Add Action stays hidden outside edit mode, variable insert menu opens reliably, Choose From Menu cases are editable, prompts clarify menu branches, and If comparisons wrap inputs in Text when comparing to literal strings.
-   **Failed**: None.
-   **Changes**: Updated `app.html`, `js/app.js`, `css/pages/app.css`, `secrets/src/index.js`, and `secrets/src/lib/conversions.js`.

### 2025-12-27 08:25PM
-   **Tried**: Added a menu-items list UI for Choose From Menu and aligned option sections to the Shortcuts-style layout.
-   **Errors**: None observed during edits.
-   **Worked**: Choose From Menu now shows an editable list of items with a + control, and each item maps to its own action branch block in the visualization.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js` and `css/pages/app.css`.

### 2025-12-27 08:30PM
-   **Tried**: Made Choose From Menu render as a menu block even when only WFMenuItems/Items are present (no Cases yet).
-   **Errors**: None observed during edits.
-   **Worked**: Choose From Menu no longer falls back to the generic params UI when Cases are missing.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-27 08:34PM
-   **Tried**: Rendered the Choose From Menu prompt as a standard text-box row.
-   **Errors**: None observed during edits.
-   **Worked**: Prompt now uses the same text input styling as other params.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js` and `css/pages/app.css`.

### 2025-12-27 08:36PM
-   **Tried**: Adjusted Choose From Menu prompt defaults to use a placeholder instead of a filled value.
-   **Errors**: None observed during edits.
-   **Worked**: The prompt field now shows a grey placeholder labeled “Prompt.”
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-27 08:40PM
-   **Tried**: Treated “Select an option” as a default menu prompt and cleared it for display.
-   **Errors**: None observed during edits.
-   **Worked**: Menu prompt now shows the grey “Prompt” placeholder instead of the default text.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.
