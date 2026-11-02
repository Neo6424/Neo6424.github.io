// 글은 배열에 추가합니다. 각 문단은 paragraphs 배열에 별도 문자열로 입력하세요.
const posts = [
  {
    category: '블로그/기술문서',
    title: 'GitHub Pages 시작하기',
    description: 'GitHub 저장소를 이용해 정적 사이트를 게시하는 방법',
    paragraphs: [
      'GitHub Pages는 GitHub 저장소에 있는 HTML, CSS, JavaScript 파일을 웹사이트로 공개하는 정적 호스팅 서비스입니다.',
      '사용자명.github.io 이름의 저장소에 사이트 파일을 올리고 Settings → Pages에서 배포 브랜치와 폴더를 선택합니다. 이 사이트는 main 브랜치의 최상위 폴더에서 배포됩니다.',
      '파일을 수정해 해당 브랜치에 커밋하면 사이트에 변경 사항이 다시 배포됩니다.'
    ]
  }
];
