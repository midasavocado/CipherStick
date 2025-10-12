

// conversion.js
// Generalized loader + converter that uses index.json in both Templates and Conversions.
// Exposes:
//   - await ConversionDSL.loadCatalog({ templatesBase, conversionsBase })
//   - ConversionDSL.toPlist({ name, dsl })
//
// Defaults assume a local /AI-Shortcuts/(Templates|Conversions)/ structure,
// but you can point to https://cipherstick.tech/AI-Shortcuts/... too.

(function () {
  const DEFAULTS = {
    templatesBase: '/AI-Shortcuts/Templates/',
    conversionsBase: '/AI-Shortcuts/Conversions/',
  };

  let CONFIG = { ...DEFAULTS };
  let CATALOG = {
    templatesIndex: [],
    conversionsIndex: [],
    templates: new Map(),   // key: normalized filename → text
    conversions: new Map(), // key: normalized filename → text
  };
  let UUID_COUNTER = 0;

  // --- Public API ------------------------------------------------------------

  async function loadCatalog(opts = {}) {
    CONFIG = { ...DEFAULTS, ...opts };
    // Load both index.json files
    const [tIdx, cIdx] = await Promise.all([
      loadIndex(CONFIG.templatesBase),
      loadIndex(CONFIG.conversionsBase),
    ]);

    CATALOG.templatesIndex = tIdx;
    CATALOG.conversionsIndex = cIdx;

    // Preload conversion files (fast path). Templates are optional for conversion,
    // but we cache them too in case you want to surface examples.
    await Promise.all([
      fetchAllIntoMap(CONFIG.conversionsBase, cIdx, CATALOG.conversions),
      fetchAllIntoMap(CONFIG.templatesBase,   tIdx, CATALOG.templates),
    ]);
  }

  function toPlist({ name, dsl }) {
    const actions = parseDsl(dsl || '');
    if (!actions.length) throw new Error('No actions parsed from DSL.');

    const actionXml = actions.map(renderActionFromCatalog).join('\n');
    const workflow = buildWorkflowDictXML(name || 'My Shortcut', actionXml);
    return workflow;
  }

  // --- Index + Fetch helpers -------------------------------------------------

  async function loadIndex(base) {
    const url = join(base, 'index.json');
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch ${url} → ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.files)) {
      throw new Error(`Malformed index at ${url}: expected { files: [...] }`);
    }
    // Ensure strings
    return data.files.map(String);
  }

  async function fetchAllIntoMap(base, fileList, outMap) {
    const tasks = fileList.map(async (fname) => {
      const url = join(base, fname);
      const txt = await fetchText(url);
      outMap.set(normFile(fname), txt);
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

  // --- Lookup + Rendering ----------------------------------------------------

  function renderActionFromCatalog(action) {
    // We map the DSL block header to a filename first.
    // Accepted DSL headers:
    //  - Exact filename (e.g., "Safari.CloseTab.txt")
    //  - Basename (e.g., "Safari.CloseTab")
    //  - Loose name (we normalize and match against indexes)
    const fname = findBestFilename(action.name);

    if (fname) {
      const conv = CATALOG.conversions.get(normFile(fname));
      if (conv) {
        return fillConversionTemplate(conv, action.params);
      }
    }

    // Fallback: produce a comment action with details so it remains a valid workflow.
    return buildCommentDict(`Unmapped action: ${action.name}\nParams: ${JSON.stringify(action.params, null, 2)}`);
  }

  function findBestFilename(dslHeader) {
    const candidateNames = [];
    const base = dslHeader.trim();

    // Direct filename
    if (/\.txt$/i.test(base)) candidateNames.push(base);

    // Add .txt
    candidateNames.push(base + '.txt');

    // Normalized variations
    const n = normalize(base);
    candidateNames.push(n + '.txt');

    // Try exact and then normalized match against both indexes
    for (const name of candidateNames) {
      if (existsInIndexes(name)) return exactFromIndexes(name);
    }

    // Loose contains match as last resort
    const pool = CATALOG.conversionsIndex.concat(CATALOG.templatesIndex);
    const loose = pool.find(fn => normalize(fn).includes(normalize(base)));
    return loose || null;
  }

  function existsInIndexes(filename) {
    return CATALOG.conversionsIndex.includes(filename) || CATALOG.templatesIndex.includes(filename);
  }
  function exactFromIndexes(filename) {
    // Prefer conversions index if present
    if (CATALOG.conversionsIndex.includes(filename)) return filename;
    return filename;
  }

  // --- DSL parsing (YAML-ish blocks) ----------------------------------------

  function parseDsl(dslText) {
    const lines = (dslText || '').replace(/\r\n/g, '\n').split('\n');
    const actions = [];
    let current = null;

    for (let raw of lines) {
      const line = raw.replace(/\t/g, '  ');
      if (!line.trim()) continue;

      // Header "Name:"  (no trailing content)
      const h = line.match(/^([A-Za-z0-9_.\-]+):\s*$/);
      if (h) {
        if (current) actions.push(current);
        current = { name: h[1], params: {} };
        continue;
      }

      // "  Key: Value"
      const kv = line.match(/^\s{2,}([A-Za-z0-9_.\-]+):\s*(.*)$/);
      if (kv && current) {
        const key = kv[1];
        let rawVal = kv[2].trim();

        // Preserve placeholders like {{SOMETHING}}
        if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
          rawVal = rawVal.slice(1, -1);
        }

        let val;
        if (/^\{\{.*\}\}$/.test(rawVal)) {
          val = rawVal;
        } else if (/^(true|false)$/i.test(rawVal)) {
          val = asBool(rawVal);
        } else if (/^-?\d+$/.test(rawVal)) {
          val = parseInt(rawVal, 10);
        } else if (/^-?\d+\.\d+$/.test(rawVal)) {
          val = parseFloat(rawVal);
        } else {
          val = rawVal;
        }

        current.params[key] = val;
      }
    }
    if (current) actions.push(current);
    return actions;
  }

  // --- Conversion template filling ------------------------------------------

  function fillConversionTemplate(xmlTemplate, params) {
    // 1) Replace UUIDs
    let out = xmlTemplate.replace(/\{\{\s*UUID\s*\}\}/g, genUUID());

    // 2) Replace simple placeholders {{Key}} with string/bool/number form.
    // We do a conservative replace INSIDE existing tags, keeping types from the template.
    out = out.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_, key) => {
      const k = String(key);
      if (/^UUID$/i.test(k)) return genUUID();
      const v = lookupParam(params, k);
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (v == null) return ''; // leave blank if missing
      return String(v);
    });

    // 3) In case some conversions prefer typed node injection, you can support
    //    a pattern like {{XML:Key}} to inject a fully-typed plist node.
    out = out.replace(/\{\{\s*XML:([A-Za-z0-9_.-]+)\s*\}\}/g, (_, key) => {
      const v = lookupParam(params, key);
      return plistValueNode(v);
    });

    return out.trim();
  }

  function lookupParam(params, key) {
    // Exact
    if (key in params) return params[key];
    // Case-insensitive
    const k = Object.keys(params).find(p => p.toLowerCase() === String(key).toLowerCase());
    if (k) return params[k];
    return undefined;
  }

  // --- Plist construction + helpers -----------------------------------------

  function buildWorkflowDictXML(name, actionsXml) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowName</key>
  <string>${x(name)}</string>
  <key>WFWorkflowActions</key>
  <array>
