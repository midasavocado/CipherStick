const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Usage: node check_braces.js <file>'); process.exit(2); }
const s = fs.readFileSync(path, 'utf8');
let stack = [];
let line = 1;
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (c === '\n') line++;
  if ('({['.includes(c)) stack.push({ c, line, i });
  else if (')}]'.includes(c)) {
    const last = stack.pop();
    if (!last || (last.c === '(' && c !== ')') || (last.c === '{' && c !== '}') || (last.c === '[' && c !== ']')) {
      console.log('Mismatch', c, 'at line', line, 'pos', i);
      process.exit(0);
    }
  }
}
if (stack.length) {
  const last = stack[stack.length - 1];
  console.log('Unclosed', last.c, 'opened at line', last.line);
} else {
  console.log('All matched');
}
