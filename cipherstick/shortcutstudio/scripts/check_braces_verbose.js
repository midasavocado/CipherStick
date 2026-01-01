const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Usage: node check_braces_verbose.js <file>'); process.exit(2); }
const s = fs.readFileSync(path, 'utf8');
let stack = [];
let line = 1;
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (c === '\n') line++;
  if ('({['.includes(c)) {
    stack.push({ c, line, i });
  } else if (')}]'.includes(c)) {
    const last = stack.pop();
    const expected = last ? (last.c === '(' ? ')' : last.c === '{' ? '}' : ']') : null;
    if (!last || expected !== c) {
      console.log('Mismatch', c, 'at line', line, 'pos', i);
      console.log('  Last opener on stack:', last);
      const snippet = s.slice(Math.max(0, i - 80), Math.min(s.length, i + 80));
      console.log('  Context around mismatch:\n', snippet);
      process.exit(0);
    }
  }
}
if (stack.length) {
  const last = stack[stack.length - 1];
  console.log('Unclosed', last.c, 'opened at line', last.line, 'pos', last.i);
  const snippet = s.slice(Math.max(0, last.i - 80), Math.min(s.length, last.i + 80));
  console.log('  Context around opener:\n', snippet);
} else {
  console.log('All matched');
}