${indent(actionsXml, 4)}
  </array>
</dict>
</plist>`;
  }

  function buildCommentDict(text) {
    const t = String(text || '');
    return `
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.comment</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFCommentActionText</key>
        <string>${x(t)}</string>
      </dict>
    </dict>`.trim();
  }

  function plistValueNode(v) {
    if (typeof v === 'string') return `<string>${x(v)}</string>`;
    if (typeof v === 'number') return Number.isInteger(v) ? `<integer>${v}</integer>` : `<real>${v}</real>`;
    if (typeof v === 'boolean') return v ? '<true/>' : '<false/>';
    return `<string>${x(String(v))}</string>`;
  }

  function x(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function indent(s, n) {
    const pad = ' '.repeat(n);
    return s.split('\n').map(l => pad + l).join('\n');
  }

  function asBool(v) {
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    return (s === 'true' || s === 'yes' || s === '1');
  }

  function genUUID() {
    UUID_COUNTER++;
    // Try crypto, else fallback.
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      // Per RFC4122 v4
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const hex = [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.substr(0,8)}-${hex.substr(8,4)}-${hex.substr(12,4)}-${hex.substr(16,4)}-${hex.substr(20)}`;
    } else {
      // Weak fallback
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }) + '-' + UUID_COUNTER.toString(16);
    }
  }

  function normFile(name) {
    return name.trim();
  }

  function normalize(s) {
    return s
      .toLowerCase()
      .replace(/\.txt$/i, '')
      .replace(/[^a-z0-9.+_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Attach to window
  window.ConversionDSL = {
    loadCatalog,
    toPlist,
    setConfig: (cfg) => { CONFIG = { ...CONFIG, ...cfg }; },
    getConfig: () => ({ ...CONFIG }),
    getIndexes: () => ({
      templates: [...CATALOG.templatesIndex],
      conversions: [...CATALOG.conversionsIndex],
    }),
  };
})();