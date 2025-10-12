// conversion.js (updated)
// Generalized loader + converter that uses index.json in both Templates and Conversions.
// Adds robust nested control-flow (If / Else / End If, Repeat / End Repeat, RepeatEach / End) using
// real Shortcuts plist markers and GroupingIdentifiers. Also supports single-line actions with no
// parameters (e.g., `Vibrate`).

(function () {
  const DEFAULTS = {
    templatesBase: '/AI-Shortcuts/Templates/',
    conversionsBase: '/AI-Shortcuts/Conversions/',
  };

  let CONFIG = { ...DEFAULTS };
  let CATALOG = {
    templatesIndex: [],
    conversionsIndex: [],
    templates: new Map(),   // key: filename -> text
    conversions: new Map(), // key: filename -> text
  };
  let UUID_COUNTER = 0;

  // ----------------------------- Public API ---------------------------------
  async function loadCatalog(opts = {}) {
    CONFIG = { ...DEFAULTS, ...opts };
    const [tIdx, cIdx] = await Promise.all([
      loadIndex(CONFIG.templatesBase),
      loadIndex(CONFIG.conversionsBase),
    ]);
    CATALOG.templatesIndex = tIdx;
    CATALOG.conversionsIndex = cIdx;

    await Promise.all([
      fetchAllIntoMap(CONFIG.conversionsBase, cIdx, CATALOG.conversions),
      fetchAllIntoMap(CONFIG.templatesBase,   tIdx, CATALOG.templates),
    ]);
  }

  function toPlist({ name, dsl }) {
    const meta = extractNameAndStrip(dsl || '');
    const actions = parseDsl(meta.dsl);
    if (!actions.length) throw new Error('No actions parsed from DSL.');
    const xml = [];
    for (const a of actions) {
      xml.push(renderAction(a));
    }
    const actionXml = xml.join('\n');
    const finalName = name || meta.name || 'My Shortcut';
    return buildWorkflowDictXML(finalName, actionXml);
  }

  // Extract and remove `Shortcut Name: "..."` (case-insensitive) from the DSL
  function extractNameAndStrip(dsl) {
    const re = /(^|\n)\s*Shortcut\s+Name\s*:\s*(["']?)(.*?)\2\s*(?=\n|$)/i;
    let foundName = null;
    let cleaned = dsl;
    const m = cleaned.match(re);
    if (m) {
      foundName = m[3].trim();
      cleaned = cleaned.replace(re, '\n');
    }
    return { name: foundName, dsl: cleaned };
  }

  // ------------------------ Index + Fetch helpers ---------------------------
  async function loadIndex(base) {
    const url = join(base, 'index.json');
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch ${url} → ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.files)) throw new Error(`Malformed index at ${url}`);
    return data.files.map(String);
  }

  async function fetchAllIntoMap(base, fileList, outMap) {
    const tasks = fileList.map(async (fname) => {
      const url = join(base, fname);
      const txt = await fetchText(url);
      outMap.set(fname, txt);
    });
    await Promise.all(tasks);
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} → ${res.status}`);
    return await res.text();
  }

  function join(base, path) {
    if (!base.endsWith('/')) base += '/';
    return base + path.replace(/^\/+/, '');
  }

  // ---------------------------- Rendering -----------------------------------
  function renderAction(action) {
    // Normalized name for control-flow detection (handles spaces and case)
    const norm = normalize(action.name).replace(/\s+/g, '');

    // Control flow first (render into multiple plist actions)
    if (norm === 'if') return renderIfSequence(action.params || {});
    if (norm === 'repeat') return renderRepeatSequence(action.params || {});
    if (norm === 'repeatwitheach' || norm === 'repeatforeach' || norm === 'repeatwith') {
      return renderRepeatEachSequence(action.params || {});
    }

    // Normal action via conversions catalog (best-match filename)
    const fname = findBestFilename(action.name);
    if (fname) {
      const conv = CATALOG.conversions.get(fname);
      if (conv) return fillConversionTemplate(conv, action.params || {});
    }

    // Parameter-less fallback for single tokens (works even without a conversion file)
    if (!action.params || Object.keys(action.params).length === 0) {
      const inline = inlineSimpleActionNode(action.name);
      if (inline) return inline;
      const conv2 = tryFindSimpleConversion(action.name);
      if (conv2) return fillConversionTemplate(conv2, {});
    }

    // Diagnostic comment so the workflow still runs
    return buildCommentDict(`Unmapped action: ${action.name}\nParams: ${JSON.stringify(action.params || {}, null, 2)}`);
  }

  // ---------- If / Else / End If -------------------------------------------
  const COND_CODES = {
    'has any value': 0,
    'does not have any value': 1,
    'contains': 2,
    'does not contain': 3,
    'is': 4,
    '==': 4,
    'equals': 4,
    'is equal to': 4,
    'is not': 5,
    '!=': 5,
    'does not equal': 5,
    '>': 6,
    'is greater than': 6,
    'greater than': 6,
    '>=': 7,
    'is greater than or equal to': 7,
    'greater than or equal to': 7,
    '<': 8,
    'is less than': 8,
    'less than': 8,
    '<=': 9,
    'is less than or equal to': 9,
    'less than or equal to': 9,
    'between': 10,
    'is between': 10,
  };

  function renderIfSequence(params) {
    const group = genUUID();
    const input = params.Input != null ? params.Input : '';
    const condLabel = String(params.Condition || 'is').toLowerCase();
    const condCode = COND_CODES[condLabel] != null ? COND_CODES[condLabel] : 4; // default "is"

    const num1 = params.Number != null ? Number(params.Number) : undefined;
    const num2 = params.NumberMax != null ? Number(params.NumberMax) : undefined;

    const first = conditionalNode({
      GroupingIdentifier: group,
      WFControlFlowMode: 0,
      WFCondition: condCode,
      WFInput: toVariableToken(input),
      WFNumberValue: Number.isFinite(num1) ? num1 : undefined,
      WFSecondNumberValue: Number.isFinite(num2) ? num2 : undefined,
    });

    const thenList = Array.isArray(params.Then) ? params.Then : [];
    const elseList = Array.isArray(params.Else) ? params.Else : [];

    const thenXml = (thenList.length ? thenList : [{ name: 'Nothing', params: {} }])
      .map(renderAction).join('\n');

    const otherwise = conditionalNode({ GroupingIdentifier: group, WFControlFlowMode: 1 });

    const elseXml = (elseList.length ? elseList : [{ name: 'Nothing', params: {} }])
      .map(renderAction).join('\n');

    const end = conditionalNode({ GroupingIdentifier: group, WFControlFlowMode: 2 });

    return [first, thenXml, otherwise, elseXml, end].filter(Boolean).join('\n');
  }

  function nothingNode() {
    return dictToXml({
      WFWorkflowActionIdentifier: 'is.workflow.actions.nothing',
      WFWorkflowActionParameters: {}
    });
  }

  function conditionalNode(p) {
    const dict = {
      WFWorkflowActionIdentifier: 'is.workflow.actions.conditional',
      WFWorkflowActionParameters: {
        GroupingIdentifier: p.GroupingIdentifier,
        WFControlFlowMode: p.WFControlFlowMode,
      },
    };
    if (p.WFCondition != null) dict.WFWorkflowActionParameters.WFCondition = p.WFCondition;
    if (p.WFInput != null) dict.WFWorkflowActionParameters.WFInput = p.WFInput;
    if (p.WFNumberValue != null) {
      const n1 = typeof p.WFNumberValue === 'number' ? p.WFNumberValue : Number(p.WFNumberValue);
      if (Number.isFinite(n1)) dict.WFWorkflowActionParameters.WFNumberValue = n1;
    }
    if (p.WFSecondNumberValue != null) {
      const n2 = typeof p.WFSecondNumberValue === 'number' ? p.WFSecondNumberValue : Number(p.WFSecondNumberValue);
      if (Number.isFinite(n2)) dict.WFWorkflowActionParameters.WFSecondNumberValue = n2;
    }
    return dictToXml(dict);
  }

  // --------------------------- Repeat / End Repeat --------------------------
  // Supports nested bodies and the `Do: ""` on the same line (block follows on indented lines).
  function renderRepeatSequence(params) {
    const group = genUUID();
    const count = toNumber(params.Count, 1);

    const begin = repeatCountNode({ GroupingIdentifier: group, WFControlFlowMode: 0, WFRepeatCount: count });

    const bodyList = Array.isArray(params.Do) ? params.Do : (Array.isArray(params.Actions) ? params.Actions : []);
    const bodyXml = (bodyList.length ? bodyList : [{ name: 'Nothing', params: {} }])
      .map(renderAction).join('\n');

    const end = repeatCountNode({ GroupingIdentifier: group, WFControlFlowMode: 2, WFRepeatCount: count });

    return [begin, bodyXml, end].filter(Boolean).join('\n');
  }

  function repeatCountNode(p) {
    const dict = {
      WFWorkflowActionIdentifier: 'is.workflow.actions.repeat.count',
      WFWorkflowActionParameters: {
        GroupingIdentifier: p.GroupingIdentifier,
        WFControlFlowMode: p.WFControlFlowMode,
        WFRepeatCount: p.WFRepeatCount,
      },
    };
    return dictToXml(dict);
  }

  // ------------------------ Repeat With Each / End --------------------------
  function renderRepeatEachSequence(params) {
    const group = genUUID();
    const listRaw = params.Items;
    const begin = repeatEachNode({ GroupingIdentifier: group, WFControlFlowMode: 0, WFRepeatList: listRaw });

    const bodyList = Array.isArray(params.Do) ? params.Do : (Array.isArray(params.Actions) ? params.Actions : []);
    const bodyXml = (bodyList.length ? bodyList : [{ name: 'Nothing', params: {} }])
      .map(renderAction).join('\n');

    const end = repeatEachNode({ GroupingIdentifier: group, WFControlFlowMode: 2, WFRepeatList: listRaw });
    return [begin, bodyXml, end].filter(Boolean).join('\n');
  }

  function repeatEachNode(p) {
    const dict = {
      WFWorkflowActionIdentifier: 'is.workflow.actions.repeat.each',
      WFWorkflowActionParameters: {
        GroupingIdentifier: p.GroupingIdentifier,
        WFControlFlowMode: p.WFControlFlowMode,
        WFRepeatList: toVariableToken(p.WFRepeatList || ''),
      },
    };
    return dictToXml(dict);
  }

  // -------------------------- Catalog resolution ----------------------------
  function tryFindSimpleConversion(name) {
    const direct = name.endsWith('.txt') ? name : name + '.txt';
    if (CATALOG.conversions.has(direct)) return CATALOG.conversions.get(direct);
    const loose = CATALOG.conversionsIndex.find(fn => normalize(fn).includes(normalize(name)));
    return loose ? CATALOG.conversions.get(loose) : null;
  }

  function inlineSimpleActionNode(name) {
    const n = normalize(name);
    // Make Vibrate (aka “Vibrate Device”) work as a bare action
    if (n === 'vibrate' || n === 'vibratedevice' || n === 'haptic' || n === 'haptics' || n === 'playhaptic' || n === 'playhaptics') {
      return dictToXml({
        WFWorkflowActionIdentifier: 'is.workflow.actions.vibrate',
        WFWorkflowActionParameters: {}
      });
    }
    if (n === 'nothing') {
      return nothingNode();
    }
    return null;
  }

  function findBestFilename(dslHeader) {
    const base = dslHeader.trim();
    const candidates = [];
    if (/\.txt$/i.test(base)) candidates.push(base);
    candidates.push(base + '.txt');
    candidates.push(normalize(base) + '.txt');

    for (const c of candidates) {
      if (CATALOG.conversionsIndex.includes(c)) return c;
      if (CATALOG.templatesIndex.includes(c)) return c; // still return name; maybe no conversion
    }
    // Last resort: loose contains against both indexes
    const pool = CATALOG.conversionsIndex.concat(CATALOG.templatesIndex);
    const loose = pool.find(fn => normalize(fn).includes(normalize(base)));
    return loose || null;
  }

  // ------------------------------ DSL Parser --------------------------------
  function parseDsl(text) {
    const lines = (text || '').replace(/\r\n/g, '\n').split('\n');

    // Tokenize indentation and content
    const toks = lines.map((raw) => {
      const m = raw.match(/^(\s*)(.*)$/) || ['', '', raw];
      return { indent: m[1].length, raw, line: m[2] };
    }).filter(t => t.line.trim() !== '');

    let i = 0;
    function parseActions(minIndent) {
      const out = [];
      while (i < toks.length) {
        const t = toks[i];
        if (t.indent < minIndent) break;

        // Bullet item: "- Name:" or "- Name"
        if (/^-\s+/.test(t.line)) {
          const m = t.line.match(/^-\s+([A-Za-z0-9_.\-]+)(?::\s*)?(.*)$/);
          if (m) {
            i++;
            const name = m[1];
            const rest = m[2].trim();
            let params = {};
            if (rest) {
              try { params = JSON.parse(rest); } catch { params = {}; }
            }
            // Parse any nested param lines under greater indent
            const blockIndent = t.indent + 2;
            params = { ...params, ...parseParams(blockIndent) };
            out.push({ name, params });
            continue;
          }
        }

        // Header form: "Name:" on a line
        const h = t.line.match(/^([A-Za-z0-9_.\-]+):\s*$/);
        if (h) {
          i++;
          const name = h[1];
          const params = parseParams(t.indent + 2);
          out.push({ name, params });
          continue;
        }

        // Single-line action without parameters
        const single = t.line.match(/^([A-Za-z0-9_.\-]+)\s*$/);
        if (single) {
          i++;
          out.push({ name: single[1], params: {} });
          continue;
        }

        // Unknown line → skip (acts like a comment)
        i++;
      }
      return out;
    }

    function parseParams(minIndent) {
      const params = {};
      while (i < toks.length) {
        const t = toks[i];
        if (t.indent < minIndent) break;

        // Key: value
        const m = t.line.match(/^([A-Za-z0-9_.\-]+):\s*(.*)$/);
        if (m) {
          const key = m[1];
          const rhs = m[2];
          i++;

          const nextIndent = t.indent + 2;
          const nextTok = toks[i];
          // Treat empty, quoted-empty, or “block follows” as a block value
          const looksLikeBlock = (rhs === '' || rhs === '|' || rhs === '""' || rhs === "''" || (nextTok && nextTok.indent >= nextIndent));
          if (looksLikeBlock) {
            const child = parseActions(nextIndent);
            const k = normalizeListKey(key);
            params[k] = child;
            continue;
          }

          // Inline list after colon (rare)
          if (/^-\s+/.test(rhs)) {
            const child = parseActions(nextIndent);
            const k = normalizeListKey(key);
            params[k] = child;
            continue;
          }

          // Scalar value
          params[key] = coerceScalar(stripQuotes(rhs.trim()));
          continue;
        }

        break;
      }
      return params;
    }

    return parseActions(0);
  }

  function normalizeListKey(k) {
    const L = String(k).toLowerCase();
    if (L === 'then') return 'Then';
    if (L === 'else') return 'Else';
    if (L === 'do') return 'Do';
    if (L === 'actions') return 'Actions';
    return k;
  }

  function stripQuotes(s) {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  }

  function coerceScalar(v) {
    if (/^\{\{.*\}\}$/.test(v)) return v; // keep variable token
    if (/^(true|false)$/i.test(v)) return (/^true$/i).test(v);
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    return v;
  }

  // ----------------------- Conversion template filling ----------------------
  function fillConversionTemplate(xmlTemplate, params) {
    // Replace {{UUID}}
    let out = xmlTemplate.replace(/\{\{\s*UUID\s*\}\}/g, genUUID());

    // Replace {{Key}} with string/bool/number (string by default)
    out = out.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_, key) => {
      const v = lookupParam(params, key);
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (v == null) return '';
      return String(v);
    });

    // Support {{XML:Key}} to inject typed plist nodes
    out = out.replace(/\{\{\s*XML:([A-Za-z0-9_.-]+)\s*\}\}/g, (_, key) => plistValueNode(lookupParam(params, key)));

    return out.trim();
  }

  function lookupParam(params, key) {
    if (key in params) return params[key];
    const k = Object.keys(params).find(p => p.toLowerCase() === String(key).toLowerCase());
    if (k) return params[k];
    return undefined;
  }

  // --------------------------- Plist helpers --------------------------------
  function buildWorkflowDictXML(name, actionsXml) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>WFWorkflowName</key>\n  <string>${x(name)}</string>\n  <key>WFWorkflowActions</key>\n  <array>\n${indent(actionsXml, 4)}\n  </array>\n</dict>\n</plist>`;
  }

  function dictToXml(d) {
    const parts = [];
    parts.push('<dict>');
    for (const [k, v] of Object.entries(d)) {
      parts.push(`<key>${x(k)}</key>`);
      parts.push(toNode(v));
    }
    parts.push('</dict>');
    return parts.join('\n');
  }

  function toNode(v) {
    if (v == null) return '<string></string>';
    if (typeof v === 'string') return `<string>${x(v)}</string>`;
    if (typeof v === 'number') return Number.isInteger(v) ? `<integer>${v}</integer>` : `<real>${v}</real>`;
    if (typeof v === 'boolean') return v ? '<true/>' : '<false/>';
    if (Array.isArray(v)) return `<array>\n${v.map(toNode).map(s => indent(s, 2)).join('\n')}\n</array>`;
    if (typeof v === 'object') {
      const parts = ['<dict>'];
      for (const [kk, vv] of Object.entries(v)) {
        parts.push(`<key>${x(kk)}</key>`);
        parts.push(toNode(vv));
      }
      parts.push('</dict>');
      return parts.join('\n');
    }
    return `<string>${x(String(v))}</string>`;
  }

  function plistValueNode(v) { return toNode(v); }

  function x(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function indent(s, n) {
    const pad = ' '.repeat(n);
    return s.split('\n').map(l => pad + l).join('\n');
  }

  function genUUID() {
    UUID_COUNTER++;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const hex = [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.substr(0,8)}-${hex.substr(8,4)}-${hex.substr(12,4)}-${hex.substr(16,4)}-${hex.substr(20)}`;
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16);
    }) + '-' + UUID_COUNTER.toString(16);
  }

  function normalize(s) {
    return String(s).toLowerCase().replace(/\.txt$/i, '').replace(/[^a-z0-9.+_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function toNumber(v, fallback) {
    if (v == null || v === '') return fallback;
    if (typeof v === 'number') return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function toVariableToken(val) {
    if (val == null) return '';
    const s = String(val).trim();
    const m = s.match(/^\{\{\s*(.*?)\s*\}\}$/);
    if (!m) return s; // plain string
    const name = m[1];
    return {
      Type: 'Variable',
      Variable: {
        Value: { Type: 'Variable', VariableName: name },
        WFSerializationType: 'WFTextTokenAttachment',
      },
    };
  }

  // Expose
  window.ConversionDSL = {
    loadCatalog,
    toPlist,
    getIndexes: () => ({ templates: [...CATALOG.templatesIndex], conversions: [...CATALOG.conversionsIndex] }),
    setConfig: (cfg) => { CONFIG = { ...CONFIG, ...cfg }; },
  };
})();