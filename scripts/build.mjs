// 블로그 빌드 스크립트 (외부 패키지 없음, Node 18+)
//   node scripts/build.mjs
// posts/*.md 를 읽어서 _site/ 에 배포용 사이트를 만듭니다.
//   _site/posts.js              블로그 목록/팝업에서 쓰는 글 데이터
//   _site/posts/<slug>/index.html  글마다 따로 열리는 페이지 (공유 링크)
//   _site/sitemap.xml, _site/feed.xml
import {readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '_site');
const SITE_URL = 'https://neo6424.github.io';
const SITE_NAME = 'Neo6424의 블로그';
const CATEGORIES = ['개발', 'CTF/Wargame', 'Bug Bounty', '블로그/기술문서', '논문/컨퍼런스', '공모전/자격증'];
// _site 로 그대로 복사할 파일/폴더 (있는 것만)
const STATIC = ['index.html', 'secret.html', 'app.js', 'markdown.js', 'post.js', 'style.css', 'assets', 'images', 'favicon.ico'];

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// <script> 안에 넣어도 안전한 JSON
const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function parseFrontMatter(text, file) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) throw new Error(`${file}: 맨 위에 --- 로 감싼 머리말(title, category)이 필요합니다.`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`${file}: 머리말을 읽을 수 없는 줄 → ${line}`);
    let value = kv[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    meta[kv[1].toLowerCase()] = value;
  }
  return {meta, body: text.slice(m[0].length).replace(/^\n+/, '')};
}

