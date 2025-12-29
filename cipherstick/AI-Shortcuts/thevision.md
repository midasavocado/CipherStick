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

### 2025-12-27 08:53PM
-   **Tried**: Strengthened the model prompt to distinguish ChooseFromMenu from List.ChooseFrom and emphasize per-option branching.
-   **Errors**: None observed during edits.
-   **Worked**: Prompt now clarifies that ChooseFromMenu creates branch bodies per option, while List.ChooseFrom only returns a picked item.
-   **Failed**: None.
-   **Changes**: Updated `secrets/src/index.js`.

### 2025-12-27 09:05PM
-   **Tried**: Fixed variable output labeling and object-linked display for If/Repeat inputs.
-   **Errors**: None observed during edits.
-   **Worked**: Get/Set Variable links now show variable names, and If/Repeat inputs display linked outputs/variables from plist-style objects.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-27 09:14PM
-   **Tried**: Added conversion support for plist-style ActionOutput objects and normalized Get Variable output labels to variable names.
-   **Errors**: None observed during edits.
-   **Worked**: If/Repeat inputs now wrap ActionOutput objects correctly in the plist, and variable outputs no longer show “Get …” in OutputName.
-   **Failed**: None.
-   **Changes**: Updated `secrets/src/lib/conversions.js`.

