// 글 본문 마크다운 렌더러 + 목차. 블로그 팝업과 글별 페이지(/posts/<slug>/)에서 함께 사용합니다.
function mdEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
// Post text is treated as text, not HTML. Only http(s) links are made clickable.
function appendInline(parent, value) {
  value = value.replace(/\*{4,}/g, '').replace(/\\(\n|$)/g, '$1'); // 줄 끝 \ = 줄바꿈
  const tokens = /(`([^`]+)`|!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|(?<![\w*])\*(?!\s)([^*]+?)\*(?![\w*])|(?<!\w)_(?!\s)([^_]+?)_(?!\w)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])|\\([!-\/:-@\[-`{-~]))/g;
  let last = 0, match;
  while ((match = tokens.exec(value))) {
    parent.append(document.createTextNode(value.slice(last, match.index)));
    if (match[2] !== undefined) parent.append(mdEl('code', '', match[2]));
    else if (match[13] !== undefined) parent.append(document.createTextNode(match[13]));
    else if (match[4]) {
      const img = mdEl('img', 'post-image');
      img.alt = match[3]; img.src = match[4]; img.loading = 'lazy';
      parent.append(img);
    } else if (match[6] || match[12]) {
      const link = mdEl('a');
      if (match[6]) appendInline(link, match[5]); else link.textContent = match[12];
      link.href = match[6] || match[12]; link.target = '_blank'; link.rel = 'noopener noreferrer';
      parent.append(link);
    } else {
      const inner = match[7] ?? match[8] ?? match[9] ?? match[10] ?? match[11];
      const tag = match[7] !== undefined || match[8] !== undefined ? 'strong' : match[9] !== undefined ? 'del' : 'em';
      const el = mdEl(tag); appendInline(el, inner); parent.append(el);
    }
    last = tokens.lastIndex;
  }
  parent.append(document.createTextNode(value.slice(last)));
}
const mdFence = /^\s{0,3}(```|~~~)/;
const mdHeading = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const mdRule = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const mdItem = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const mdQuote = /^\s{0,3}>\s?(.*)$/;
const mdTableSep = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = []; let cell = '', inCode = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') { cell += '|'; i++; continue; }
    if (c === '`') inCode = !inCode;
    if (c === '|' && !inCode) { cells.push(cell.trim()); cell = ''; continue; }
    cell += c;
  }
  cells.push(cell.trim());
  return cells;
}
function isTableStart(lines, i) {
  return lines[i].includes('|') && i + 1 < lines.length && mdTableSep.test(lines[i + 1]) && lines[i + 1].includes('-');
}
function isBlockStart(lines, i) {
  const line = lines[i];
  return mdFence.test(line) || mdHeading.test(line) || mdRule.test(line) || mdItem.test(line) || mdQuote.test(line) || isTableStart(lines, i);
}
// headings: collects {level, text, el} for the table of contents.
function renderMarkdown(target, body, headings = []) {
  renderBlocks(target, (body || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'), headings);
  return headings;
}
function renderBlocks(target, lines, headings) {
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = mdFence.exec(line);
    if (fence) {
      const lang = line.trim().slice(fence[1].length).trim().split(/\s+/)[0].toLowerCase();
      const code = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) code.push(lines[i++]);
      i++;
      target.append(renderCodeBlock(code.join('\n'), lang));
      continue;
    }
    const heading = mdHeading.exec(line);
    if (heading) {
      const level = heading[1].length;
      const h = mdEl('h' + Math.min(level + 2, 6), 'md-heading'); appendInline(h, heading[2]); target.append(h);
      if (headings) headings.push({level, text: h.textContent, el: h});
      i++; continue;
    }
    if (mdRule.test(line)) { target.append(mdEl('hr')); i++; continue; }
    if (isTableStart(lines, i)) {
      const head = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map(c => c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : '');
      const wrap = mdEl('div', 'md-table'), table = mdEl('table'), thead = mdEl('thead'), tbody = mdEl('tbody');
      const row = (cells, tag) => {
        const tr = mdEl('tr');
        head.forEach((_, c) => { const cell = mdEl(tag); if (aligns[c]) cell.style.textAlign = aligns[c]; appendInline(cell, cells[c] || ''); tr.append(cell); });
        return tr;
      };
      thead.append(row(head, 'th')); i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|') && !mdFence.test(lines[i])) tbody.append(row(splitRow(lines[i++]), 'td'));
      table.append(thead, tbody); wrap.append(table); target.append(wrap);
      continue;
    }
    if (mdQuote.test(line)) {
      const inner = [];
      while (i < lines.length && lines[i].trim()) { const q = mdQuote.exec(lines[i]); inner.push(q ? q[1] : lines[i]); i++; }
      const quote = mdEl('blockquote'); renderBlocks(quote, inner, null); target.append(quote);
      continue;
    }
    const first = mdItem.exec(line);
    if (first) { i = renderList(target, lines, i, headings); continue; }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !(paragraph.length && isBlockStart(lines, i))) paragraph.push(lines[i++].trim());
    const figure = paragraph.length === 1 && /^!\[([^\]]+)\]\([^)\s]+\)$/.exec(paragraph[0]);
    if (figure) {
      const fig = mdEl('figure', 'post-figure'); appendInline(fig, paragraph[0]);
      fig.append(mdEl('figcaption', '', figure[1])); target.append(fig);
      continue;
    }
    const p = mdEl('p'); appendInline(p, paragraph.join('\n')); target.append(p);
  }
}
function renderList(target, lines, i, headings) {
  const first = mdItem.exec(lines[i]);
  const indent = first[1].length, ordered = /\d/.test(first[2]);
  const list = mdEl(ordered ? 'ol' : 'ul');
  if (ordered && parseInt(first[2], 10) !== 1) list.start = parseInt(first[2], 10);
  while (i < lines.length) {
    const m = mdItem.exec(lines[i]);
    if (!m || m[1].length !== indent || /\d/.test(m[2]) !== ordered) break;
    const contentIndent = indent + m[2].length + Math.min(m[3].length, 4);
    const itemLines = [m[4]]; i++;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) {
        let j = i; while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && lines[j].search(/\S/) >= contentIndent) { while (i < j) { itemLines.push(''); i++; } continue; }
        break;
      }
      const lead = l.search(/\S/);
      if (lead >= contentIndent) { itemLines.push(l.slice(contentIndent)); i++; continue; }
      if (mdItem.test(l) || isBlockStart(lines, i)) break;
      itemLines.push(l.trim()); i++; // lazy continuation line
    }
    const li = mdEl('li'); renderBlocks(li, itemLines, headings); list.append(li);
    // a blank line between items keeps the same list going
    let j = i; while (j < lines.length && !lines[j].trim()) j++;
    const next = j < lines.length && mdItem.exec(lines[j]);
    if (next && next[1].length === indent && /\d/.test(next[2]) === ordered) i = j; else break;
  }
  target.append(list);
  return i;
}
function renderPostBody(container, post) {
  const text = mdEl('div', 'dialog-text');
  const headings = [];
  if (typeof post.body === 'string') renderMarkdown(text, post.body, headings);
  else post.paragraphs.forEach(paragraph => text.append(mdEl('p', '', paragraph)));
  const tocItems = headings.filter(h => h.level <= 3);
  if (tocItems.length < 2) { container.append(text); return; }
  const minLevel = Math.min(...tocItems.map(h => h.level));
  const nav = mdEl('nav', 'post-toc'); nav.setAttribute('aria-label', '목차');
  const details = mdEl('details'); details.open = window.matchMedia('(min-width: 900px)').matches;
  details.append(mdEl('summary', '', '목차'));
  const ol = mdEl('ol');
  const entries = [];
  let clickLock = 0;
  tocItems.forEach(h => {
    const depth = h.level - minLevel + 1;
    const li = mdEl('li', `toc-level-${depth}`);
    const btn = mdEl('button', '', h.text); btn.type = 'button';
    const entry = {li, el: h.el, depth};
    btn.addEventListener('click', () => {
      setActive(entry);
      clickLock = Date.now() + 900; // 부드러운 스크롤 도중 하이라이트가 흔들리지 않게
      h.el.scrollIntoView({behavior: 'smooth', block: 'start'});
      if (!window.matchMedia('(min-width: 900px)').matches) details.open = false;
    });
    li.append(btn); ol.append(li); entries.push(entry);
  });
  details.append(ol); nav.append(details);
  const layout = mdEl('div', 'post-layout'); layout.append(nav, text);
  container.append(layout);

  // 지금 읽고 있는 제목을 목차에서 강조
  let current = null;
  function setActive(entry) {
    if (entry === current) return;
    entries.forEach(e => { e.li.classList.remove('active', 'toc-parent'); e.li.firstChild.removeAttribute('aria-current'); });
    current = entry;
    if (!entry) return;
    entry.li.classList.add('active');
    entry.li.firstChild.setAttribute('aria-current', 'location');
    // 상위 제목도 살짝 강조
    for (let i = entries.indexOf(entry) - 1, d = entry.depth; i >= 0 && d > 1; i--) {
      if (entries[i].depth < d) { entries[i].li.classList.add('toc-parent'); d = entries[i].depth; }
    }
    // 목차가 길면 강조된 항목이 목차 안에서 보이도록 목차만 스크롤
    if (nav.scrollHeight > nav.clientHeight) {
      const navRect = nav.getBoundingClientRect(), liRect = entry.li.getBoundingClientRect();
      const margin = 48;
      if (liRect.top < navRect.top + margin) nav.scrollTop -= navRect.top + margin - liRect.top;
      else if (liRect.bottom > navRect.bottom - margin) nav.scrollTop += liRect.bottom - (navRect.bottom - margin);
    }
  }
  let ticking = false;
  function update() {
    ticking = false;
    if (!layout.isConnected) { document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll); return; }
    if (Date.now() < clickLock || !layout.offsetParent) return;
    const line = Math.min(140, window.innerHeight * 0.25);
    let found = null;
    for (const e of entries) { if (e.el.getBoundingClientRect().top - line <= 0) found = e; else break; }
    // 글 끝까지 내려가면 마지막 제목을 강조
    const last = entries[entries.length - 1];
    if (text.getBoundingClientRect().bottom <= window.innerHeight + 2 && last.el.getBoundingClientRect().top < window.innerHeight) found = last;
    setActive(found || entries[0]);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  document.addEventListener('scroll', onScroll, {capture: true, passive: true});
  window.addEventListener('resize', onScroll, {passive: true});
  requestAnimationFrame(update);
}

