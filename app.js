const categories = ['개발', 'CTF/Wargame', 'Bug Bounty', '블로그/기술문서', '논문/컨퍼런스', '공모전/자격증'];
const repository = 'Neo6424/Neo6424.github.io';
const $ = selector => document.querySelector(selector);
const filters = $('#filters'), list = $('#post-list'), search = $('#search');
let active = '전체';
let opener;
let allPosts = posts.map(post => ({...post, source: 'local'}));
let visiblePosts = [];
let issueLoadState = 'loading';
function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function selectCategory(name, { focusFilter = true } = {}) {
  active = name;
  $('#archive-title').textContent = name === '전체' ? '전체 글' : name;
  renderFilters();
  renderPosts();
  if (focusFilter) filters.querySelector('[aria-pressed="true"]')?.focus();
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
  visiblePosts = result;
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
  issueLoadState = 'loading';
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
    issueLoadState = 'ready';
    status.textContent = '';
    renderPosts();
    if (currentPostView) renderPostView(currentPostView);
  } catch (error) {
    issueLoadState = 'error';
    status.textContent = 'GitHub 글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
    if (currentPostView) renderPostView(currentPostView);
  }
}

// 이 터미널은 블로그 탐색 전용입니다. 입력을 운영체제나 서버에 전달하지 않습니다.
const entryScreen = $('#entry-screen');
const entryInput = $('#entry-input');
const entryError = $('#entry-error');
const blogShell = $('#blog-shell');
const terminalInput = $('#terminal-input');
const terminalOutput = $('#terminal-output');
const contentPanel = $('#content-panel');
const categoryPanel = $('#category-panel');
const projectsPanel = $('#projects-panel');
const postsPanel = $('#posts-panel');
let currentPostView = null;

$('#entry-form').addEventListener('submit', event => {
  event.preventDefault();
  if (entryInput.value.trim() !== 'ssh neo6424@blog') {
    entryError.textContent = '안내된 명령어를 입력한 뒤 Enter를 눌러주세요.';
    entryInput.focus();
    return;
  }
  entryError.textContent = '';
  entryScreen.hidden = true;
  blogShell.hidden = false;
  terminalInput.focus();
});

function printTerminal(text, className = 'terminal-line') {
  const line = element('div', className, text);
  line.style.whiteSpace = 'pre-wrap';
  terminalOutput.append(line);
}

// Interactive views stay in the terminal. The shell never executes system commands.
function createView(title, focusContent) {
  const view = element('section', 'terminal-view');
  const heading = element('h3', 'terminal-view-heading', title);
  heading.tabIndex = -1;
  view.append(heading);
  terminalOutput.append(view);
  if (focusContent) heading.focus();
  return view;
}

function showProjects(focusContent = false) {
  currentPostView = null;
  const view = createView('프로젝트', focusContent);
  const grid = element('div', 'terminal-project-grid');
  const projects = [
    ['Secure Coding', 'CSRF·XSS 등을 고려한 Django 교육용 중고거래 서비스', 'https://github.com/Neo6424/Secure_coding_HW'],
    ['EvidenceBridge', '합성 로그와 SHA-256 기반 디지털 증거 무결성 검증 데모', 'https://github.com/Neo6424/evidencebridge']
  ];
  for (const [name, description, url] of projects) {
    const link = element('a', 'terminal-project');
    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.append(element('strong', '', name), element('span', '', description));
    grid.append(link);
  }
  view.append(grid);
}

