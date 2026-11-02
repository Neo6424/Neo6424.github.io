# Neo6424 블로그

GitHub Pages에서 운영하는 개발·보안 기록 공간입니다. 별도의 빌드 없이 HTML, CSS, JavaScript로 동작합니다.

- `index.html`: 제목과 소개
- `style.css`: 화면 디자인
- `posts.js`: 글 목록과 본문
- `app.js`: 검색, 카테고리, 글 읽기

## 글 작성하기

`posts.js`의 `posts` 배열에 글을 추가합니다. 글은 배열 순서대로 표시됩니다.

```js
{
  category: '개발',
  title: '글 제목',
  description: '글에 대한 짧은 설명',
  paragraphs: ['첫 번째 문단입니다.', '두 번째 문단입니다.']
},
```

카테고리는 `개발`, `CTF/Wargame`, `Bug Bounty`, `블로그/기술문서`, `논문/컨퍼런스`, `공모전/자격증` 중 하나를 정확히 입력합니다. 문자열에 작은따옴표가 있다면 앞에 역슬래시를 붙이거나 문자열을 큰따옴표로 감싸세요.

## 게시와 수정

[저장소](https://github.com/Neo6424/Neo6424.github.io)의 `main` 브랜치 최상위 폴더가 GitHub Pages 게시 원본입니다. 파일을 수정하고 커밋하면 사이트에 다시 배포됩니다. 설정은 저장소의 **Settings → Pages**에서 확인할 수 있습니다.

- 블로그: https://neo6424.github.io/
- [GitHub Pages 공식 문서](https://docs.github.com/ko/pages/getting-started-with-github-pages/what-is-github-pages)
