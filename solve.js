// solve.js — a faster drop-in for csv-reader 1.0.0.
// Same semantics as the reference (baselines/csv-reader/vendor/csv-reader/index.js):
// indexOf-driven scanning, string slicing instead of char-by-char concatenation.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0;
  let line = 1;
  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  let recordLine = 1;
  let recordRow = null;
  let value = '';      // result of the last field read
  let added = 0;       // chars the unquoted reader kept (for quote_junk)
  let ended = END;     // how the last field ended
  let quoted = false;  // whether the last field opened with a quote

  // skip empty lines (a line with no characters is no record)
  while (pos < n) {
    const c = text.charCodeAt(pos);
    if (c === 10) { pos++; line++; }
    else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; }
    else break;
  }

  function readUnquoted() {
    quoted = false;
    let i = pos;
    const start = pos;
    for (;;) {
      const nl = text.indexOf('\n', i);
      let m = nl === -1 ? n : nl;
      const comma = text.indexOf(',', i);
      if (comma !== -1 && comma < m) m = comma;
      const cr = text.indexOf('\r', i);
      if (cr !== -1 && cr < m) m = cr;
      const q = text.indexOf('"', i);
      if (q !== -1 && q < m) m = q;
      if (m === n) { value = text.slice(start, n); pos = n; added = n - start; return END; }
      const c = text.charCodeAt(m);
      if (c === 44) { value = text.slice(start, m); pos = m + 1; added = m - start; return COMMA; }
      if (c === 10) { value = text.slice(start, m); pos = m + 1; line++; added = m - start; return LINE_BREAK; }
      if (c === 34) { i = m + 1; continue; } // quote in unquoted field: literal char
      // CR
      if (m + 1 < n && text.charCodeAt(m + 1) === 10) {
        value = text.slice(start, m); pos = m + 2; line++; added = m - start; return LINE_BREAK;
      }
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      i = m + 1;
    }
  }

  function readQuoted() {
    quoted = true;
    const open = pos;
    const openLine = line;
    let acc = '';
    let p = pos + 1;
    let closed = false;
    for (;;) {
      const q = text.indexOf('"', p);
      if (q === -1) break;
      if (q + 1 < n && text.charCodeAt(q + 1) === 34) {
        acc += text.slice(p, q) + '"';
        p = q + 2;
        continue;
      }
      acc += text.slice(p, q);
      p = q + 1;
      closed = true;
      break;
    }
    if (!closed) {
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      ended = readUnquoted();
      value = '"' + value;
      added = 1 + added; // the literal quote counts as a kept char
      return;
    }
    pos = p;
    if (pos >= n) { value = acc; added = 0; ended = END; return; }
    const c = text.charCodeAt(pos);
    if (c === 44) { pos++; value = acc; added = 0; ended = COMMA; return; }
    if (c === 10) { pos++; line++; value = acc; added = 0; ended = LINE_BREAK; return; }
    if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; value = acc; added = 0; ended = LINE_BREAK; return; }
    // junk after closing quote: appended as it stands via unquoted reading
    ended = readUnquoted();
    value = acc + value;
    if (added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
  }

  while (true) {
    // skip empty lines
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos++; line++; }
      else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; }
      else break;
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    do {
      if (text.charCodeAt(pos) === 34) readQuoted(); else ended = readUnquoted();
      fields.push(value);
    } while (ended === COMMA);

    // a line that held only stray CRs is left with no characters: no record
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