// 목록/미리보기용 요약: 마크다운 기호를 걷어낸 첫 문장들
function summarize(body, max = 150) {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .split('\n')
    .filter(l => !/^\s*(#|\||[-*_]{3,}\s*$)/.test(l))
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~>]/g, '')
    .replace(/^\s*(\d+[.)]|[-+])\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function loadPosts() {
  const dir = join(ROOT, 'posts');
  if (!existsSync(dir)) return [];
  const posts = [];
  const seen = new Map();
  for (const file of readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
    const {meta, body} = parseFrontMatter(readFileSync(join(dir, file), 'utf8'), `posts/${file}`);
    if (meta.draft === 'true') continue;
    const base = file.slice(0, -3);
    const datePrefix = /^(\d{4}-\d{2}-\d{2})-(.+)$/.exec(base);
    const slug = (meta.slug || (datePrefix ? datePrefix[2] : base)).trim();
    const date = meta.date || (datePrefix ? datePrefix[1] : '');
    if (!meta.title) throw new Error(`posts/${file}: title 이 비어 있습니다.`);
    if (!CATEGORIES.includes(meta.category)) throw new Error(`posts/${file}: category 는 다음 중 하나여야 합니다 → ${CATEGORIES.join(', ')}`);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`posts/${file}: date 는 2026-11-11 형식이어야 합니다.`);
    if (!/^[^\s/?#\\]+$/.test(slug)) throw new Error(`posts/${file}: 파일 이름(또는 slug)에 공백, /, ?, # 을 쓸 수 없습니다.`);
    if (seen.has(slug)) throw new Error(`posts/${file}: 주소(${slug})가 posts/${seen.get(slug)} 와 겹칩니다.`);
    seen.set(slug, file);
    posts.push({
      slug, title: meta.title, category: meta.category, date,
      description: meta.description || summarize(body),
      body, url: `/posts/${encodeURIComponent(slug)}/`, path: `posts/${file}`,
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

function postPage(p) {
  const pageUrl = SITE_URL + p.url;
  const title = `${p.title} | ${SITE_NAME}`;
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(p.description)}">
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
  <meta property="og:title" content="${escapeHtml(p.title)}">
  <meta property="og:description" content="${escapeHtml(p.description)}">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:locale" content="ko_KR">
${p.date ? `  <meta property="article:published_time" content="${p.date}">\n` : ''}  <meta property="article:section" content="${escapeHtml(p.category)}">
  <meta name="twitter:card" content="summary">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE_NAME)}" href="/feed.xml">
  <link rel="stylesheet" href="/style.css?v=${BUILD_ID}">
  <script src="/markdown.js?v=${BUILD_ID}" defer></script>
  <script src="/post.js?v=${BUILD_ID}" defer></script>
</head>
<body class="post-page">
  <div class="terminal-window">
    <div class="terminal-bar" aria-hidden="true"><span class="terminal-dots"><i></i><i></i><i></i></span><span class="terminal-path">neo6424@blog: ~/posts/${escapeHtml(p.slug)}.md</span><span class="terminal-shell">bash</span></div>
    <header class="site-header">
      <div class="container header-inner">
        <a class="site-title" href="/">Neo6424<span>.</span></a>
        <a class="github-link" href="https://github.com/Neo6424">GitHub <span aria-hidden="true">↗</span></a>
      </div>
    </header>
    <main class="container post-main" id="content">
      <article class="post-article">
        <p class="dialog-category">${escapeHtml(p.category)}${p.date ? ` · <time datetime="${p.date}">${p.date}</time>` : ''}</p>
        <h1 class="post-title">${escapeHtml(p.title)}</h1>
        <div id="post-body">
          <noscript><pre class="post-fallback">${escapeHtml(p.body)}</pre></noscript>
        </div>
        <p class="post-actions">
          <a class="post-action" href="/">← 전체 글</a>
          <button class="post-action" type="button" id="copy-link" hidden>링크 복사</button>
          <a class="post-action" href="https://github.com/Neo6424/Neo6424.github.io/edit/main/${escapeHtml(p.path)}" target="_blank" rel="noopener noreferrer">GitHub에서 수정하기 ↗</a>
        </p>
      </article>
    </main>
    <footer class="container footer">© Neo6424</footer>
  </div>
  <script type="application/json" id="post-data">${safeJson({title: p.title, category: p.category, date: p.date, body: p.body, url: p.url})}</script>
</body>
</html>
`;
}

const xml = s => escapeHtml(s);
function feed(posts) {
  const items = posts.slice(0, 30).map(p => `    <item>
      <title>${xml(p.title)}</title>
      <link>${SITE_URL}${p.url}</link>
      <guid>${SITE_URL}${p.url}</guid>
      <category>${xml(p.category)}</category>
${p.date ? `      <pubDate>${new Date(p.date + 'T00:00:00+09:00').toUTCString()}</pubDate>\n` : ''}      <description>${xml(p.description)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xml(SITE_NAME)}</title>
    <link>${SITE_URL}/</link>
    <description>Neo6424의 보안, 개발, 디지털 증거 프로젝트와 기록</description>
    <language>ko</language>
${items}
  </channel>
</rss>
`;
}
function sitemap(posts) {
  const urls = [`${SITE_URL}/`, ...posts.map(p => SITE_URL + p.url)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${xml(u)}</loc></url>`).join('\n')}
</urlset>
`;
}

const BUILD_ID = Date.now().toString(36);
const posts = loadPosts();
rmSync(OUT, {recursive: true, force: true});
mkdirSync(OUT, {recursive: true});
for (const name of STATIC) if (existsSync(join(ROOT, name))) cpSync(join(ROOT, name), join(OUT, name), {recursive: true});

// index.html 의 스크립트/스타일 캐시 무효화
const indexPath = join(OUT, 'index.html');
writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replace(/((?:src|href)="(?:posts|markdown|app|style)\.(?:js|css))(?:\?v=[^"]*)?"/g, `$1?v=${BUILD_ID}"`));

writeFileSync(join(OUT, 'posts.js'), `// 자동 생성 파일입니다. posts/*.md 를 수정하세요.\nconst posts = ${safeJson(posts.map(({slug, title, category, date, description, body, url, path}) => ({slug, title, category, date, description, body, url, path})))};\n`);
for (const p of posts) {
  mkdirSync(join(OUT, 'posts', p.slug), {recursive: true});
  writeFileSync(join(OUT, 'posts', p.slug, 'index.html'), postPage(p));
}
writeFileSync(join(OUT, 'feed.xml'), feed(posts));
writeFileSync(join(OUT, 'sitemap.xml'), sitemap(posts));
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`글 ${posts.length}개 → _site/`);
for (const p of posts) console.log(`  ${p.date || '----------'}  ${p.category}  ${p.url}`);