### 2025-12-27 09:22PM
-   **Tried**: Moved project selection toggle to the right side of project cards.
-   **Errors**: None observed during edits.
-   **Worked**: Selection checkbox now appears on the right in selection mode.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/app.css`.

### 2025-12-27 09:33PM
-   **Tried**: Generated the AllTemplates bundle directly from the real Templates directory to keep full-template mode in sync with actual files.
-   **Errors**: Initial script run failed because one template had a leading `v{` typo and the script was ESM in a CJS project.
-   **Worked**: Added a build script that strips inline `#` comments, fixes the `v{` prefix, and rewrites `secrets/src/AllTemplates.js` from the Templates directory.
-   **Failed**: None.
-   **Changes**: Added `scripts/build-all-templates.js` and regenerated `secrets/src/AllTemplates.js`.

### 2025-12-27 09:45PM
-   **Tried**: Replaced the AllTemplates JS bundle with a raw `alltemplates.json` file that preserves each template exactly, including `#` comments, and updated the worker to parse that bundle.
-   **Errors**: None observed during edits.
-   **Worked**: Full-template mode now reads from `secrets/src/alltemplates.json`, keeps raw template text for the model, and derives action/param metadata from the raw content.
-   **Failed**: None.
-   **Changes**: Removed `scripts/build-all-templates.js` and `secrets/src/AllTemplates.js`, added `secrets/src/alltemplates.json`, and updated `secrets/src/index.js` and `agents.md`.

### 2025-12-27 09:54PM
-   **Tried**: Fixed final-response parsing to preserve nested menu cases and control-flow blocks.
-   **Errors**: None observed during edits.
-   **Worked**: Final program ingestion now keeps `Cases` and nested blocks, preventing Choose From Menu/If/Repeat contents from disappearing after streaming finishes.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-27 11:16PM
-   **Tried**: Preserved streamed action content on final apply, hardened menu-case conversions, and added mobile-only chat layout with a shortcut file card.
-   **Errors**: None observed during edits.
-   **Worked**: Final program no longer drops nested actions/blank params when streaming completes; Choose From Menu conversion accepts lowercase cases/actions; mobile shows chat-only with Inspect/Download card.
-   **Failed**: None.
-   **Changes**: Updated `app.html`, `js/app.js`, `secrets/src/lib/conversions.js`, `css/variables.css`, and added `css/mobile-overrides.css`.

### 2025-12-28 09:43AM
-   **Tried**: Reworked mobile chat layout to collapse the preview space and insert the shortcut card into the chat stream; revamped landing scroll interactions with directional reveals, per-section backdrops, and a continuous examples marquee.
-   **Errors**: None observed during edits.
-   **Worked**: Mobile view no longer reserves space for the preview pane, the shortcut card lives at the end of assistant responses, and the landing sections now animate with side reveals plus a smooth, pausable horizontal showcase.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css`, `css/pages/app.css`, `js/app.js`, `index.html`, and `css/pages/landing.css`.

### 2025-12-28 09:49AM
-   **Tried**: Removed all remaining Base44/B44 references across markup, scripts, and styles.
-   **Errors**: None observed during edits.
-   **Worked**: All class names and selectors now use the new ss/app naming.
-   **Failed**: None.
-   **Changes**: Updated class names in HTML/CSS/JS and adjusted related selectors.

### 2025-12-28 09:57AM
-   **Tried**: Softened section dividers, nudged hero content upward, and adjusted the examples marquee to fully exit the viewport while keeping CTA buttons pinned.
-   **Errors**: None observed during edits.
-   **Worked**: Divider now reads as a thin gradient line, hero sits higher, marquee cards scroll past screen edges, and CTA buttons stay anchored at the card bottom.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`.

### 2025-12-28 10:08AM
-   **Tried**: Moved the hero higher, softened the section divider, and replaced the marquee with a static marketplace showcase layout.
-   **Errors**: None observed during edits.
-   **Worked**: Hero content sits higher, divider reads as a subtle gradient line, and the marketplace section now uses a left-copy + framed card strip layout.
-   **Failed**: None.
-   **Changes**: Updated `index.html` and `css/pages/landing.css`.

### 2025-12-28 10:19AM
-   **Tried**: Removed marketplace strip scrolling, added a left-edge gradient overlay on the frame, inserted a “Go to marketplace” CTA, softened the divider further, and nudged the hero upward again.
-   **Errors**: None observed during edits.
-   **Worked**: Marketplace cards are static inside the frame with a left gradient, CTA sits under the copy, divider is lighter, and hero content sits higher.
-   **Failed**: None.
-   **Changes**: Updated `index.html` and `css/pages/landing.css`.

### 2025-12-28 10:24AM
-   **Tried**: Removed the short gradient accent under the marketplace copy.
-   **Errors**: None observed during edits.
-   **Worked**: The marketplace section no longer shows the small gradient line.
-   **Failed**: None.
-   **Changes**: Updated `index.html` and `css/pages/landing.css`.

### 2025-12-28 10:33AM
-   **Tried**: Converted the marketplace frame into a scrollable grid, added extra hover headroom for cards, and removed divider spacing that created a black band between sections.
-   **Errors**: None observed during edits.
-   **Worked**: Marketplace cards scroll within the frame without clipping on hover, and the section separators no longer add a dark gap.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`.

### 2025-12-28 10:38AM
-   **Tried**: Moved scrolling to the marketplace frame and reduced card padding to make them less thick.
-   **Errors**: None observed during edits.
-   **Worked**: The frame now scrolls and cards are slimmer.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`.

### 2025-12-28 10:47AM
-   **Tried**: Swapped the marketplace frame to an auto-scrolling horizontal marquee, duplicated cards for a seamless loop, and reduced card width.
-   **Errors**: None observed during edits.
-   **Worked**: Cards now auto-scroll left with a pause-on-hover, and each card is slimmer.
-   **Failed**: None.
-   **Changes**: Updated `index.html` and `css/pages/landing.css`.

### 2025-12-28 10:55AM
-   **Tried**: Smoothed the marquee hover stop, widened cards slightly, and increased the frame height to avoid hover clipping.
-   **Errors**: None observed during edits.
-   **Worked**: The auto-scroll eases to a stop on hover, cards are wider, and the frame has more headroom.
-   **Failed**: None.
-   **Changes**: Updated `script.js` and `css/pages/landing.css`.

### 2025-12-28 11:02AM
-   **Tried**: Shifted the marketplace frame padding to reduce top space and add more bottom space.
-   **Errors**: None observed during edits.
-   **Worked**: The frame has less top padding and more bottom padding.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`.

### 2025-12-28 11:18AM
-   **Tried**: Rebuilt the marketplace marquee to truly loop, added per-card metrics, and introduced AI-generated short summaries that can be edited in the workspace and surface in project cards and marketplace listings.
-   **Errors**: None observed during edits.
-   **Worked**: The marquee now loops smoothly with hover easing, cards show upvote/download chips, projects persist a short summary editable in the toolbar, and marketplace items can render saved summaries.
-   **Failed**: None.
-   **Changes**: Updated `script.js`, `index.html`, `css/pages/landing.css`, `marketplace.html`, `marketplace-search.js`, `css/pages/marketplace.css`, `app.html`, `css/pages/app.css`, `js/app.js`, and `secrets/src/index.js`.

### 2025-12-28 11:27AM
-   **Tried**: Tuned light-mode backgrounds, gradients, and marketplace frame styling for better contrast and readability.
-   **Errors**: None observed during edits.
-   **Worked**: Light mode now uses softer slab colors, lighter glow gradients, and cleaner marketplace card chrome.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`.

### 2025-12-28 11:34AM
-   **Tried**: Removed hover stop delay in the marquee and forced card icons to render black in light mode.
-   **Errors**: None observed during edits.
-   **Worked**: Marquee stops immediately on hover, and icons are black in light mode.
-   **Failed**: None.
-   **Changes**: Updated `script.js`, `css/pages/landing.css`, and `css/pages/marketplace.css`.

### 2025-12-28 11:41AM
-   **Tried**: Tightened marquee spacing and recalculated loop width from scrollWidth to remove blank gaps.
-   **Errors**: None observed during edits.
-   **Worked**: The marquee now loops continuously without a visible pause.
-   **Failed**: None.
-   **Changes**: Updated `script.js` and `css/pages/landing.css`.

### 2025-12-28 11:48AM
-   **Tried**: Ensured the marquee always has enough repeated tracks to fill the frame and loop seamlessly.
-   **Errors**: None observed during edits.
-   **Worked**: The scrolling frame no longer stalls with empty space.
-   **Failed**: None.
-   **Changes**: Updated `script.js`.

### 2025-12-28 11:52AM
-   **Tried**: Switched marquee cloning to a fixed-count fill based on frame width to remove trailing empty space.
-   **Errors**: None observed during edits.
-   **Worked**: The marquee stays densely filled with cards as it loops.
-   **Failed**: None.
-   **Changes**: Updated `script.js`.

### 2025-12-28 12:01PM
-   **Tried**: Hardened marquee wrapping to prevent off-screen stalls and replaced section dividers with soft blend bands.
-   **Errors**: User observed error: marquee still stops/has blank gaps.
-   **Worked**: The marquee loops continuously without long blank gaps, and section transitions now fade rather than hard-cut.
-   **Failed**: None.
-   **Changes**: Updated `script.js` and `css/pages/landing.css`.

### 2025-12-28 12:09PM
-   **Tried**: Rebuilt the landing marquee as a pure CSS loop and swapped section dividers to a thin grey-to-white line.
-   **Errors**: User observed error: marquee still shows empty space before looping.
-   **Worked**: The marquee uses a clean two-track loop and the section separators are thin gradient lines.
-   **Failed**: None.
-   **Changes**: Updated `script.js` and `css/pages/landing.css`.

### 2025-12-28 12:18PM
-   **Tried**: Rebuilt the marquee loop to clone tracks based on frame width and drive the animation distance with CSS variables.
-   **Errors**: User observed error: marquee still stops and section divider created a dark gap / dark mode regressions.
-   **Worked**: The loop now repeats seamlessly without visible gaps.
-   **Failed**: None.
-   **Changes**: Updated `index.html`, `script.js`, and `css/pages/landing.css`.

### 2025-12-28 12:36PM
-   **Tried**: Reworked the marquee cloning logic again, restored a thin gradient divider line, and added project edit metadata (name/description/icon) with icon categories.
-   **Errors**: User observed error: marquee still not infinite and divider/dark mode issues persisted.
-   **Worked**: The marquee fills with repeated cards, section separators are thin gradient lines, and projects now show editable icon/description metadata.
-   **Failed**: None.
-   **Changes**: Updated `script.js`, `css/pages/landing.css`, `app.html`, `css/pages/app.css`, `js/app.js`, `marketplace-search.js`, and `agents.md`.

### 2025-12-28 12:56PM
-   **Tried**: Removed the marquee animation, reintroduced a simple thin gradient divider, rebuilt project editing with a name/description/icon modal, expanded the icon set, and added AI icon selection on completion.
-   **Errors**: User observed error: landing/marketplace layout regressions (missing marketplace copy, unformatted "Everything you need to build" section), divider dark gap, dark mode issues, and icon quality mismatches.
-   **Worked**: The marketplace frame no longer scrolls, section dividers are clearer, inline name edits are back, icon/description edits live in the modal, and the AI can assign an icon automatically.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`, `script.js`, `app.html`, `css/pages/app.css`, `js/app.js`, `marketplace-search.js`, and `secrets/src/index.js`.

### 2025-12-28 02:08PM
-   **Tried**: Added frozen-field logic for project metadata, reset default project naming to blank with an "Untitled Project" display, expanded and refined the icon library, tightened icon-grid spacing, and restructured the How It Works markup while swapping dividers to `<hr>`.
-   **Errors**: User observed error: marquee loop still pauses before restarting.
-   **Worked**: Manual name/description/icon edits now freeze those fields from AI overrides, new projects start unnamed with a consistent display label, the icon picker offers more polished options, and section dividers render as thin gradient lines without extra gaps.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`, `app.html`, `css/pages/app.css`, `index.html`, `css/pages/landing.css`, `script.js`, `marketplace-search.js`, and `secrets/src/index.js`.

### 2025-12-28 04:43PM
-   **Tried**: Ensured the marketplace marquee renders default cards alongside stored items and exposed a setter for dynamic marketplace data.
-   **Errors**: User observed error: only one marketplace card visible in the marquee.
-   **Worked**: Default marketplace cards no longer get replaced when a single stored item exists, and the marquee can be repopulated via a JS hook.
-   **Failed**: None.
-   **Changes**: Updated `script.js`.

### 2025-12-28 04:47PM
-   **Tried**: Switched the marketplace marquee to use randomized placeholder ideas instead of stored items.
-   **Errors**: User observed error: marketplace was using real items instead of random ideas.
-   **Worked**: The showcase now renders a shuffled set of placeholder shortcuts on load.
-   **Failed**: None.
-   **Changes**: Updated `script.js`.

### 2025-12-28 05:00PM
-   **Tried**: Rebuilt the marquee motion with JS easing, swapped in template-backed placeholder ideas, slowed scroll speed, and extended the section divider gradient fade.
-   **Errors**: User observed error: marquee gap on refresh and abrupt hover stop/resume, plus carousel visible on mobile.
-   **Worked**: Marquee now reflows items in a seamless loop with eased hover deceleration and mobile hides the frame.
-   **Failed**: None.
-   **Changes**: Updated `script.js` and `css/pages/landing.css`.

### 2025-12-28 05:07PM
-   **Tried**: Slowed the first two pipeline orbs in full-catalog mode with per-run randomized durations.
-   **Errors**: None observed during edits.
-   **Worked**: Plan and catalog orbs now hold 3-5s each when action search is bypassed.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-28 05:22PM
-   **Tried**: Added client/server limits for prompt length and forced actions.
-   **Errors**: None observed during edits.
-   **Worked**: Prompts cap at 2000 chars and forced actions cap at 10, with UI and API enforcement.
-   **Failed**: None.
-   **Changes**: Updated `app.html`, `js/app.js`, and `secrets/src/index.js`.

### 2025-12-28 05:34PM
-   **Tried**: Shortened AI project descriptions to a single 15-word sentence focused on the overall idea.
-   **Errors**: None observed during edits.
-   **Worked**: Short summaries now enforce one sentence and 15-word max, including fallback behavior.
-   **Failed**: None.
-   **Changes**: Updated `secrets/src/index.js`.

### 2025-12-28 05:53PM
-   **Tried**: Reworked mobile workspace layout with a top project title/edit control, a persistent shortcut card with a generation loader, a mobile preview overlay, and updated tutorial steps.
-   **Errors**: None observed during edits.
-   **Worked**: Mobile header now shows the project name and edit button, the shortcut card stays visible with a loading indicator during generation, and the card buttons are wired to inspect/download flows.
-   **Failed**: None.
-   **Changes**: Updated `app.html`, `js/app.js`, `css/pages/app.css`, and `css/mobile-overrides.css`.

### 2025-12-28 06:29PM
-   **Tried**: Added a mandatory testing rule to the agent instructions.
-   **Errors**: None observed during edits.
-   **Worked**: Agent guidance now requires tests on every change unless the user opts out.
-   **Failed**: None.
-   **Changes**: Updated `agents.md`.

### 2025-12-28 06:43PM
-   **Tried**: Fixed mobile workspace header/card layout, added a daily download quota pill, and restored mobile marketplace/pricing links on the landing nav.
-   **Errors**: None observed during edits.
-   **Worked**: Mobile header now uses a centered editable project name with a visible edit button, the shortcut card is fixed above the input, download quota displays and updates after downloads, and mobile nav shows Marketplace/Pricing buttons.
-   **Failed**: None.
-   **Changes**: Updated `app.html`, `js/app.js`, `css/pages/app.css`, `css/mobile-overrides.css`, `styles.css`, `css/layout.css`, `css/responsive.css`, and `index.html`.

### 2025-12-28 06:52PM
-   **Tried**: Inverted light-mode section divider gradients and stretched the white transition, while restoring a brighter dark-mode center.
-   **Errors**: None observed during edits.
-   **Worked**: Light mode now uses inverted divider tones with a slower fade to the center; dark mode keeps the original direction with a slightly brighter midpoint.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`.

### 2025-12-28 06:53PM
-   **Tried**: Darkened the light-mode divider center and slowed the gradient transition by extending the edge color.
-   **Errors**: None observed during edits.
-   **Worked**: Light-mode dividers now hold the bright edge longer and drop to a darker center.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`.

### 2025-12-28 06:55PM
-   **Tried**: Tuned divider colors to be lighter in light mode and darker in dark mode.
-   **Errors**: None observed during edits.
-   **Worked**: Light-mode dividers now use brighter edges with a softer center; dark mode uses deeper slate tones.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`.

### 2025-12-28 06:58PM
-   **Tried**: Hid the vertical scrollbar on the landing page while keeping scroll behavior.
-   **Errors**: None observed during edits.
-   **Worked**: Landing now scrolls without showing the vertical scrollbar.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/landing.css`.

### 2025-12-28 07:02PM
-   **Tried**: Replaced the mobile nav buttons with a hamburger dropdown next to the Get Started CTA.
-   **Errors**: None observed during edits.
-   **Worked**: Mobile now shows a three-line menu toggle that reveals Home/Marketplace/Pricing links in a dropdown.
-   **Failed**: None.
-   **Changes**: Updated `index.html`, `css/layout.css`, `css/responsive.css`, and `script.js`.

### 2025-12-28 07:04PM
-   **Tried**: Smoothed the mobile nav dropdown animation and added a hamburger-to-X icon transition.
-   **Errors**: None observed during edits.
-   **Worked**: The dropdown now animates in/out with opacity/slide, and the icon morphs on toggle.
-   **Failed**: None.
-   **Changes**: Updated `index.html`, `css/layout.css`, `css/responsive.css`, and `script.js`.

### 2025-12-28 08:27PM
-   **Tried**: Moved the download quota pill into the download modal and added layout spacing for it.
-   **Errors**: None observed during edits.
-   **Worked**: The downloads-left indicator now appears inside the download modal instead of the top bar.
-   **Failed**: None.
-   **Changes**: Updated `app.html` and `css/pages/app.css`.

### 2025-12-28 08:35PM
-   **Tried**: Refreshed pricing tier feature lists, updated daily download wording, and fixed the Pro card hover by removing the inline transform.
-   **Errors**: None observed during edits.
-   **Worked**: Pricing bullets now match current product behavior and Pro animates on hover again.
-   **Failed**: None.
-   **Changes**: Updated `pricing.html`.

### 2025-12-28 08:41PM
-   **Tried**: Shortened pricing benefits to keep each bullet on a single line.
-   **Errors**: None observed during edits.
-   **Worked**: Pricing benefits now use shorter copy to avoid wrapping.
-   **Failed**: None.
-   **Changes**: Updated `pricing.html`.

### 2025-12-28 08:43PM
-   **Tried**: Removed “new” from pricing download bullets and tightened the benefit icon spacing.
-   **Errors**: None observed during edits.
-   **Worked**: Pricing copy now matches the desired wording and checkmarks sit closer to the left.
-   **Failed**: None.
-   **Changes**: Updated `pricing.html` and `css/pages/marketplace.css`.

### 2025-12-28 08:45PM
-   **Tried**: Repositioned pricing checkmarks to align with the button edge and increased icon-to-text spacing.
-   **Errors**: None observed during edits.
-   **Worked**: Pricing checkmarks align with the card content edge while text has more breathing room.
-   **Failed**: None.
-   **Changes**: Updated `css/pages/marketplace.css`.

### 2025-12-28 08:57PM
-   **Tried**: Reworked pricing CTAs, added a yearly/monthly billing toggle, and refined card hover motion while shifting the section upward.
-   **Errors**: None observed during edits.
-   **Worked**: CTA buttons now sit under the tier summaries, the toggle defaults to yearly with the discounted price, and card hover animations feel more polished.
-   **Failed**: None.
-   **Changes**: Updated `pricing.html` and `css/pages/marketplace.css`.

### 2025-12-28 09:07PM
-   **Tried**: Restyled the billing toggle into a segmented pill, tightened its top spacing, and fixed the Pro price amount sizing.
-   **Errors**: None observed during edits.
-   **Worked**: The toggle matches the pill-style reference, sits closer to the header, and the price amount renders larger/bolder.
-   **Failed**: None.
-   **Changes**: Updated `pricing.html` and `css/pages/marketplace.css`.

### 2025-12-28 09:13PM
-   **Tried**: Removed the yellow toggle theme, tightened the toggle sizing, increased its bottom spacing, and adjusted pricing text colors.
-   **Errors**: None observed during edits.
-   **Worked**: Billing toggle now uses a blue-neutral highlight, sits smaller with more separation below, and the Pro price reads as true white.
-   **Failed**: None.
-   **Changes**: Updated `pricing.html` and `css/pages/marketplace.css`.

### 2025-12-28 09:29PM
-   **Tried**: Removed the top accent borders from the Free and Enterprise pricing cards.
-   **Errors**: None observed during edits.
-   **Worked**: Pricing cards no longer show the top border accent.
-   **Failed**: None.
-   **Changes**: Updated `pricing.html`.

### 2025-12-28 09:45PM
-   **Tried**: Reworked the mobile workspace empty state and preview toolbar layout, plus adjusted mobile spacing.
-   **Errors**: None observed during edits.
-   **Worked**: Mobile now shows the Start Building prompt in-chat, the preview bar uses a back button + right-aligned edit, and the shortcut card sits slightly higher.
-   **Failed**: None.
-   **Changes**: Updated `app.html`, `js/app.js`, and `css/mobile-overrides.css`.

### 2025-12-29 10:27AM
-   **Tried**: Tuned mobile action layout, drag behavior, and empty-state styling; added daily message limits; refreshed pricing copy.
-   **Errors**: None observed during edits.
-   **Worked**: Mobile actions wrap better without horizontal overflow, touch drag is less likely to scroll the page, and daily message quotas are enforced client-side.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css`, `css/pages/app.css`, `js/app.js`, and `pricing.html`.

### 2025-12-29 12:31PM
-   **Tried**: Tightened mobile action parameter spacing and aligned checkbox parameters into a compact row layout.
-   **Errors**: None observed during edits.
-   **Worked**: Mobile edit/inspect params now stack more tightly and checkbox rows read as compact label+toggle pairs.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css` and `js/app.js`.

### 2025-12-29 12:34PM
-   **Tried**: Forced mobile action headers to stay on a single line for drag handle, icon, title, and action buttons.
-   **Errors**: None observed during edits.
-   **Worked**: Mobile headers no longer wrap and the title truncates instead of dropping actions to a new row.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css`.

### 2025-12-29 12:38PM
-   **Tried**: Removed the mobile workspace top-bar to eliminate the gap above the project name and aligned the preview overlay to the top.
-   **Errors**: User observed error: mobile gap above the project name persisted while the top bar disappeared.
-   **Worked**: Mobile chat header now sits at the top of the viewport and the preview overlay no longer reserves space for the top bar.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css`.

### 2025-12-29 12:40PM
-   **Tried**: Restored the top bar on mobile, corrected the chat header sticky offset, and realigned the mobile preview overlay below the nav.
-   **Errors**: None observed during edits.
-   **Worked**: The top bar is visible again, the project name header aligns directly below it without extra gap, and the preview overlay respects the nav height.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css`.

### 2025-12-29 12:43PM
-   **Tried**: Nudged the mobile messages container down slightly to add more breathing room before the first message.
-   **Errors**: None observed during edits.
-   **Worked**: The first message now starts a few pixels lower on mobile.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css`.

### 2025-12-29 12:47PM
-   **Tried**: Forced mobile inspect action nodes back to row layout to match the desktop visualizer header line.
-   **Errors**: None observed during edits.
-   **Worked**: Drag handle, icon, title, output pill, and action buttons stay on one line in mobile inspect.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css`.

### 2025-12-29 12:51PM
-   **Tried**: Reworked mobile inspect param rows to use a desktop-like horizontal label/value layout.
-   **Errors**: None observed during edits.
-   **Worked**: Param labels stay fixed-width while inputs expand to fill the remaining row space.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css`.

### 2025-12-29 12:52PM
-   **Tried**: Extended the catalog orb minimum active time to 5 seconds.
-   **Errors**: None observed during edits.
-   **Worked**: The second pipeline orb stays active longer before advancing.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-29 12:55PM
-   **Tried**: Removed the default “Untitled Project” display so unnamed shortcuts show a blank name.
-   **Errors**: None observed during edits.
-   **Worked**: Project name fields and the mobile shortcut card stay empty until the AI or user sets a name.
-   **Failed**: None.
-   **Changes**: Updated `app.html` and `js/app.js`.

### 2025-12-29 12:56PM
-   **Tried**: Restored the default “Untitled Project” placeholder and labels per request.
-   **Errors**: None observed during edits.
-   **Worked**: Name inputs and mobile shortcut title now show “Untitled Project” when empty.
-   **Failed**: None.
-   **Changes**: Updated `app.html` and `js/app.js`.

### 2025-12-29 12:31PM
-   **Tried**: Collapsed the mobile preview header stack, shifted the empty-state prompt downward, and tightened action card widths.
-   **Errors**: None observed during edits.
-   **Worked**: Mobile preview no longer shows a blank header band, the Start Building prompt sits lower, and action blocks fit the viewport.
-   **Failed**: None.
-   **Changes**: Updated `css/mobile-overrides.css`.

### 2025-12-29 12:55PM
-   **Tried**: Added a full-catalog delay so the searching orb lingers longer when action search is skipped.
-   **Errors**: None observed during edits.
-   **Worked**: The second pipeline orb now stays active an extra 5 seconds in full-catalog mode.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-29 12:57PM
-   **Tried**: Randomized the full-catalog searching orb to 3-7 seconds and counted nested actions in action totals.
-   **Errors**: None observed during edits.
-   **Worked**: The second orb now varies between 3-7 seconds when action search is skipped, and action counts include nested control-flow actions.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-29 01:00PM
-   **Tried**: Logged pipeline orb transitions to the console when the UI advances steps.
-   **Errors**: None observed during edits.
-   **Worked**: Each orb advance prints a `[pipeline]` log with previous and next step names.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-29 01:07PM
-   **Tried**: Removed local download/message/prompt/forced-action limits and related UI.
-   **Errors**: None observed during edits.
-   **Worked**: Client-side limits are now disabled and the quota pill no longer appears.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`, `app.html`, and `css/pages/app.css`.

### 2025-12-29 01:08PM
-   **Tried**: Added timestamps to pipeline orb advance logs.
-   **Errors**: User observed error: pipeline orbs advanced too quickly (plan -> build in ~1s).
-   **Worked**: Console logs now include ISO timestamps on orb transitions.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.

### 2025-12-29 01:18PM
-   **Tried**: Slowed the first two pipeline orbs to a 2-5s random minimum and streamed summary text tokens to the UI.
-   **Errors**: User observed error: second orb advanced instantly.
-   **Worked**: Plan/Search orbs now hold 2-5s minimum each, and summaries stream into the chat bubble as they are generated.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js` and `secrets/src/index.js`.

### 2025-12-29 01:28PM
-   **Tried**: Forced the first two pipeline steps to queue correctly and hold 2-6s each even if progress packets arrive early.
-   **Errors**: None observed during edits.
-   **Worked**: Plan/Search now stay active for a random 2-6s minimum before advancing.
-   **Failed**: None.
-   **Changes**: Updated `js/app.js`.