// ── 코드 블록: VS Code 편집기 / 터미널 패널 모양 ─────────────────────────────
const CODE_LANGS = {
  c: {label: 'C', icon: 'C'}, h: {label: 'C', icon: 'C'}, cpp: {label: 'C++', icon: 'C++'},
  python: {label: 'Python', icon: 'py'}, py: {label: 'Python', icon: 'py'},
  xml: {label: 'XML', icon: '<>'}, html: {label: 'HTML', icon: '<>'},
  js: {label: 'JavaScript', icon: 'JS'}, javascript: {label: 'JavaScript', icon: 'JS'},
  json: {label: 'JSON', icon: '{}'}, makefile: {label: 'Makefile', icon: 'M'},
};
const TERMINAL_LANGS = ['bash', 'sh', 'shell', 'zsh', 'console', 'terminal', 'shell-session'];
const C_CONTROL = new Set('if else for while do switch case default break continue return goto sizeof'.split(' '));
const C_TYPES = new Set(('int char void short long unsigned signed float double bool _Bool const static extern volatile register inline struct union enum typedef auto restrict ' +
  'size_t ssize_t off_t pid_t uid_t gid_t u8 u16 u32 u64 s8 s16 s32 s64 uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t uintptr_t FILE').split(' '));
const C_CONSTS = new Set('NULL true false'.split(' '));
const PY_CONTROL = new Set('import from as def return if elif else for while try except finally with pass break continue raise yield lambda in not and or is class global nonlocal del assert await async'.split(' '));
const PY_CONSTS = new Set('None True False self'.split(' '));
const PY_BUILTINS = new Set('print len range open bytes bytearray int str list dict set tuple isinstance super type hex ord chr enumerate zip map filter sorted min max sum abs'.split(' '));
const JS_CONTROL = new Set('if else for while do switch case default break continue return throw try catch finally new delete typeof instanceof in of await async yield import export from'.split(' '));
const JS_KW = new Set('const let var function class extends this null undefined true false'.split(' '));

