# Neo6424의 블로그

[neo6424.github.io](https://neo6424.github.io/)에서 보안과 개발 관련 프로젝트 및 기록을 살펴볼 수 있습니다.

- [EvidenceBridge](https://github.com/Neo6424/evidencebridge) — 합성 로그와 SHA-256을 활용한 증거 무결성 검증 데모

## 글 쓰는 법

`posts/` 폴더에 마크다운 파일을 추가하고 `main`에 커밋하면 GitHub Actions가 빌드해서 1~2분 뒤 블로그에 올라갑니다. 블로그의 **글쓰기** 버튼을 누르면 GitHub에서 템플릿이 채워진 새 파일 화면이 열립니다.

```markdown
---
title: 글 제목
category: 논문/컨퍼런스
date: 2026-11-11
description: 목록과 링크 미리보기에 보일 한 줄 요약 (비우면 본문 앞부분을 씁니다)
---

# 본문 시작
```

- **글 주소**: 파일 이름이 주소가 됩니다. `posts/2026-11-11-evil-edr.md` → `https://neo6424.github.io/posts/evil-edr/` (앞의 날짜는 주소에서 빠집니다). 영문·숫자·`-`로 짓는 걸 권장합니다. 머리말에 `slug: 원하는-주소`를 쓰면 직접 정할 수 있습니다.
- **category**: `개발`, `CTF/Wargame`, `Bug Bounty`, `블로그/기술문서`, `논문/컨퍼런스`, `공모전/자격증` 중 하나
- **임시 저장**: 머리말에 `draft: true`를 넣으면 블로그에 올라가지 않습니다.
- **이미지**: `images/` 폴더에 올리고 `![설명](https://neo6424.github.io/images/파일.png)`처럼 씁니다. GitHub 편집기에 붙여 넣은 이미지 주소도 그대로 쓸 수 있습니다.
- 지원 문법: 제목, 표, 순서/비순서 목록(중첩 포함), 코드 블록, 인용문, 구분선, 굵게/기울임/취소선, 링크, 이미지

## 로컬에서 확인하기

```bash
node scripts/build.mjs        # _site/ 생성 (외부 패키지 없음)
cd _site && python3 -m http.server 8000
```

## 배포 설정

저장소 **Settings → Pages → Build and deployment → Source**가 **GitHub Actions**여야 합니다 (`.github/workflows/pages.yml`).
