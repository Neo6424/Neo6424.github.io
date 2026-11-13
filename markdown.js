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
      const code = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) code.push(lines[i++]);
      i++;
      const pre = mdEl('pre'); pre.append(mdEl('code', '', code.join('\n'))); target.append(pre);
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
  tocItems.forEach(h => {
    const li = mdEl('li', `toc-level-${h.level - minLevel + 1}`);
    const btn = mdEl('button', '', h.text); btn.type = 'button';
    btn.addEventListener('click', () => {
      h.el.scrollIntoView({behavior: 'smooth', block: 'start'});
      if (!window.matchMedia('(min-width: 900px)').matches) details.open = false;
    });
    li.append(btn); ol.append(li);
  });
  details.append(ol); nav.append(details);
  const layout = mdEl('div', 'post-layout'); layout.append(nav, text);
  container.append(layout);
}