function renderPostView(view) {
  view.replaceChildren();
  const heading = element('h3', 'terminal-view-heading', active === '전체' ? '전체 글' : active);
  heading.tabIndex = -1;
  view.append(heading);
  const actions = element('div', 'terminal-actions');
  const label = element('label', '', '새 글 카테고리');
  const categorySelect = element('select', 'terminal-action');
  categorySelect.setAttribute('aria-label', '새 글 카테고리');
  for (const name of categories) {
    const option = element('option', '', name);
    option.value = name;
    categorySelect.append(option);
  }
  categorySelect.value = categories.includes(active) ? active : categories[0];
  const write = element('a', 'terminal-action', '글쓰기 ↗');
  write.target = '_blank'; write.rel = 'noopener noreferrer';
  const setWriteLink = () => { write.href = `https://github.com/${repository}/issues/new?title=${encodeURIComponent(`[${categorySelect.value}] `)}`; };
  categorySelect.addEventListener('change', setWriteLink); setWriteLink();
  label.append(categorySelect); actions.append(label, write); view.append(actions);
  view.append(element('p', 'terminal-view-note', 'GitHub에서 작성하며 공개됩니다. 제목 앞의 카테고리는 유지해 주세요.'));
  if (issueLoadState === 'loading') {
    view.append(element('p', 'terminal-view-note', '글을 불러오는 중입니다.'));
  } else if (issueLoadState === 'error') {
    view.append(element('p', 'terminal-view-note', 'GitHub 글을 불러오지 못했습니다. 새로고침해 주세요.'));
  } else if (!visiblePosts.length) {
    view.append(element('p', 'terminal-view-note', '해당하는 글이 없습니다.'));
  } else {
    const grid = element('div', 'terminal-card-grid');
    visiblePosts.forEach((post, i) => appendCard(grid, `${i + 1}. ${post.title}`, post.category, 'posts', button => openPost(post, button)));
    view.append(grid);
  }
  return heading;
}

function showView(view, category = '전체', focusContent = false, query = '') {
  contentPanel.hidden = true;
  if (view === 'projects') { showProjects(focusContent); return; }
  search.value = query;
  selectCategory(category, {focusFilter: false});
  currentPostView = element('section', 'terminal-view');
  terminalOutput.append(currentPostView);
  const heading = renderPostView(currentPostView);
  if (focusContent) heading.focus();
}

function showHelp() {
  const help = element('div', 'help-grid');
  const items = [
    ['help', '명령어 목록 보기'], ['ls', '카테고리와 프로젝트 둘러보기'],
    ['cd <이름>', '카테고리나 프로젝트 열기'], ['search <검색어>', '글 검색 · 검색어 없이 입력하면 초기화'],
    ['posts', '현재 글 목록 보기'], ['open <번호>', '목록에서 글 열기'], ['clear', '터미널 출력 지우기']
  ];
  for (const [command, description] of items) {
    const row = element('div', 'help-row');
    row.append(element('code', 'help-command', command), element('span', 'help-description', description));
    help.append(row);
  }
  terminalOutput.append(help);
}

function appendCard(grid, name, description, kind, onSelect) {
  const button = element('button', `terminal-card terminal-card--${kind}`);
  button.type = 'button';
  button.append(element('span', 'terminal-card-name', name), element('span', 'terminal-card-desc', description));
  button.addEventListener('click', () => onSelect(button));
  grid.append(button);
}

function showDirectoryCards() {
  const grid = element('div', 'terminal-card-grid');
  appendCard(grid, 'projects/', '프로젝트 · cd projects', 'project', () => showView('projects', '전체', true));
  appendCard(grid, 'posts/', '전체 글 · cd posts', 'posts', () => showView('posts', '전체', true));
  const entries = [
    ['dev/', '개발', '개발'],
    ['ctf/', 'CTF/Wargame', 'CTF/Wargame'],
    ['bounty/', 'Bug Bounty', 'Bug Bounty'],
    ['blog/', '블로그/기술문서', '블로그/기술문서'],
    ['paper/', '논문/컨퍼런스', '논문/컨퍼런스'],
    ['contest/', '공모전/자격증', '공모전/자격증']
  ];
  for (const [name, description, category] of entries) {
    appendCard(grid, name, description, 'directory', () => showView('posts', category, true));
  }
  terminalOutput.append(grid);
}

function showPostCards() {
  const grid = element('div', 'terminal-card-grid');
  visiblePosts.forEach((post, i) => {
    appendCard(grid, `${i + 1}. ${post.title}`, post.category, 'posts', button => openPost(post, button));
  });
  terminalOutput.append(grid);
}

