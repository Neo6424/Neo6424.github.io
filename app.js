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
      return {source: 'issue', number: issue.number, category: match[1], title: match[2], description: body.replace(/\s+/g, ' ').slice(0, 110), body, url: `https://github.com/${repository}/issues/${issue.number}`, date: issue.created_at};
    }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    allPosts = [...fromIssues, ...posts.map(post => ({...post, source: 'local'}))];
    issueLoadState = 'ready';
    status.textContent = '';
    renderPosts();
    if (currentPostView) updatePostViewResults(currentPostView);
  } catch (error) {
    issueLoadState = 'error';
    status.textContent = 'GitHub 글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
    if (currentPostView) updatePostViewResults(currentPostView);
  }
}

// 블로그 내부의 가상 경로입니다. 운영체제 명령은 실행하지 않습니다.
const entryScreen = $('#entry-screen');
const entryInput = $('#entry-input');
const entryError = $('#entry-error');
const blogShell = $('#blog-shell');
const terminalInput = $('#terminal-input');
const terminalOutput = $('#terminal-output');
let currentPostView = null;
const HOME = '/home/neo6424';
let cwd = HOME;
let lastListedPosts = [];
const categoryDirectories = [
  ['dev', '개발'], ['ctf', 'CTF/Wargame'], ['bounty', 'Bug Bounty'],
  ['blog', '블로그/기술문서'], ['paper', '논문/컨퍼런스'], ['contest', '공모전/자격증']
];
const projectDirectories = {
  evidencebridge: {title:'EvidenceBridge', description:'합성 로그와 SHA-256 기반 디지털 증거 무결성 검증 데모', url:'https://github.com/Neo6424/evidencebridge'}
};
function promptPath(path = cwd) { return path === HOME ? '~' : path.startsWith(HOME + '/') ? '~' + path.slice(HOME.length) : path; }
function updatePrompt() {
  const label = promptPath();
  const path = $('#current-path'); if (path) path.textContent = label;
  const header = $('#current-path-heading'); if (header) header.textContent = label;
  const location = $('#terminal-location'); if (location) location.textContent = `현재 위치: ${cwd}`;
}
function directoryChildren(path) {
  if (path === '/') return [{name:'home', label:'home'}];
  if (path === '/home') return [{name:'neo6424', label:'neo6424'}];
  if (path === HOME) return [{name:'projects', label:'프로젝트'}, {name:'posts', label:'글'}];
  if (path === HOME + '/projects') return Object.entries(projectDirectories).map(([name, project]) => ({name, label:project.title}));
  if (path === HOME + '/posts') return categoryDirectories.map(([name, label]) => ({name, label}));
  return [];
}
function directoryExists(path) {
  return path === '/' || path === '/home' || path === HOME || path === HOME + '/projects' || path === HOME + '/posts' ||
    categoryDirectories.some(([name]) => path === `${HOME}/posts/${name}`) ||
    Object.keys(projectDirectories).some(name => path === `${HOME}/projects/${name}`);
}
function resolveDirectory(input) {
  const raw = (input || '~').trim();
  if (raw.includes('~') && raw !== '~' && !raw.startsWith('~/')) return null;
  let parts = raw.startsWith('/') ? [] : raw === '~' || raw.startsWith('~/') ? HOME.slice(1).split('/') : cwd.slice(1).split('/').filter(Boolean);
  const rest = raw === '~' ? '' : raw.startsWith('~/') ? raw.slice(2) : raw;
  for (const part of rest.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') { parts.pop(); continue; }
    const candidate = '/' + [...parts, part].join('/');
    if (!directoryExists(candidate)) return null;
    parts.push(part);
  }
  const result = '/' + parts.join('/');
  return directoryExists(result) ? result : null;
}
function categoryForPath(path) {
  const match = categoryDirectories.find(([name]) => path === `${HOME}/posts/${name}`);
  return match ? match[1] : null;
}
function projectForPath(path) {
  return Object.entries(projectDirectories).find(([name]) => path === `${HOME}/projects/${name}`)?.[1] || null;
}
function fileName(post, index) { return post.number ? `${post.number}.md` : `local-${index + 1}.md`; }
function printTerminal(text, className = 'terminal-line') {
  const line = element('div', className, text); line.style.whiteSpace = 'pre-wrap'; terminalOutput.append(line);
}
function resetOutput(command = '', path = cwd) {
  terminalOutput.replaceChildren(); terminalOutput.scrollTop = 0; currentPostView = null;
  if (command) printTerminal(`neo6424@blog:${promptPath(path)}$ ${command}`, 'terminal-command-line');
}
function parentDirectory(path) {
  if (path === '/') return '/';
  return path.slice(0, path.lastIndexOf('/')) || '/';
}
function addBack(view, targetPath = cwd, moveToTarget = false) {
  const button = element('button', 'terminal-back', '← 목록으로'); button.type = 'button';
  button.addEventListener('click', () => {
    if (moveToTarget) { navigate(targetPath, true); return; }
    resetOutput(targetPath === cwd ? 'ls' : `ls ${targetPath}`);
    showDirectory(targetPath, true);
  });
  view.append(button);
}
function makeView(title, focusContent = false, backPath = cwd, moveBack = false) {
  const view = element('section', 'terminal-view'); addBack(view, backPath, moveBack);
  const heading = element('h3', 'terminal-view-heading', title); heading.tabIndex = -1; view.append(heading); terminalOutput.append(view);
  if (focusContent) heading.focus({preventScroll:true}); return view;
}
function addDirectoryItem(group, label, alias, onSelect) {
  const button = element('button', 'directory-item'); button.type = 'button';
  const arrow = element('span', 'directory-chevron', '→'); arrow.setAttribute('aria-hidden', 'true');
  button.append(element('span', 'directory-name', label), element('span', 'directory-alias', alias), arrow);
  button.addEventListener('click', () => onSelect(button)); group.append(button);
}
function navigate(path, focusContent = false) {
  const previous = cwd;
  cwd = path; updatePrompt(); search.value = '';
  const category = categoryForPath(cwd); selectCategory(category || '전체', {focusFilter:false});
  resetOutput(`cd ${path}`, previous); showDirectory(cwd, focusContent);
}
function directoryList(path, focusContent = false) {
  const box = element('div', 'directory-list'); box.setAttribute('tabindex', '-1'); box.setAttribute('aria-label', `${path} 디렉터리`);
  const group = element('section', 'directory-group'); group.append(element('h3', 'directory-heading', path));
  for (const child of directoryChildren(path)) {
    const target = (path === '/' ? '' : path) + '/' + child.name;
    addDirectoryItem(group, child.label, `${child.name}/`, () => navigate(target, true));
  }
  box.append(group); terminalOutput.append(box); if (focusContent) box.focus({preventScroll:true});
}
function renderPostView(view, category = active) {
  view.replaceChildren(); addBack(view, view._backPath, view._moveBack);
  const heading = element('h3', 'terminal-view-heading', category === '전체' ? '전체 글' : category); heading.tabIndex = -1; view.append(heading);
  const actions = element('div', 'terminal-actions');
  const label = element('label', '', '새 글 카테고리'); const categorySelect = element('select', 'terminal-action');
  categorySelect.setAttribute('aria-label', '새 글 카테고리');
  for (const name of categories) { const option = element('option', '', name); option.value = name; categorySelect.append(option); }
  categorySelect.value = categories.includes(category) ? category : categories[0];
  const write = element('a', 'terminal-action', '글쓰기 ↗'); write.target = '_blank'; write.rel = 'noopener noreferrer';
  const setWriteLink = () => { write.href = `https://github.com/${repository}/issues/new?title=${encodeURIComponent(`[${categorySelect.value}] `)}`; };
  categorySelect.addEventListener('change', setWriteLink); setWriteLink(); label.append(categorySelect); actions.append(label, write); view.append(actions);
  view.append(element('p', 'terminal-view-note', 'GitHub에서 작성하며 공개됩니다. 제목 앞의 카테고리는 유지해 주세요.'));
  const results = element('div', 'terminal-post-results'); view.append(results); updatePostViewResults(view); return heading;
}
function updatePostViewResults(view) {
  const results = view.querySelector('.terminal-post-results'); if (!results) return; results.replaceChildren();
  const selected = view._category || '전체';
  const query = (view._query || '').trim().toLocaleLowerCase();
  const matches = allPosts.filter(p => (selected === '전체' || p.category === selected) && [p.title, p.description, p.category, ...(p.paragraphs || []), p.body || ''].join(' ').toLocaleLowerCase().includes(query));
  if (view._affectSelection) lastListedPosts = matches;
  if (issueLoadState === 'loading') return results.append(element('p','terminal-view-note','글을 불러오는 중입니다.'));
  if (issueLoadState === 'error') return results.append(element('p','terminal-view-note','GitHub 글을 불러오지 못했습니다. 새로고침해 주세요.'));
  if (!matches.length) return results.append(element('p','terminal-view-note','해당하는 글이 없습니다.'));
  const group = element('div','directory-list');
  matches.forEach((post, i) => addDirectoryItem(group, post.title, fileName(post, i), button => openPost(post, button)));
  results.append(group);
}
function showPostDirectory(path, focusContent = false, query = '', affectSelection = path === cwd, backPath = parentDirectory(path), moveBack = path === cwd) {
  if (affectSelection) { search.value = query; selectCategory(categoryForPath(path) || '전체', {focusFilter:false}); }
  currentPostView = element('section','terminal-view'); terminalOutput.append(currentPostView);
  currentPostView._category = categoryForPath(path) || '전체';
  currentPostView._query = query;
  currentPostView._affectSelection = affectSelection;
  currentPostView._backPath = backPath;
  currentPostView._moveBack = moveBack;
  const heading = renderPostView(currentPostView, categoryForPath(path) || '전체');
  if (focusContent) heading.focus({preventScroll:true});
}
function showDirectory(path, focusContent = false) {
  const project = projectForPath(path);
  if (project) {
    const view = makeView(project.title, focusContent, parentDirectory(path), path === cwd);
    view.append(element('p','terminal-view-note',project.description));
    const link = element('a','terminal-action','GitHub에서 보기 ↗'); link.href = project.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; view.append(link);
    const files = element('div','directory-list'); addDirectoryItem(files,'프로젝트 설명','README.md',() => showReadme(path, true)); view.append(files); return;
  }
  if (categoryForPath(path)) { showPostDirectory(path, focusContent); return; }
  directoryList(path, focusContent);
}
function showReadme(path, focusContent = false) {
  const project = projectForPath(path); if (!project) { printTerminal('파일을 찾을 수 없습니다.'); return; }
  resetOutput('cat README.md'); const view = makeView('README.md', focusContent, path);
  view.append(element('p','terminal-view-note',project.description));
  const link = element('a','terminal-action','GitHub에서 보기 ↗'); link.href = project.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; view.append(link);
}
function showHelp() {
  const help = element('div','help-grid');
  const commands = [['pwd','현재 경로 보기'],['ls [경로]','디렉터리 보기'],['cd [경로]','디렉터리 이동'],['cd ..','상위 디렉터리 이동'],['tree','전체 구조 보기'],['cat <파일명>','파일 내용 보기'],['search <검색어>','글 검색'],['posts','현재 글 목록'],['open <번호>','목록의 글 열기'],['clear','출력 지우기'],['help','명령어 도움말']];
  for (const [name, description] of commands) { const row=element('div','help-row'); row.append(element('code','help-command',name),element('span','help-description',description)); help.append(row); } terminalOutput.append(help);
}
function showPostCards() {
  const grid = element('div','terminal-card-grid');
  lastListedPosts = visiblePosts;
  visiblePosts.forEach((post,i) => { const button=element('button','terminal-card terminal-card--posts'); button.type='button'; button.append(element('span','terminal-card-name',`${i + 1}. ${post.title}`),element('span','terminal-card-desc',`${post.category} · ${fileName(post,i)}`)); button.addEventListener('click',()=>openPost(post,button)); grid.append(button); }); terminalOutput.append(grid);
}
function showPostText(post, name) {
  const view=makeView(name); view.append(element('p','terminal-view-note',post.title));
  const text=element('div','dialog-text'); if (post.source === 'issue') renderMarkdown(text,post.body); else post.paragraphs.forEach(p=>text.append(element('p','',p))); view.append(text);
  if (post.source === 'issue') { const link=element('a','terminal-action','GitHub에서 수정하기 ↗'); link.href=post.url; link.target='_blank'; link.rel='noopener noreferrer'; view.append(link); }
}
function runTerminalCommand(value) {
  const command=value.trim(); if (!command) return;
  const parts=/^(\S+)(?:\s+([\s\S]*))?$/.exec(command); const verb=parts[1].toLowerCase(); const arg=(parts[2] || '').trim();
  const previous=cwd; if (verb === 'clear' && !arg) { resetOutput(); return; } resetOutput(command, previous);
  switch (verb) {
    case 'help': showHelp(); break;
    case 'pwd': printTerminal(cwd); break;
    case 'tree': printTerminal('/\n└── home/\n    └── neo6424/\n        ├── projects/\n        │   └── evidencebridge/\n        │       └── README.md\n        └── posts/\n            ├── dev/          개발\n            ├── ctf/          CTF/Wargame\n            ├── bounty/       Bug Bounty\n            ├── blog/         블로그/기술문서\n            ├── paper/        논문/컨퍼런스\n            └── contest/      공모전/자격증'); break;
    case 'ls': { const target=resolveDirectory(arg || '.'); if (!target) { printTerminal(`ls: 디렉터리를 찾을 수 없습니다: ${arg}`); break; } showDirectory(target); break; }
    case 'cd': { const target=resolveDirectory(arg || '~'); if (!target) { printTerminal(`cd: 디렉터리를 찾을 수 없습니다: ${arg}`); break; } cwd=target; updatePrompt(); search.value=''; selectCategory(categoryForPath(cwd) || '전체',{focusFilter:false}); showDirectory(cwd); break; }
    case 'cat': {
      if (arg === 'README.md' && projectForPath(cwd)) { const project=projectForPath(cwd); const view=makeView('README.md'); view.append(element('p','terminal-view-note',project.description)); const link=element('a','terminal-action','GitHub에서 보기 ↗'); link.href=project.url; link.target='_blank'; link.rel='noopener noreferrer'; view.append(link); break; }
      if (categoryForPath(cwd)) { const current=allPosts.filter(post=>post.category===categoryForPath(cwd)); const post=current.find((item,i)=>fileName(item,i)===arg); if (post) { showPostText(post,arg); break; } }
      printTerminal(`cat: 파일을 찾을 수 없습니다: ${arg}`); break;
    }
    case 'search': showPostDirectory(categoryForPath(cwd) ? cwd : HOME+'/posts',false,arg,true,cwd,false); break;
    case 'posts':
      if (issueLoadState === 'loading') { printTerminal('글을 불러오는 중입니다. 잠시 후 다시 입력하세요.'); break; }
      if (issueLoadState === 'error') { printTerminal('GitHub 글을 불러오지 못했습니다. 새로고침해 주세요.'); break; }
      if (!visiblePosts.length) { printTerminal('표시할 글이 없습니다.'); break; } showPostCards(); break;
    case 'open': {
      if (issueLoadState === 'loading') { printTerminal('글을 불러오는 중입니다. 잠시 후 다시 입력하세요.'); break; }
      if (issueLoadState === 'error') { printTerminal('GitHub 글을 불러오지 못했습니다. 새로고침해 주세요.'); break; }
      if (!/^[1-9]\d*$/.test(arg) || Number(arg)>lastListedPosts.length) { printTerminal('글 번호를 확인하세요. posts로 목록을 볼 수 있습니다.'); break; }
      openPost(lastListedPosts[Number(arg)-1],terminalInput); break;
    }
    default: printTerminal('알 수 없는 명령어입니다. help로 사용 가능한 명령어를 확인하세요.');
  }
}
// The cat only starts chatting after the visitor enters the blog.
let catChatStarted = false;
function startHeaderCat() {
  const speech = $('#header-cat-speech');
  if (!speech || catChatStarted) return;
  catChatStarted = true;
  const messages = ['천천히 둘러보세요, 냥.', '오늘도 좋은 발견이 있길!', '잠깐 쉬어가도 좋아요.', '궁금하면 help를 입력해 보세요.'];
  let messageIndex = 0;
  window.setInterval(() => {
    if (document.hidden) return;
    speech.textContent = messages[messageIndex++ % messages.length];
  }, 30000);
}
$('#entry-form').addEventListener('submit', event => {
  event.preventDefault();
  const entryCommand = entryInput.value.trim();
  if (entryCommand === 'help') {
    entryError.className = 'entry-note';
    entryError.textContent = '접속 형식: ssh user@blog';
    entryInput.value = '';
    entryInput.focus();
    return;
  }
  if (entryCommand === 'ssh cat@blog') { window.location.assign('./secret.html'); return; }
  if (entryCommand !== 'ssh neo6424@blog') { entryError.className='entry-error'; entryError.textContent='알 수 없는 명령어입니다. help로 접속 형식을 확인하세요.'; entryInput.focus(); return; }
  entryError.textContent=''; entryScreen.hidden=true; blogShell.hidden=false; updatePrompt(); startHeaderCat(); terminalInput.focus();
});
// Tab completion only inspects the blog's virtual tree; it never executes shell commands.
const completionCommands = ['cat', 'cd', 'clear', 'help', 'ls', 'open', 'posts', 'pwd', 'search', 'tree'];
let completionNotice = null;
let lastCompletionSignature = '';
function clearCompletionNotice() {
  if (completionNotice) completionNotice.textContent = '';
  lastCompletionSignature = '';
}
function showCompletionNotice(matches) {
  if (!completionNotice) {
    completionNotice = element('span', 'completion-suggestions');
    completionNotice.setAttribute('role', 'status');
    completionNotice.setAttribute('aria-live', 'polite');
    completionNotice.style.display = 'block';
    completionNotice.style.marginTop = '6px';
    completionNotice.style.color = '#b8d4e8';
    completionNotice.style.overflowWrap = 'anywhere';
    $('#terminal-hint').append(completionNotice);
  }
  completionNotice.textContent = `자동 완성 후보: ${matches.join('  ')}`;
}
function commonCompletionPrefix(values) {
  return values.reduce((prefix, value) => {
    let i = 0;
    while (i < prefix.length && i < value.length && prefix[i] === value[i]) i++;
    return prefix.slice(0, i);
  });
}
function getCompletionCandidates(value, cursor) {
  const before = value.slice(0, cursor);
  const tokenStart = before.search(/\S*$/);
  const token = before.slice(tokenStart);
  const initial = before.slice(0, tokenStart);
  if (!initial.trim()) return { tokenStart, token, candidates: completionCommands, kind: 'command' };
  const match = /^\s*(\S+)\s+$/.exec(initial);
  if (!match) return null;
  const command = match[1].toLowerCase();
  if (command !== 'cd' && command !== 'ls' && command !== 'cat') return null;
  if (command === 'cat') {
    if (token.includes('/')) return null; // cat currently accepts files in the current directory.
    let files = [];
    if (projectForPath(cwd)) files = ['README.md'];
    else if (categoryForPath(cwd)) files = allPosts.filter(post => post.category === categoryForPath(cwd)).map(fileName);
    return { tokenStart, token, candidates: files, kind: 'file' };
  }
  if (token === '~' || token === '.' || token === '..') {
    return { tokenStart, token, candidates: [token + '/'], kind: 'directory' };
  }
  const slash = token.lastIndexOf('/');
  const base = slash < 0 ? '' : token.slice(0, slash + 1);
  const prefix = slash < 0 ? token : token.slice(slash + 1);
  const path = base ? resolveDirectory(base) : cwd;
  if (!path) return null;
  return { tokenStart, token, candidates: directoryChildren(path).map(child => base + child.name + '/'), kind: 'directory', prefix };
}
$('#terminal-form').addEventListener('submit', clearCompletionNotice);
terminalInput.addEventListener('input', clearCompletionNotice);
terminalInput.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
  const value = terminalInput.value;
  const start = terminalInput.selectionStart ?? value.length;
  const end = terminalInput.selectionEnd ?? start;
  if (!value.trim() || start !== end || (start < value.length && !/\s/.test(value[start]))) {
    clearCompletionNotice(); return;
  }
  const result = getCompletionCandidates(value, start);
  if (!result) { clearCompletionNotice(); return; }
  const matches = result.candidates.filter(candidate => candidate.startsWith(result.token));
  if (!matches.length) { clearCompletionNotice(); return; }
  let replacement = matches.length === 1 ? matches[0] : commonCompletionPrefix(matches);
  if (matches.length === 1 && result.kind !== 'directory' && start === value.length) replacement += ' ';
  if (replacement !== result.token) {
    event.preventDefault();
    terminalInput.setRangeText(replacement, result.tokenStart, start, 'end');
    clearCompletionNotice();
    return;
  }
  if (matches.length > 1) {
    const signature = `${value}\n${start}\n${matches.join('\n')}`;
    if (lastCompletionSignature === signature) { clearCompletionNotice(); return; }
    event.preventDefault();
    showCompletionNotice(matches);
    lastCompletionSignature = signature;
  } else clearCompletionNotice();
});
// Keep the command history in this page session, as a shell would.
const commandHistory = [];
let historyIndex = 0;
let historyDraft = '';
terminalInput.addEventListener('keydown', event => {
  if ((event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || event.isComposing || event.keyCode === 229 ||
      event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || !commandHistory.length) return;
  event.preventDefault();
  if (event.key === 'ArrowUp') {
    if (historyIndex === commandHistory.length) historyDraft = terminalInput.value;
    historyIndex = Math.max(0, historyIndex - 1);
  } else {
    historyIndex = Math.min(commandHistory.length, historyIndex + 1);
  }
  terminalInput.value = historyIndex === commandHistory.length ? historyDraft : commandHistory[historyIndex];
  clearCompletionNotice();
  const end = terminalInput.value.length;
  terminalInput.setSelectionRange(end, end);
});
$('#terminal-form').addEventListener('submit', event => {
  event.preventDefault(); const command=terminalInput.value;
  if (command.trim()) commandHistory.push(command);
  historyIndex = commandHistory.length; historyDraft = '';
  terminalInput.value=''; runTerminalCommand(command);
  if (!$('#post-dialog').open) terminalInput.focus({preventScroll:true}); terminalOutput.scrollTop=0;
});
for (const name of categories) { const option=element('option','',name); option.value=name; $('#write-category').append(option); }
$('#write-category').addEventListener('change',updateWriteLink); updateWriteLink();
$('.dialog-close').addEventListener('click',()=>$('#post-dialog').close());
$('#post-dialog').addEventListener('click',event=>{if(event.target===$('#post-dialog'))$('#post-dialog').close();});
$('#post-dialog').addEventListener('close',()=>opener?.focus());
search.addEventListener('input',renderPosts);
renderFilters(); renderPosts(); loadIssues();
