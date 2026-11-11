// 글별 페이지(/posts/<slug>/)에서 본문과 목차를 그립니다. 렌더러는 markdown.js 에 있습니다.
(() => {
  const dataEl = document.getElementById('post-data');
  const target = document.getElementById('post-body');
  if (!dataEl || !target) return;
  const post = JSON.parse(dataEl.textContent);
  target.replaceChildren();
  renderPostBody(target, post);

  const copy = document.getElementById('copy-link');
  if (copy && navigator.clipboard) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.origin + post.url); copy.textContent = '복사됨'; }
      catch { copy.textContent = '복사 실패'; }
      setTimeout(() => { copy.textContent = '링크 복사'; }, 1600);
    });
  }
})();