const categoryAliases = {
  all: '전체', 전체: '전체', '..': '전체', '~': '전체',
  dev: '개발', development: '개발', 개발: '개발',
  ctf: 'CTF/Wargame', wargame: 'CTF/Wargame', 'ctf/wargame': 'CTF/Wargame',
  bounty: 'Bug Bounty', 'bug bounty': 'Bug Bounty',
  blog: '블로그/기술문서', docs: '블로그/기술문서', '블로그/기술문서': '블로그/기술문서',
  paper: '논문/컨퍼런스', conference: '논문/컨퍼런스', '논문/컨퍼런스': '논문/컨퍼런스',
  contest: '공모전/자격증', cert: '공모전/자격증', '공모전/자격증': '공모전/자격증'
};

function runTerminalCommand(value) {
  const command = value.trim();
  if (!command) return;
  const parts = /^(\S+)(?:\s+([\s\S]*))?$/.exec(command);
  const verb = parts[1].toLowerCase();
  const argument = (parts[2] || '').trim();
  if (verb === 'clear' && !argument) {
    terminalOutput.replaceChildren();
    currentPostView = null;
    return;
  }
  printTerminal(`neo6424@blog:~$ ${command}`, 'terminal-command-line');
  switch (verb) {
    case 'help':
      showHelp();
      break;
    case 'ls':
      showDirectoryCards();
      break;
    case 'cd': {
      const key = argument.toLocaleLowerCase().replace(/\/$/, '');
      if (['projects', '프로젝트'].includes(key)) {
        showView('projects');
        printTerminal('프로젝트를 열었습니다.');
        break;
      }
      if (['posts', '글'].includes(key)) {
        showView('posts');
        printTerminal('전체 글을 열었습니다.');
        break;
      }
      const target = Object.hasOwn(categoryAliases, key) ? categoryAliases[key] : null;
      if (!target) { printTerminal('카테고리를 찾을 수 없습니다. ls로 목록을 확인하세요.'); break; }
      showView('posts', target);
      printTerminal(`${target} 카테고리를 선택했습니다.`);
      break;
    }
    case 'search':
      showView('posts', active, false, argument);
      break;
    case 'posts':
      if (issueLoadState === 'loading') { printTerminal('글을 불러오는 중입니다. 잠시 후 다시 입력하세요.'); break; }
      if (issueLoadState === 'error') printTerminal('GitHub 글을 불러오지 못했습니다. 화면을 새로고침해 주세요.');
      if (!visiblePosts.length) { if (issueLoadState !== 'error') printTerminal('표시할 글이 없습니다.'); break; }
      showPostCards();
      break;
    case 'open': {
      if (issueLoadState === 'loading') { printTerminal('글을 불러오는 중입니다. 잠시 후 다시 입력하세요.'); break; }
      if (issueLoadState === 'error' && !visiblePosts.length) { printTerminal('GitHub 글을 불러오지 못했습니다. 화면을 새로고침해 주세요.'); break; }
      if (!/^[1-9]\d*$/.test(argument) || Number(argument) > visiblePosts.length) {
        printTerminal('글 번호를 확인하세요. posts로 목록을 볼 수 있습니다.');
        break;
      }
      openPost(visiblePosts[Number(argument) - 1], terminalInput);
      break;
    }
    default:
      printTerminal('알 수 없는 명령어입니다. help로 사용 가능한 명령어를 확인하세요.');
  }
}

$('#terminal-form').addEventListener('submit', event => {
  event.preventDefault();
  const command = terminalInput.value;
  terminalInput.value = '';
  const previousCount = terminalOutput.children.length;
  runTerminalCommand(command);
  if (!$('#post-dialog').open) terminalInput.focus({preventScroll: true});
  const firstNew = terminalOutput.children[previousCount];
  const lastNew = terminalOutput.lastElementChild;
  if (firstNew && lastNew && typeof window !== 'undefined' && typeof firstNew.getBoundingClientRect === 'function') {
    const firstBounds = firstNew.getBoundingClientRect();
    const lastBounds = lastNew.getBoundingClientRect();
    if (firstBounds.top < 0 || lastBounds.bottom > window.innerHeight - 16) {
      firstNew.scrollIntoView({block: 'start'});
    }
  }
});
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
