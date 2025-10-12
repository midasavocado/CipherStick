(() => {
  // ---------- Public API ----------
  // window.Conversion.toPlist({ name, text })     -> auto-detect JSON or DSL from the text box
  // window.Conversion.toPlistFromJSON({ name, program })
  // window.Conversion.toPlistFromDSL({ name, dsl })

  const Conversion = {};
  window.Conversion = Conversion;

  // --- Utilities ---
  const XML = {
    esc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },
    bool(b) { return b ? '<true/>' : '<false/>'; },
    int(n)  { return `<integer>${n|0}</integer>`; },
    num(n)  { return Number.isInteger(n) ? XML.int(n) : `<real>${String(n)}</real>`; },
    str(s)  { return `<string>${XML.esc(s)}</string>`; },
    dict(obj) {
      return `<dict>${
        Object.entries(obj).map(([k,v]) => `<key>${XML.esc(k)}</key>${v}`).join('')
      }</dict>`;
    },
    array(items) {
      return `<array>${items.join('')}</array>`;
    }
  };

  // --- Error helpers ---
  class ConvError extends Error {
    constructor(message, detail) { super(message); this.detail = detail; }
  }
  function fail(msg, detail){ throw new ConvError(msg, detail); }

  // --- Input normalization / detection ---
  function stripCodeFences(s){
    // remove ```json ... ``` or ``` ... ```
    return s.replace(/^\s*```[a-z]*\s*|\s*```\s*$/gi, '');
  }
  function stripBOM(s){ return s.replace(/^\uFEFF/, ''); }
  function unsmartQuotes(s){
    return s
      .replace(/[“”]/g,'"')
      .replace(/[‘’]/g,"'");
  }
  function removeTrailingCommas(s){
    // remove JSON trailing commas in objects/arrays
    return s
      .replace(/,\s*([}\]])/g, '$1');
  }

  function looksLikeJSON(s){
    const t = s.trim();
    return t.startsWith('{') || t.startsWith('[');
  }

  function tryParseJSON(text){
    const cleaned = removeTrailingCommas(unsmartQuotes(stripBOM(stripCodeFences(text))));
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      fail('Invalid JSON program', { error: String(e), preview: cleaned.slice(0, 400) });
    }
  }

  // --- Public orchestrator: auto-detect JSON or DSL from textarea text ---
  Conversion.toPlist = ({ name, text }) => {
    const safeName = (name || 'My Shortcut').trim() || 'My Shortcut';
    if (!text || !text.trim()) fail('Nothing to convert');

    if (looksLikeJSON(text)) {
      const program = tryParseJSON(text);
      return Conversion.toPlistFromJSON({ name: safeName, program });
    } else {
      return Conversion.toPlistFromDSL({ name: safeName, dsl: text });
    }
  };

  // ---------- JSON → PLIST ----------
  // Program schema (relaxed):
  // { name?: string, actions: Array<Action> }
  // Action can be:
  //   - string (no params), e.g. "Vibrate"
  //   - { action: "Openurl", params?: {...} }
  //   - Repeat: { action: "Repeat", params: { Count: NUMBER }, do: [Action,...] }
  //   - If: { action: "If", params: { Condition: STRING }, then: [...], else?: [...] }
  Conversion.toPlistFromJSON = ({ name, program }) => {
    if (!program || (typeof program !== 'object')) fail('Program must be an object');
    const wfName = program.name ? String(program.name) : name;
    const actions = Array.isArray(program.actions) ? program.actions : fail('Program missing "actions" array');

    const plistActions = buildActionsArrayFromJSON(actions);

    const plist =
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowName</key>
  ${XML.str(wfName)}
  <key>WFWorkflowActions</key>
  ${XML.array(plistActions)}
</dict>
</plist>`;

    return plist;
  };

  function buildActionsArrayFromJSON(list){
    const out = [];
    for (const item of list) {
      // No-param string shorthand
      if (typeof item === 'string') {
        out.push(buildOneAction({ action: item }));
        continue;
      }
      if (!item || typeof item !== 'object') {
        out.push(comment(`Unrecognized action item: ${JSON.stringify(item).slice(0,200)}`));
        continue;
      }
      const kind = (item.action || '').trim();

      if (!kind) {
        out.push(comment(`Missing "action" in ${JSON.stringify(item).slice(0,200)}`));
        continue;
      }

      // Control Flow: Repeat
      if (eq(kind,'Repeat')) {
        const count = getNumber(item.params?.Count, 1_000_000);
        // Start repeat
        out.push(repeatStart(count));
        // Body
        if (Array.isArray(item.do)) {
          out.push(...buildActionsArrayFromJSON(item.do));
        } else {
          out.push(comment('Repeat has no "do" array'));
        }
        // End repeat
        out.push(repeatEnd());
        continue;
      }

      // Control Flow: If
      if (eq(kind,'If')) {
        const condText = normalizeCondition(item.params?.Condition || '');
        // IF start (with condition string preserved in comment so user can see)
        out.push(ifStart(condText));
        // THEN
        if (Array.isArray(item.then)) {
          out.push(...buildActionsArrayFromJSON(item.then));
        } else {
          out.push(comment('If has no "then" array'));
        }
        // ELSE (optional)
        out.push(ifElse());
        if (Array.isArray(item.else)) {
          out.push(...buildActionsArrayFromJSON(item.else));
        } else {
          // leave empty ELSE (Shortcuts allows it)
        }
        // END IF
        out.push(ifEnd());
        continue;
      }

      // Normal action
      out.push(buildOneAction({ action: kind, params: item.params || {} }));
    }
    return out;
  }

  // ---------- DSL → PLIST ----------
  // DSL rules (relaxed):
  // Top-level actions: no leading dash
  // Inside If/Repeat blocks: use "- " to denote nested actions
  // Actions with params:
  //   Openurl:
  //     Input: "https://..."
  // No-params action can be one bare word: Vibrate
  Conversion.toPlistFromDSL = ({ name, dsl }) => {
    const lines = dsl.split(/\r?\n/);
    const ctx = { i:0, lines };
    const ast = parseBlock(ctx, 0, /*inFlow*/ false);

    const plistActions = buildActionsArrayFromJSON(ast);
    const plist =
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowName</key>
  ${XML.str(name)}
  <key>WFWorkflowActions</key>
  ${XML.array(plistActions)}
</dict>
</plist>`;

    return plist;
  };

  // --- DSL Parser (produces the same JSON Action structure we accept above) ---
  function parseBlock(ctx, indentLevel, inFlow) {
    const list = [];
    while (ctx.i < ctx.lines.length) {
      let raw = ctx.lines[ctx.i];
      const line = raw.replace(/\t/g,'    ');
      ctx.i++;

      // Skip blanks / comments
      if (!line.trim() || line.trim().startsWith('#')) continue;

      // Determine current depth and whether it's a nested bullet
      const m = line.match(/^(\s*)(-?\s*)(.*)$/);
      const indent = (m && m[1]) ? m[1].length : 0;
      const bullet = (m && m[2]) ? m[2].includes('-') : false;
      const content = (m && m[3]) ? m[3].trim() : line.trim();

      // If we’re in a flow block and indentation decreases -> end block
      if (inFlow && indent < indentLevel) {
        ctx.i--; // step back for outer loop
        break;
      }

      // "Repeat:" block
      if (/^Repeat\s*:$/i.test(content)) {
        const blockParams = parseParams(ctx, indent + 2);
        const body = parseBlock(ctx, indent + 2, true);
        const count = getNumber(blockParams.Count, 1_000_000);
        list.push({ action: 'Repeat', params: { Count: count }, do: body });
        continue;
      }

      // "If:" block
      if (/^If\s*:$/i.test(content)) {
        const blockParams = parseParams(ctx, indent + 2);
        const thenBody = parseBlock(ctx, indent + 2, true);

        // Optional "Else:" at same indent
        let elseBody = [];
        if (peekIsElse(ctx, indent)) {
          ctx.i++; // consume Else:
          elseBody = parseBlock(ctx, indent + 2, true);
        }
        list.push({ action: 'If', params: { Condition: String(blockParams.Condition || '') }, then: thenBody, else: elseBody });
        continue;
      }

      // No-params bare action (e.g., "Vibrate")
      if (!content.includes(':')) {
        list.push({ action: content });
        continue;
      }

      // Regular action header "Openurl:" + params indented below
      const head = content.replace(/:\s*$/,'');
      const params = parseParams(ctx, indent + 2);
      list.push({ action: head, params });
    }
    return list;
  }

  function parseParams(ctx, expectIndent){
    const out = {};
    while (ctx.i < ctx.lines.length) {
      const raw = ctx.lines[ctx.i];
      const line = raw.replace(/\t/g,'    ');
      const m = line.match(/^(\s*)(.*)$/);
      const indent = (m && m[1]) ? m[1].length : 0;
      const rest   = (m && m[2]) ? m[2].trim() : '';
      if (!rest) { ctx.i++; continue; }
      if (indent < expectIndent) break;
      if (/^Else\s*:$/i.test(rest)) break; // handled by caller

      if (/^[-]/.test(rest)) break; // nested action starts; params end

      // Parse "Key: value"
      const kv = rest.match(/^([^:]+):\s*(.*)$/);
      if (!kv) break;
      const key = kv[1].trim();
      let val = kv[2].trim();

      // Strip quotes around strings
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      // Parse booleans/numbers if they look like them
      if (/^(true|false)$/i.test(val)) {
        out[key] = /^true$/i.test(val);
      } else if (/^-?\d+(\.\d+)?$/.test(val)) {
        out[key] = Number(val);
      } else {
        out[key] = val; // keep as string, may include {{VARIABLE}}
      }

      ctx.i++;
    }
    return out;
  }

  function peekIsElse(ctx, indentAtIf){
    if (ctx.i >= ctx.lines.length) return false;
    const raw = ctx.lines[ctx.i];
    const line = raw.replace(/\t/g,'    ');
    const m = line.match(/^(\s*)(.*)$/);
    const indent = (m && m[1]) ? m[1].length : 0;
    const rest = (m && m[2]) ? m[2].trim() : '';
    return indent === indentAtIf && /^Else\s*:$/i.test(rest);
  }

  // ---------- Action builders ----------
  // Minimal mapping for some common actions. Unrecognized -> comment.
  const ACTION_IDS = {
    // common
    'Openurl': 'is.workflow.actions.openurls',
    'Open URL': 'is.workflow.actions.openurls',
    'Speaktext': 'is.workflow.actions.speaktext',
    'Speak Text': 'is.workflow.actions.speaktext',
    'Showresult': 'is.workflow.actions.showresult',
    'Show Result': 'is.workflow.actions.showresult',
    'Askforinput': 'is.workflow.actions.ask',
    'Ask for Input': 'is.workflow.actions.ask',
    'Vibrate': 'is.workflow.actions.vibrate',
    'Vibrate Device': 'is.workflow.actions.vibrate',
    // control flow identifiers
    '__IF__': 'is.workflow.actions.conditional',
    '__REPEAT_COUNT__': 'is.workflow.actions.repeatcount',
  };

  function eq(a,b){ return String(a||'').trim().toLowerCase() === String(b||'').trim().toLowerCase(); }

  function buildOneAction({ action, params = {} }) {
    const id = ACTION_IDS[action] || ACTION_IDS[normalizeKey(action)] || null;
    if (!id) {
      // Fallback to a visible Comment so user can correct quickly
      return comment(`Unmapped action: ${action}\nParams: ${safePreview(params)}`);
    }

    // Handle "no params" actions (e.g., Vibrate)
    if (!params || Object.keys(params).length === 0) {
      return XML.dict({
        'WFWorkflowActionIdentifier': XML.str(id),
        'WFWorkflowActionParameters': XML.dict({})
      });
    }

    // Convert flat params to plist param dict
    const wfParams = {};
    for (const [k,v] of Object.entries(params)) {
      wfParams[normalizeParamKey(k)] = wrapParamValue(v);
    }

    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str(id),
      'WFWorkflowActionParameters': XML.dict(wfParams)
    });
  }

  function normalizeKey(k){
    return String(k||'').replace(/\s+/g,'').toLowerCase();
  }
  function normalizeParamKey(k){
    return String(k||'').trim();
  }
  function safePreview(v){
    try { return JSON.stringify(v, null, 2).slice(0, 400); } catch { return String(v); }
  }

  function wrapParamValue(v){
    // Booleans
    if (typeof v === 'boolean') return XML.bool(v);
    // Numbers
    if (typeof v === 'number' && Number.isFinite(v)) return XML.num(v);
    // JSON-y objects or arrays -> store as string (simple)
    if (v && typeof v === 'object') return XML.str(JSON.stringify(v));
    // Everything else as string (supports {{VARIABLE}})
    return XML.str(String(v));
  }

  // ---------- Control flow builders ----------
  function comment(text){
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str('is.workflow.actions.comment'),
      'WFWorkflowActionParameters': XML.dict({
        'WFCommentActionText': XML.str(String(text))
      })
    });
  }

  // Repeat Count
  function repeatStart(count){
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str(ACTION_IDS.__REPEAT_COUNT__),
      'WFWorkflowActionParameters': XML.dict({
        'WFRepeatCount': XML.num(count),
        // Some Shortcuts builds don’t require explicit mode at Start; keep clean.
      })
    });
  }
  function repeatEnd(){
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str(ACTION_IDS.__REPEAT_COUNT__),
      'WFWorkflowActionParameters': XML.dict({
        'WFControlFlowMode': XML.int(1) // 1 == End
      })
    });
  }

  // If blocks
  function ifStart(conditionText){
    // We keep the human-readable condition in a Comment immediately before the IF marker
    // so the user sees what was intended even if the internal structure differs.
    // (Advanced: you can parse conditionText into WF condition fields later.)
    const note = comment(`IF condition: ${conditionText || '(none)'}`);
    const marker = XML.dict({
      'WFWorkflowActionIdentifier': XML.str(ACTION_IDS.__IF__),
      'WFWorkflowActionParameters': XML.dict({
        // Some builds store the condition payload here; we leave it empty for max compatibility.
      })
    });
    return XML.array([note, marker]); // Flatten by caller
  }
  function ifElse(){
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str(ACTION_IDS.__IF__),
      'WFWorkflowActionParameters': XML.dict({
        'WFControlFlowMode': XML.int(1) // 1 == Else
      })
    });
  }
  function ifEnd(){
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str(ACTION_IDS.__IF__),
      'WFWorkflowActionParameters': XML.dict({
        'WFControlFlowMode': XML.int(2) // 2 == End If
      })
    });
  }

  // normalize IF condition text into the style you want to display / keep
  function normalizeCondition(s){
    const t = String(s||'').trim();
    if (!t) return '';
    // Allow: "{{VAR}} is 3", "{{VAR}} is not 0", "has any value", etc.
    return t
      .replace(/\s+/g,' ')
      .replace(/\{\{\s*/g,'{{')
      .replace(/\s*\}\}/g,'}}');
  }

  function getNumber(v, def=0){
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return def;
  }

})();