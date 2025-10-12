(() => {
  // -------------------------------------------
  // Conversion.js — JSON/DSL → Shortcuts PLIST
  // Uses Conversions/ index + files for action dicts
  // -------------------------------------------

  const Conversion = {};
  window.Conversion = Conversion;

  // ---- Config (override from HTML if you want) ----
  const CONV_BASE =
    (window.CONVERSIONS_BASE?.replace(/\/+$/, '') ||
      'https://cipherstick.tech/AI-Shortcuts/Conversions');
  const CONV_INDEX_URL = `${CONV_BASE}/index.json`;

  // ---- State / caches ----
  const convIndexCache = { list: null, at: 0 };
  const convFileCache = new Map(); // filename -> string <dict>...</dict>
  const actionLookupCache = new Map(); // normalized action -> filename

  // ---- XML helpers ----
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
    int(n)  { return `<integer>${(n|0)}</integer>`; },
    num(n)  { return Number.isInteger(n) ? XML.int(n) : `<real>${String(n)}</real>`; },
    str(s)  { return `<string>${XML.esc(String(s))}</string>`; },
    dict(obj) {
      return `<dict>${Object.entries(obj)
        .map(([k,v]) => `<key>${XML.esc(k)}</key>${v}`).join('')}</dict>`;
    },
    array(items) {
      return `<array>${items.join('')}</array>`;
    }
  };

  // ---- Errors ----
  class ConvError extends Error {
    constructor(message, detail) { super(message); this.detail = detail; }
  }
  const fail = (msg, detail) => { throw new ConvError(msg, detail); };

  // ---- Small utils ----
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const normalizeName = (s) =>
    String(s || '')
      .replace(/\.(txt|json|plist)$/i, '')
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9._-]/gi, '')
      .toLowerCase();

  const looksLikeJSON = (s) => /^\s*[\[{]/.test(String(s || ''));

  function stripCodeFences(s){
    return String(s || '').replace(/^\s*```[a-z]*\s*|\s*```\s*$/gi, '');
  }

  // ---- HTTP helpers ----
  async function fetchText(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) fail(`Fetch failed ${r.status} for ${url}`);
    return await r.text();
  }
  async function fetchJSON(url){
    const t = await fetchText(url);
    try { return JSON.parse(t); }
    catch (e){ fail('Bad JSON from '+url, { error: String(e), preview: t.slice(0,400) }); }
  }

  // ---- Conversions library loading ----
  async function ensureConvIndex() {
    if (convIndexCache.list && (Date.now() - convIndexCache.at) < 60_000) return convIndexCache.list;
    const idx = await fetchJSON(CONV_INDEX_URL);
    if (!idx || !Array.isArray(idx.files)) {
      fail('Conversions index.json malformed', { example: idx?.files?.slice?.(0,10) });
    }
    convIndexCache.list = idx.files.map(String);
    convIndexCache.at = Date.now();
    return convIndexCache.list;
  }

  async function loadConvFile(filename) {
    if (convFileCache.has(filename)) return convFileCache.get(filename);
    const url = `${CONV_BASE}/${encodeURIComponent(filename)}`;
    const txt = await fetchText(url);
    convFileCache.set(filename, txt);
    return txt;
  }

  // ---- Fuzzy filename lookup by action name ----
  async function lookupConversionFileForAction(actionName) {
    const key = normalizeName(actionName);
    if (actionLookupCache.has(key)) return actionLookupCache.get(key);

    const list = await ensureConvIndex();
    // Strategy: prefer exact base-name match (normalized), else contains, else prefix
    const scored = [];
    for (const f of list) {
      const base = f.replace(/\.(txt|json|plist)$/i,'');
      const norm = normalizeName(base);
      let score = 0;
      if (norm === key) score += 100;
      if (norm.startsWith(key)) score += 20;
      if (norm.includes(key)) score += 10;
      // small boost if same folder-ish subpath token
      const keyParts = key.split('.');
      for (const p of keyParts) if (p && norm.includes(p)) score += 1;
      if (score > 0) scored.push({ f, score });
    }
    scored.sort((a,b) => b.score - a.score);
    const best = scored[0]?.f || null;
    actionLookupCache.set(key, best);
    return best;
  }

  // ---- Placeholder substitution ----
  // Supported placeholders inside conversion dicts:
  //   {{STRING:Key}}   -> <string>escaped</string>
  //   {{NUMBER:Key}}   -> <integer> / <real>
  //   {{BOOLEAN:Key}}  -> <true/> / <false/>
  //   {{VARIABLE:Key}} -> <string>{{VariableName}}</string>  (left literal)
  //   {{RAW:Key}}      -> inserted as-is (use carefully; e.g., nested <dict>…)
  //   {{UUID}}         -> generated UUID v4
  //
  // Also supports simple {{Key}} -> string (fallback)
  function substitutePlaceholders(dictXML, params = {}) {
    let out = String(dictXML);

    // UUIDs
    out = out.replace(/\{\{UUID\}\}/g, () => genUUID());

    // Typed placeholders
    out = out.replace(/\{\{(STRING|NUMBER|BOOLEAN|VARIABLE|RAW):\s*([A-Za-z0-9_.-]+)\s*\}\}/g,
      (_m, type, keyRaw) => {
        const key = String(keyRaw);
        const v = params[key];
        switch (type) {
          case 'STRING':   return XML.str(v ?? '');
          case 'NUMBER':   return (typeof v === 'number') ? XML.num(v) : XML.num(Number(v||0));
          case 'BOOLEAN':  return XML.bool(Boolean(v));
          case 'VARIABLE': return XML.str(v ?? '{{' + key + '}}'); // keep literal tokens if not provided
          case 'RAW':      return String(v ?? '');
          default:         return XML.str(String(v ?? ''));
        }
      });

    // Simple {{Key}}
    out = out.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_m, key) => {
      const v = params[key];
      if (typeof v === 'boolean') return XML.bool(v);
      if (typeof v === 'number')  return XML.num(v);
      if (v == null) return XML.str('');
      return XML.str(v);
    });

    return out;
  }

  function genUUID(){
    // RFC 4122 v4
    const a = crypto.getRandomValues(new Uint8Array(16));
    a[6] = (a[6] & 0x0f) | 0x40;
    a[8] = (a[8] & 0x3f) | 0x80;
    const h = [...a].map(b => b.toString(16).padStart(2,'0'));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }

  // ---- Public entry points ----

  // Auto-detect JSON or DSL (we keep DSL support; JSON is primary)
  Conversion.toPlist = async ({ name, text }) => {
    const safeName = (name || 'My Shortcut').trim() || 'My Shortcut';
    if (!text || !text.trim()) fail('Nothing to convert');
    if (looksLikeJSON(text)) {
      const program = tryParseJSON(text);
      return await Conversion.toPlistFromJSON({ name: safeName, program });
    } else {
      const program = dslToProgramJSON(text);
      return await Conversion.toPlistFromJSON({ name: safeName, program });
    }
  };

  Conversion.toPlistFromJSON = async ({ name, program }) => {
    if (!program || typeof program !== 'object') fail('Program must be an object');
    const wfName = String(program.name || name || 'My Shortcut');
    const actions = Array.isArray(program.actions) ? program.actions : fail('Program missing "actions" array');

    const plistActions = await buildActionsArrayFromJSON(actions);

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

  // ---- JSON program structure helpers ----

  // Action can be:
  //  - string (no-params), e.g. "Vibrate"
  //  - { action:"Openurl", params:{...} }
  //  - Repeat: { action:"Repeat", params:{ Count }, do:[...] }
  //  - RepeatEach: { action:"RepeatEach", params:{ Items }, do:[...] }
  //  - If: { action:"If", params:{ Condition }, then:[...], else:[...] }
  async function buildActionsArrayFromJSON(list) {
    const out = [];
    for (const item of list) {
      if (typeof item === 'string') {
        out.push(await buildActionFromConversions(item, {}));
        continue;
      }
      if (!item || typeof item !== 'object') {
        out.push(comment(`Unrecognized action item: ${JSON.stringify(item).slice(0,200)}`));
        continue;
      }
      const kind = String(item.action || '').trim();
      if (!kind) {
        out.push(comment(`Missing "action" in ${JSON.stringify(item).slice(0,200)}`));
        continue;
      }

      // Control: Repeat (Count)
      if (eq(kind, 'Repeat')) {
        const count = getNumber(item.params?.Count, 1_000_000);
        out.push(repeatStartCount(count));
        if (Array.isArray(item.do)) out.push(...await buildActionsArrayFromJSON(item.do));
        else out.push(comment('Repeat has no "do" array'));
        out.push(repeatEnd());
        continue;
      }

      // Control: RepeatEach (for-each)
      if (eq(kind, 'RepeatEach') || eq(kind, 'Repeat With Each') || eq(kind, 'RepeatWithEach')) {
        const items = item.params?.Items ?? item.params?.List ?? '{{LIST}}';
        out.push(repeatEachStart(items));
        if (Array.isArray(item.do)) out.push(...await buildActionsArrayFromJSON(item.do));
        else out.push(comment('RepeatEach has no "do" array'));
        out.push(repeatEnd());
        continue;
      }

      // Control: If
      if (eq(kind, 'If')) {
        const cond = normalizeCondition(item.params?.Condition || '');
        // Optional: try to map to internal fields; for now we preserve human string as comment
        out.push(ifStart(cond));
        if (Array.isArray(item.then)) out.push(...await buildActionsArrayFromJSON(item.then));
        else out.push(comment('If has no "then" array'));
        out.push(ifElse());
        if (Array.isArray(item.else)) out.push(...await buildActionsArrayFromJSON(item.else));
        // else empty else is allowed
        out.push(ifEnd());
        continue;
      }

      // Regular action
      out.push(await buildActionFromConversions(kind, item.params || {}));
    }
    return out;
  }

  // ---- Build one action from Conversions/ dict template ----
  async function buildActionFromConversions(actionName, params) {
    // Find file
    const filename = await lookupConversionFileForAction(actionName);
    if (!filename) {
      // fallback comment so user sees problem
      return comment(`Unmapped action: ${actionName}\nParams: ${safePreview(params)}`);
    }
    // Load <dict>…</dict> snippet
    const dictXML = await loadConvFile(filename);

    // Substitutions
    const substituted = substitutePlaceholders(dictXML, params || {});

    // Ensure it *looks* like a dict (we won't attempt to validate fully)
    if (!/^\s*<dict>[\s\S]*<\/dict>\s*$/i.test(substituted)) {
      // Wrap if the file accidentally contains only inner content
      return `<dict>${substituted}</dict>`;
    }
    return substituted;
  }

  // ---- Control flow builders (IDs based on common Shortcuts internals) ----
  // Note: If markers: 'is.workflow.actions.conditional'
  //       Repeat count markers: 'is.workflow.actions.repeatcount'
  //       Repeat each markers:  'is.workflow.actions.repeat.each' (some builds use this identifier)
  const IDS = {
    IF: 'is.workflow.actions.conditional',
    REPEAT_COUNT: 'is.workflow.actions.repeatcount',
    REPEAT_EACH: 'is.workflow.actions.repeat.each', // if your library uses a different id, change here
  };

  function comment(text) {
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str('is.workflow.actions.comment'),
      'WFWorkflowActionParameters': XML.dict({
        'WFCommentActionText': XML.str(String(text))
      })
    });
  }
  function ifStart(humanCondText) {
    return XML.array([
      comment(`IF: ${humanCondText || '(none)'}`),
      XML.dict({
        'WFWorkflowActionIdentifier': XML.str(IDS.IF),
        'WFWorkflowActionParameters': XML.dict({ /* condition payload omitted*/ })
      })
    ]);
  }
  function ifElse() {
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str(IDS.IF),
      'WFWorkflowActionParameters': XML.dict({ 'WFControlFlowMode': XML.int(1) })
    });
  }
  function ifEnd() {
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str(IDS.IF),
      'WFWorkflowActionParameters': XML.dict({ 'WFControlFlowMode': XML.int(2) })
    });
  }

  function repeatStartCount(n) {
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str(IDS.REPEAT_COUNT),
      'WFWorkflowActionParameters': XML.dict({ 'WFRepeatCount': XML.num(n) })
    });
  }
  function repeatEachStart(itemsExpr) {
    // We add a helpful note, then the marker. Different Shortcuts builds vary in param naming;
    // many flows work with an empty marker and the runtime uses previous output as items.
    return XML.array([
      comment(`REPEAT EACH over: ${String(itemsExpr)}`),
      XML.dict({
        'WFWorkflowActionIdentifier': XML.str(IDS.REPEAT_EACH),
        'WFWorkflowActionParameters': XML.dict({
          // Optional: if your conversion needs an explicit field, add RAW or STRING param here.
          // 'WFItems': XML.str(String(itemsExpr))
        })
      })
    ]);
  }
  function repeatEnd() {
    return XML.dict({
      'WFWorkflowActionIdentifier': XML.str(IDS.REPEAT_COUNT),
      'WFWorkflowActionParameters': XML.dict({ 'WFControlFlowMode': XML.int(1) }) // 1 == End
    });
  }

  // ---- Condition normalization (human-display only; internal fields omitted) ----
  function normalizeCondition(s) {
    const t = String(s||'').trim()
      .replace(/\s+/g,' ')
      .replace(/\{\{\s*/g,'{{')
      .replace(/\s*\}\}/g,'}}');
    // Expected shapes, e.g.:
    // "{{VAR}} is 3", "{{VAR}} is not 0", "{{VAR}} has any value", etc.
    return t;
  }

  // ---- DSL (optional) → program JSON (same schema we accept above) ----
  function dslToProgramJSON(dsl) {
    // Minimal, robust parser for your prior DSL; keeps top-level vs nested with "-".
    // Since you’re focusing on JSON now, keep this as a fallback.
    const lines = String(dsl||'').split(/\r?\n/);
    const ctx = { i: 0, lines };
    const actions = parseBlock(ctx, 0, false);
    return { actions };
  }

  function parseBlock(ctx, indentLevel, inFlow) {
    const list = [];
    while (ctx.i < ctx.lines.length) {
      let raw = ctx.lines[ctx.i];
      const line = raw.replace(/\t/g,'    ');
      ctx.i++;
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const m = line.match(/^(\s*)(-?\s*)(.*)$/);
      const indent = (m && m[1]) ? m[1].length : 0;
      const bullet = (m && m[2]) ? m[2].includes('-') : false;
      const content = (m && m[3]) ? m[3].trim() : line.trim();

      if (inFlow && indent < indentLevel) { ctx.i--; break; }

      if (/^Repeat\s*:$/i.test(content)) {
        const params = parseParams(ctx, indent + 2);
        const body = parseBlock(ctx, indent + 2, true);
        list.push({ action: 'Repeat', params: { Count: getNumber(params.Count, 1_000_000) }, do: body });
        continue;
      }
      if (/^RepeatEach\s*:$/i.test(content) || /^Repeat With Each\s*:$/i.test(content)) {
        const params = parseParams(ctx, indent + 2);
        const body = parseBlock(ctx, indent + 2, true);
        list.push({ action: 'RepeatEach', params: { Items: params.Items ?? '{{LIST}}' }, do: body });
        continue;
      }
      if (/^If\s*:$/i.test(content)) {
        const params = parseParams(ctx, indent + 2);
        const thenBody = parseBlock(ctx, indent + 2, true);
        let elseBody = [];
        if (peekIsElse(ctx, indent)) { ctx.i++; elseBody = parseBlock(ctx, indent + 2, true); }
        list.push({ action: 'If', params: { Condition: String(params.Condition || '') }, then: thenBody, else: elseBody });
        continue;
      }

      // bare action (no params)
      if (!content.includes(':')) { list.push({ action: content }); continue; }

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
      if (/^Else\s*:$/i.test(rest)) break;
      if (/^[-]/.test(rest)) break;

      const kv = rest.match(/^([^:]+):\s*(.*)$/);
      if (!kv) break;
      const key = kv[1].trim();
      let val = kv[2].trim();

      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (/^(true|false)$/i.test(val)) out[key] = /^true$/i.test(val);
      else if (/^-?\d+(\.\d+)?$/.test(val)) out[key] = Number(val);
      else out[key] = val;

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

  // ---- Misc helpers ----
  function eq(a,b){ return normalizeName(a) === normalizeName(b); }
  function getNumber(v, def=0){
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return def;
  }
  function safePreview(v){
    try { return JSON.stringify(v, null, 2).slice(0, 400); } catch { return String(v); }
  }
  function tryParseJSON(text){
    const t = stripCodeFences(String(text || '').trim());
    try { return JSON.parse(t); }
    catch (e){ fail('Invalid JSON program', { error: String(e), preview: t.slice(0,400) }); }
  }

})();