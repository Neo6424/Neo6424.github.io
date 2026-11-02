const categories = [
  ['개발','01','BUILD & CREATE','코드로 아이디어를 현실로'],
  ['CTF/Wargame','02','BREAK & LEARN','문제를 풀며 배우는 보안'],
  ['Bug Bounty','03','FIND & REPORT','더 안전한 시스템을 위한 관찰'],
  ['블로그/기술문서','04','WRITE & SHARE','배운 것을 나누는 방법'],
  ['논문/컨퍼런스','05','READ & DISCOVER','새로운 관점과 아이디어'],
  ['공모전/자격증','06','GROW & CHALLENGE','도전의 과정과 회고']
];
const $ = s => document.querySelector(s);
const topicGrid = $('#topic-grid'), filters = $('#filters'), list = $('#post-list'), search = $('#search');
let active = '전체', opener;
function element(tag, className, text) {
  const el = document.createElement(tag); if (className) el.className = className;
  if (text !== undefined) el.textContent = text; return el;
}
function selectCategory(name) {
  active = name; renderFilters(); renderPosts();
}
function renderTopics() {
  categories.forEach(([name,num,en,description]) => {
    const btn = element('button','topic-card'); btn.type = 'button';
    btn.append(element('span','topic-num',num + ' / ' + en), element('span','topic-name',name), element('span','topic-desc',description), element('span','topic-arrow','↗'));
    btn.addEventListener('click', () => { selectCategory(name); $('#archive').scrollIntoView({behavior:'smooth'}); });
    topicGrid.append(btn);
  });
}
function renderFilters() {
  filters.replaceChildren();
  ['전체', ...categories.map(c => c[0])].forEach(name => {
    const btn = element('button', active === name ? 'filter active' : 'filter', name);
    btn.type = 'button'; btn.setAttribute('aria-pressed', String(active === name));
    btn.addEventListener('click', () => selectCategory(name)); filters.append(btn);
  });
}
function renderPosts() {
  const query = search.value.trim().toLocaleLowerCase();
  const result = posts.filter(p => (active === '전체' || p.category === active) && [p.title,p.description,p.category,...p.tags,...p.paragraphs].join(' ').toLocaleLowerCase().includes(query));
  list.replaceChildren(); $('#result-count').textContent = 'SHOWING ' + String(result.length).padStart(2,'0') + ' NOTES'; $('#empty').hidden = result.length > 0;
  result.forEach((p,i) => {
    const btn = element('button','post'); btn.type = 'button';
    const meta = element('div','post-meta'); meta.append(element('span','post-category',p.category),element('span','post-date',p.date));
    const body = element('div','post-body'); body.append(element('span','post-label',p.label),element('h3','',p.title),element('p','',p.description));
    const tags = element('div','tags'); p.tags.forEach(tag => tags.append(element('span','', '# ' + tag))); body.append(tags);
    btn.append(meta,body,element('span','post-arrow','↗')); btn.addEventListener('click', () => openPost(p,btn)); list.append(btn);
  });
}
function openPost(p, button) {
  opener = button; const target = $('#dialog-content'); target.replaceChildren();
  const heading = element('h2','',p.title); heading.id = 'dialog-title';
  target.append(element('p','eyebrow',p.category + ' / ' + p.label),heading,element('p','dialog-description',p.description));
  const text = element('div','dialog-text'); p.paragraphs.forEach(paragraph => text.append(element('p','',paragraph))); target.append(text);
  $('#post-dialog').showModal();
}
$('.dialog-close').addEventListener('click', () => $('#post-dialog').close());
$('#post-dialog').addEventListener('click', event => { if (event.target === $('#post-dialog')) $('#post-dialog').close(); });
$('#post-dialog').addEventListener('close', () => opener?.focus());
search.addEventListener('input', renderPosts);
renderTopics(); renderFilters(); renderPosts();
