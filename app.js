const categories = ['개발', 'CTF/Wargame', 'Bug Bounty', '블로그/기술문서', '논문/컨퍼런스', '공모전/자격증'];
const $ = selector => document.querySelector(selector);
const filters = $('#filters'), list = $('#post-list'), search = $('#search');
let active = '전체';
let opener;
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
  const result = posts.filter(p => (active === '전체' || p.category === active) && [p.title, p.description, p.category, ...p.paragraphs].join(' ').toLocaleLowerCase().includes(query));
  list.replaceChildren();
  $('#result-count').textContent = `${result.length}개의 글`;
  $('#empty').hidden = result.length > 0;
  result.forEach(p => {
    const btn = element('button', 'post');
    btn.type = 'button';
    btn.append(element('span', 'post-category', p.category), element('h3', '', p.title), element('p', '', p.description));
    btn.addEventListener('click', () => openPost(p, btn));
    list.append(btn);
  });
}
function openPost(p, button) {
  opener = button;
  const target = $('#dialog-content');
  target.replaceChildren();
  const heading = element('h2', '', p.title);
  heading.id = 'dialog-title';
  target.append(element('p', 'dialog-category', p.category), heading);
  const text = element('div', 'dialog-text');
  p.paragraphs.forEach(paragraph => text.append(element('p', '', paragraph)));
  target.append(text);
  $('#post-dialog').showModal();
}
$('.dialog-close').addEventListener('click', () => $('#post-dialog').close());
$('#post-dialog').addEventListener('click', event => { if (event.target === $('#post-dialog')) $('#post-dialog').close(); });
$('#post-dialog').addEventListener('close', () => opener?.focus());
search.addEventListener('input', renderPosts);
renderFilters();
renderPosts();