function tok(list, text, cls) { if (text) list.push([text, cls || '']); }

function highlightC(code) {
  const out = [];
  const re = /(\/\*[\s\S]*?(?:\*\/|$))|(\/\/[^\n]*)|(^[ \t]*#[ \t]*\w+)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(<[\w./-]+>)|(\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?)[uUlLfF]*\b)|([A-Za-z_]\w*)/gm;
  let last = 0, m, prevWord = '';
  while ((m = re.exec(code))) {
    tok(out, code.slice(last, m.index));
    if (m[1] || m[2]) tok(out, m[0], 't-com');
    else if (m[3]) tok(out, m[0], 't-ctl');
    else if (m[4]) tok(out, m[0], 't-str');
    else if (m[5]) {
      const lineStart = code.lastIndexOf('\n', m.index - 1) + 1;
      tok(out, m[0], /^\s*#\s*include\b/.test(code.slice(lineStart, m.index)) ? 't-str' : '');
    }
    else if (m[6]) tok(out, m[0], 't-num');
    else {
      const w = m[0], next = code.slice(re.lastIndex).match(/^\s*(\()?/)[1];
      let cls = 't-var';
      if (C_CONTROL.has(w)) cls = 't-ctl';
      else if (C_TYPES.has(w) || C_CONSTS.has(w)) cls = 't-kw';
      else if (prevWord === 'struct' || prevWord === 'union' || prevWord === 'enum') cls = 't-type';
      else if (next === '(') cls = 't-fn';
      else if (/^[A-Z][A-Z0-9_]+$/.test(w)) cls = 't-const';
      tok(out, w, cls); prevWord = w;
    }
    last = re.lastIndex;
  }
  tok(out, code.slice(last));
  return out;
}
function highlightPython(code) {
  const out = [];
  const re = /(#[^\n]*)|([rbfuRBFU]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'))|(\b\d+(?:\.\d+)?\b)|(@[\w.]+)|([A-Za-z_]\w*)/g;
  let last = 0, m, prev = '';
  while ((m = re.exec(code))) {
    tok(out, code.slice(last, m.index));
    if (m[1]) tok(out, m[0], 't-com');
    else if (m[2]) tok(out, m[0], 't-str');
    else if (m[3]) tok(out, m[0], 't-num');
    else if (m[4]) tok(out, m[0], 't-fn');
    else {
      const w = m[0], next = code.slice(re.lastIndex).match(/^\s*(\()?/)[1];
      let cls = 't-var';
      if (PY_CONTROL.has(w)) cls = 't-ctl';
      else if (PY_CONSTS.has(w)) cls = 't-kw';
      else if (prev === 'def') cls = 't-fn';
      else if (prev === 'class') cls = 't-type';
      else if (PY_BUILTINS.has(w) || next === '(') cls = 't-fn';
      tok(out, w, cls); prev = w;
    }
    last = re.lastIndex;
  }
  tok(out, code.slice(last));
  return out;
}
function highlightJS(code) {
  const out = [];
  const re = /(\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;
  let last = 0, m;
  while ((m = re.exec(code))) {
    tok(out, code.slice(last, m.index));
    if (m[1]) tok(out, m[0], 't-com');
    else if (m[2]) tok(out, m[0], 't-str');
    else if (m[3]) tok(out, m[0], 't-num');
    else {
      const w = m[0], next = code.slice(re.lastIndex).match(/^\s*(\()?/)[1];
      tok(out, w, JS_CONTROL.has(w) ? 't-ctl' : JS_KW.has(w) ? 't-kw' : next === '(' ? 't-fn' : /^[A-Z]/.test(w) ? 't-type' : 't-var');
    }
    last = re.lastIndex;
  }
  tok(out, code.slice(last));
  return out;
}
function highlightXML(code) {
  const out = [];
  const re = /(<!--[\s\S]*?(?:-->|$))|(<\/?)([\w:.-]+)|(\/?>)|([\w:.-]+)(=)("[^"]*"|'[^']*')|(&\w+;)/g;
  let last = 0, m;
  while ((m = re.exec(code))) {
    tok(out, code.slice(last, m.index));
    if (m[1]) tok(out, m[0], 't-com');
    else if (m[2]) { tok(out, m[2], 't-punc'); tok(out, m[3], 't-kw'); }
    else if (m[4]) tok(out, m[0], 't-punc');
    else if (m[5]) { tok(out, m[5], 't-var'); tok(out, m[6]); tok(out, m[7], 't-str'); }
    else tok(out, m[0], 't-const');
    last = re.lastIndex;
  }
  tok(out, code.slice(last));
  return out;
}
// 셸 명령 한 줄. cmdStart: 줄 맨 앞 단어가 명령어 자리인지
function highlightShellLine(line, cmdStart = true) {
  const out = [];
  const re = /((?:^|(?<=\s))#.*$)|('[^']*'?|"(?:\\.|[^"\\])*"?)|(\$\{[^}]*\}|\$\(|\$[A-Za-z_]\w*|\$[?#@!$*0-9])|(\|\||&&|[|;&]|\))|((?<=\s|^)--?[A-Za-z0-9][\w-]*)|(\d+(?=\s|$))|([^\s'"|;&$()<>]+)/g;
  let last = 0, m, expectCmd = cmdStart;
  while ((m = re.exec(line))) {
    tok(out, line.slice(last, m.index));
    if (m[1]) tok(out, m[0], 't-com');
    else if (m[2]) tok(out, m[0], 't-str');
    else if (m[3]) { tok(out, m[0], 't-var'); if (m[0] === '$(') expectCmd = true; }
    else if (m[4]) { tok(out, m[0], 't-ctl'); if (m[0] !== ')') expectCmd = true; }
    else if (m[5]) tok(out, m[0], 't-var');
    else if (m[6]) tok(out, m[0], 't-num');
    else {
      const w = m[0];
      if (expectCmd && /^[A-Za-z_]\w*=/.test(w)) { const k = w.indexOf('='); tok(out, w.slice(0, k), 't-var'); tok(out, w.slice(k)); }
      else if (expectCmd) { tok(out, w, 't-fn'); expectCmd = w === 'sudo' || w === 'time' || w === 'exec'; }
      else tok(out, w);
    }
    last = re.lastIndex;
  }
  tok(out, line.slice(last));
  return out;
}
// bash 블록: 명령어 줄 앞에 $ 프롬프트 (복사할 때는 빠짐)
function highlightShellScript(code) {
  const lines = code.split('\n'), out = [];
  let continued = false, heredoc = null;
  lines.forEach((line, n) => {
    if (n) out.push(['\n', '']);
    if (heredoc) { tok(out, line, 't-str'); if (line.trim() === heredoc) heredoc = null; return; }
    if (!continued && line.trim()) out.push(['$ ', 't-prompt']);
    out.push(...highlightShellLine(line, !continued));
    const hd = /<<-?\s*['"]?(\w+)['"]?/.exec(line);
    if (hd) heredoc = hd[1];
    continued = /\\$/.test(line);
  });
  return out;
}
// 터미널 출력 로그: 프롬프트, [+] [!] 같은 상태 표시에 색
function highlightTerminalLog(code) {
  const out = [];
  let heredoc = null;
  code.split('\n').forEach((line, n) => {
    if (n) out.push(['\n', '']);
    if (heredoc) { tok(out, line, line.trim() === heredoc ? 't-str' : ''); if (line.trim() === heredoc) heredoc = null; return; }
    let m = /^([\w.-]+@[\w.-]+)(:)([^\s$#]*)([$#])(\s?)(.*)$/.exec(line);
    if (m) {
      tok(out, m[1], 't-user'); tok(out, m[2]); tok(out, m[3], 't-path'); tok(out, m[4]); tok(out, m[5]);
      out.push(...highlightShellLine(m[6]));
      const hd = /<<-?\s*['"]?(\w+)['"]?/.exec(m[6]); if (hd) heredoc = hd[1];
      return;
    }
    if ((m = /^(#)(\s)(.*)$/.exec(line))) { tok(out, m[1]); tok(out, m[2]); out.push(...highlightShellLine(m[3])); return; }
    if ((m = /^(\[[+!*\-]\])(.*)$/.exec(line))) {
      const cls = {'[+]': 't-ok', '[!]': 't-err', '[-]': 't-err', '[*]': 't-info'}[m[1]];
      tok(out, m[1], cls); tok(out, m[2], m[1] === '[!]' ? 't-err' : ''); return;
    }
    tok(out, line);
  });
  return out;
}
function looksLikeTerminalLog(code) {
  if (/^[\w.-]+@[\w.-]+:[^\s$#]*[$#]/m.test(code)) return true;
  return (code.match(/^\[[+!*\-]\] /gm) || []).length >= 2;
}
function renderCodeBlock(code, lang) {
  let kind = 'editor', tokens = null, label, icon, lineNumbers = false;
  if (TERMINAL_LANGS.includes(lang)) { kind = 'terminal'; tokens = highlightShellScript(code); }
  else if ((!lang || lang === 'text' || lang === 'txt' || lang === 'log' || lang === 'output') && looksLikeTerminalLog(code)) { kind = 'terminal'; tokens = highlightTerminalLog(code); }
  else {
    const info = CODE_LANGS[lang] || (lang && !['text', 'txt', 'plaintext'].includes(lang) ? {label: lang.toUpperCase(), icon: lang.slice(0, 2)} : {label: 'Plain Text', icon: '≡'});
    label = info.label; icon = info.icon;
    if (lang === 'c' || lang === 'h' || lang === 'cpp') tokens = highlightC(code);
    else if (lang === 'python' || lang === 'py') tokens = highlightPython(code);
    else if (lang === 'js' || lang === 'javascript' || lang === 'json') tokens = highlightJS(code);
    else if (lang === 'xml' || lang === 'html') tokens = highlightXML(code);
    else tokens = [[code, '']];
    lineNumbers = label !== 'Plain Text';
  }
  const win = mdEl('div', `code-window code-${kind}`);
  const head = mdEl('div', 'code-head');
  if (kind === 'terminal') {
    const tabs = mdEl('span', 'term-tabs');
    ['문제', '출력', '터미널'].forEach((t, k) => tabs.append(mdEl('span', k === 2 ? 'on' : '', t)));
    head.append(tabs, mdEl('span', 'term-shell', 'bash'));
  } else {
    const tab = mdEl('span', 'code-tab');
    const iconEl = mdEl('i', `code-icon code-icon-${(lang || 'text').replace(/[^a-z]/g, '') || 'text'}`, icon);
    tab.append(iconEl);
    if (icon !== label) tab.append(document.createTextNode(label)); else iconEl.classList.add('code-icon-only');
    head.append(tab);
  }
  const copy = mdEl('button', 'code-copy', '복사'); copy.type = 'button'; copy.setAttribute('aria-label', '코드 복사');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code); copy.textContent = '복사됨'; }
    catch { copy.textContent = '실패'; }
    setTimeout(() => { copy.textContent = '복사'; }, 1400);
  });
  head.append(copy);
  const pre = mdEl('pre', lineNumbers ? 'code-body has-lines' : 'code-body');
  const codeEl = mdEl('code');
  let lineEl = mdEl('span', 'cl');
  const flush = () => { if (!lineEl.childNodes.length) lineEl.append(document.createTextNode('')); codeEl.append(lineEl); };
  for (const [text, cls] of tokens) {
    const parts = text.split('\n');
    parts.forEach((part, k) => {
      if (k) { flush(); codeEl.append(document.createTextNode('\n')); lineEl = mdEl('span', 'cl'); }
      if (part) lineEl.append(cls ? mdEl('span', cls, part) : document.createTextNode(part));
    });
  }
  flush();
  pre.append(codeEl); win.append(head, pre);
  return win;
}
