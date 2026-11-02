# FIELD NOTES

개발과 보안을 탐구하며 기록하는 개인 블로그입니다. 별도의 빌드나 설치 없이 HTML, CSS, JavaScript로 동작합니다. 카테고리, 검색, 글 읽기 창은 브라우저에서 작동합니다.

## 파일 구성

- `index.html`: 블로그 제목, 첫 화면, 자기소개, 메뉴
- `style.css`: 색상, 글꼴, 레이아웃
- `posts.js`: 글 목록과 본문
- `app.js`: 카테고리, 검색, 글 읽기 기능

## 내 블로그로 바꾸기

1. `index.html`에서 FIELD NOTES, 소개 문구와 제목을 원하는 내용으로 바꿉니다. 예시 소개는 실제 본인의 소개에 맞게 수정하세요.
2. `posts.js`의 예시 글은 작성 아이디어입니다. 본인의 글로 수정하거나 삭제하세요. 첫 글은 GitHub Pages 안내입니다.
3. 새 글은 `posts` 배열 안에 아래처럼 추가합니다. 글은 배열 순서대로 표시됩니다.

```js
{
  category: '개발',
  title: '나의 첫 프로젝트',
  description: '프로젝트를 만들며 배운 점',
  label: '프로젝트',
  date: '2026.11.02',
  tags: ['개발', '회고'],
  paragraphs: ['첫 번째 문단입니다.', '두 번째 문단입니다.']
},
```

`category`에는 개발, CTF/Wargame, Bug Bounty, 블로그/기술문서, 논문/컨퍼런스, 공모전/자격증 중 하나를 정확히 입력합니다. 문자열 안의 작은따옴표는 \'처럼 앞에 역슬래시를 붙이거나 큰따옴표로 감싸세요. JavaScript 문법을 지켜야 글 목록이 표시됩니다.

## GitHub Pages에 게시하기

GitHub Pages는 저장소의 정적 HTML, CSS, JavaScript 파일을 웹사이트로 제공하는 서비스입니다. 계정 사이트를 원한다면 `사용자명.github.io`라는 이름의 저장소를 만들고, 이 폴더 안의 파일들을 저장소 최상위에 올립니다. 저장소의 **Settings → Pages → Build and deployment**에서 **Deploy from a branch**를 선택하고, 브랜치 `main`과 폴더 `/(root)`를 지정해 저장합니다. 게시가 완료되면 일반적으로 `https://사용자명.github.io/`에서 확인할 수 있습니다. 사용자명은 실제 GitHub 계정명으로 바꾸세요.

일반 저장소에 게시하면 주소는 보통 `https://사용자명.github.io/저장소명/`입니다. 사이트 파일은 상대 경로를 사용하므로 이 방식도 지원합니다. 변경사항을 같은 브랜치에 커밋하면 사이트에 다시 반영됩니다. 게시까지 잠시 시간이 걸릴 수 있습니다. 공개 범위와 사용 가능한 기능은 GitHub 요금제에 따라 달라질 수 있습니다.

공식 문서: [GitHub Pages란?](https://docs.github.com/ko/pages/getting-started-with-github-pages/what-is-github-pages), [GitHub Pages 사이트 만들기](https://docs.github.com/ko/pages/getting-started-with-github-pages/creating-a-github-pages-site), [게시 원본 구성](https://docs.github.com/ko/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 미리 보기

`index.html`을 브라우저에서 열면 됩니다. Google Fonts를 사용할 수 없는 환경에서는 시스템 글꼴로 표시됩니다.
