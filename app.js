const categories = ['개발', 'CTF/Wargame', 'Bug Bounty', '블로그/기술문서', '논문/컨퍼런스', '공모전/자격증'];
const repository = 'Neo6424/Neo6424.github.io';
const $ = selector => document.querySelector(selector);
const filters = $('#filters'), list = $('#post-list'), search = $('#search');
let active = '전체';
let opener;
let allPosts = posts.map(post => ({...post, source: 'local'}));
function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function selectCategory(name) {
  active = name;
  $('#archive-title').textContent = name === '전체' ? '전체 글' : name;
  renderFilters();
  renderPosts();
  filters.querySelector('[aria-pressed="true"]')?.focus();
}
function renderFilters() {
  filters.replaceChildren();
  ['전체', ...categories].forEach(name => {
    const btn = element('button', active === name ? 'filter active' : 'filter', name);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(active === name));
    btn.addEventListener('click', () => selectCategory(name));
    filters.append(btn);
  });
}
function renderPosts() {
  const query = search.value.trim().toLocaleLowerCase();
  const result = allPosts.filter(p => (active === '전체' || p.category === active) && [p.title, p.description, p.category, ...(p.paragraphs || []), p.body || ''].join(' ').toLocaleLowerCase().includes(query));
  list.replaceChildren();
  $('#result-count').textContent = `${result.length}개의 글`;
  $('#empty').hidden = result.length > 0;
  result.forEach(p => {
    const btn = element('button', 'post');
    btn.type = 'button';
    btn.append(element('span', 'post-category', p.category), element('h3', '', p.title));
    if (p.description) btn.append(element('p', '', p.description));
    btn.addEventListener('click', () => openPost(p, btn));
    list.append(btn);
  });
}
// Treat issue text as text, not HTML. Only http(s) links are made clickable.
function appendInline(parent, value) {
  const tokens = /(!?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*)/g;
  let last = 0, match;
  while ((match = tokens.exec(value))) {
    parent.append(document.createTextNode(value.slice(last, match.index)));
    if (match[2] && match[3]) {
      if (match[1].startsWith('!')) {
        const img = element('img', 'post-image');
        img.alt = match[2]; img.src = match[3]; img.loading = 'lazy';
        parent.append(img);
      } else {
        const link = element('a', '', match[2]);
        link.href = match[3]; link.target = '_blank'; link.rel = 'noopener noreferrer';
        parent.append(link);
      }
    } else if (match[4]) parent.append(element('code', '', match[4]));
    else if (match[5]) parent.append(element('strong', '', match[5]));
    last = tokens.lastIndex;
  }
  parent.append(document.createTextNode(value.slice(last)));
}
function renderMarkdown(target, body) {
  const lines = (body || '').replace(/\r\n?/g, '\n').split('\n');
  let paragraph = [], items = null, code = null;
  function flushParagraph() {
    if (!paragraph.length) return;
    const p = element('p'); appendInline(p, paragraph.join('\n')); target.append(p); paragraph = [];
  }
  function flushList() { if (items) { target.append(items); items = null; } }
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      flushParagraph(); flushList();
      if (code === null) code = [];
      else { const pre = element('pre'); pre.append(element('code', '', code.join('\n'))); target.append(pre); code = null; }
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const item = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph(); flushList();
      const h = element('h' + Math.min(heading[1].length + 2, 6)); appendInline(h, heading[2]); target.append(h);
    } else if (item) {
      flushParagraph(); if (!items) items = element('ul');
      const li = element('li'); appendInline(li, item[1]); items.append(li);
    } else { flushList(); paragraph.push(line); }
  }
  flushParagraph(); flushList();
  if (code !== null) { const pre = element('pre'); pre.append(element('code', '', code.join('\n'))); target.append(pre); }
}
function openPost(p, button) {
  opener = button;
  const target = $('#dialog-content'); target.replaceChildren();
  const heading = element('h2', '', p.title); heading.id = 'dialog-title';
  target.append(element('p', 'dialog-category', p.category), heading);
  const text = element('div', 'dialog-text');
  if (p.source === 'issue') renderMarkdown(text, p.body);
  else p.paragraphs.forEach(paragraph => text.append(element('p', '', paragraph)));
  target.append(text);
  if (p.source === 'issue') {
    const edit = element('a', 'edit-link', 'GitHub에서 수정하기');
    edit.href = p.url; edit.target = '_blank'; edit.rel = 'noopener noreferrer'; target.append(edit);
  }
  $('#post-dialog').showModal();
}
function updateWriteLink() {
  const title = `[${$('#write-category').value}] `;
  $('#write-link').href = `https://github.com/${repository}/issues/new?title=${encodeURIComponent(title)}`;
}
async function loadIssues() {
  const status = $('#load-status'); status.textContent = '글을 불러오는 중입니다.';
  const issues = [];
  try {
    for (let page = 1; ; page++) {
      const url = `https://api.github.com/repos/${repository}/issues?state=open&creator=Neo6424&per_page=100&page=${page}`;
      const response = await fetch(url, {headers: {'Accept': 'application/vnd.github+json'}});
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('Invalid response');
      issues.push(...batch);
      if (batch.length < 100) break;
    }
    const fromIssues = issues.filter(issue => !issue.pull_request && issue.user?.login?.toLowerCase() === 'neo6424').map(issue => {
      const match = /^\[([^\]]+)\]\s*(.+)$/.exec(issue.title);
      if (!match || !categories.includes(match[1])) return null;
      const body = issue.body || '';
      return {source: 'issue', category: match[1], title: match[2], description: body.replace(/\s+/g, ' ').slice(0, 110), body, url: `https://github.com/${repository}/issues/${issue.number}`, date: issue.created_at};
    }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    allPosts = [...fromIssues, ...posts.map(post => ({...post, source: 'local'}))];
    status.textContent = '';
    renderPosts();
  } catch (error) {
    status.textContent = 'GitHub 글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
  }
}
for (const name of categories) {
  const option = element('option', '', name); option.value = name; $('#write-category').append(option);
}
$('#write-category').addEventListener('change', updateWriteLink);
updateWriteLink();
$('.dialog-close').addEventListener('click', () => $('#post-dialog').close());
$('#post-dialog').addEventListener('click', event => { if (event.target === $('#post-dialog')) $('#post-dialog').close(); });
$('#post-dialog').addEventListener('close', () => opener?.focus());
search.addEventListener('input', renderPosts);
renderFilters(); renderPosts(); loadIssues();
