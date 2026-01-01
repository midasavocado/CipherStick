const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Usage: node check_braces_aware.js <file>'); process.exit(2); }
const s = fs.readFileSync(path, 'utf8');
let stack = [];
let line = 1;
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (c === '\n') line++;

  // comments and regex
  if (c === '/') {
    const n = s[i + 1];
    if (n === '/') { // single-line comment
      i += 2; while (i < s.length && s[i] !== '\n') i++; continue;
    } else if (n === '*') { // block comment
      i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) { if (s[i] === '\n') line++; i++; } i += 2; continue;
    } else {
      // heuristic to detect regex literal
      let j = i - 1; while (j >= 0 && /\s/.test(s[j])) j--; const prev = s[j] || '';
      const regexStarters = ['=', '(', '[', ',', '!', '?', '|', '&', ';', '{', ':', '+', '-', '*', '/', '%', '\n'];
      if (j < 0 || regexStarters.includes(prev)) {
        i++; // enter regex
        while (i < s.length) {
          if (s[i] === '\\') i += 2;
          else if (s[i] === '/') { i++; while (i < s.length && /[gimsuy]/.test(s[i])) i++; break; }
          else { if (s[i] === '\n') line++; i++; }
        }
        continue;
      }
    }
  }

  // strings
  if (c === '"' || c === "'" || c === '`') {
    const quote = c; i++; while (i < s.length) { if (s[i] === '\\') i += 2; else if (s[i] === quote) { i++; break; } else { if (s[i] === '\n') line++; i++; } } continue;
  }

  if ('({['.includes(c)) stack.push({ c, line, i });
  else if (')}]'.includes(c)) {
    const last = stack.pop();
    const expected = last ? (last.c === '(' ? ')' : last.c === '{' ? '}' : ']') : null;
    if (!last || expected !== c) {
      console.log('Mismatch', c, 'at line', line, 'pos', i);
      console.log('  Last opener on stack:', last);
      console.log('  Context around mismatch:\n', s.slice(Math.max(0, i - 80), Math.min(s.length, i + 80)));
      process.exit(0);
    }
  }
}
if (stack.length) {
  const last = stack[stack.length - 1];
  console.log('Unclosed', last.c, 'opened at line', last.line, 'pos', last.i);
  console.log('  Context around opener:\n', s.slice(Math.max(0, last.i - 120), Math.min(s.length, last.i + 120)));
} else {
  console.log('All matched');
}
