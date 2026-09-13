# 호리씨와 미야무라군 번역

## :warning: 비공식

이 프로그램과 번역본의 제작은 HERO님과 아무런 관련이 없습니다.

## 무엇인가

[dka-hero.me] 옆에 한국어 번역을 나란히 보여주는 비공식 웹페이지입니다. https://aquaclara.github.io/hrmy-translate/

주소창에 `dka-hero.me`를 입력하면 사이트가 그 안에 첫 화면부터 열립니다. 사이트에서 화를 고른 다음 옆의 번역 창에서도 같은 화를 고르면 번역이 옆에 나옵니다. 설치가 필요 없고 휴대폰에서도 됩니다.

이미지 안의 글자만 번역합니다. 보통 글자는 브라우저의 번역 기능을 써 주세요.

번역은 진행중에 있습니다. 진행도는 [소개 페이지](https://aquaclara.github.io/hrmy-translate/about.html)에서, 번역 원칙은 [별도 페이지](https://aquaclara.github.io/hrmy-translate/translation-policy.html)를 참고하세요.

예전에 쓰던 크롬 확장프로그램은 관리하지 않지만 `legacy/`에 남겨 두었습니다. `npm run build` 뒤 `legacy/` 폴더를 `chrome://extensions`에서 압축해제된 확장 프로그램으로 불러오면 여전히 동작하며, 번역을 직접 고치는 [수정 모드](https://aquaclara.github.io/hrmy-translate/editable-mode.html)는 아직 이쪽에만 있습니다.

## 기여·활용

라이센스에 동의하는 경우 다음 방법으로 기여·활용할 수 있습니다.

- GitHub에 익숙한 경우 `translations/`의 yaml 파일을 수정하여 [Pull Request] 형태로 제출해주세요.
- 이 리포를 포크하거나 번역 파일만을 수정해 새 번역본이나 배포판을 생성할 수 있습니다.
- 예전 확장프로그램의 수정 모드로 브라우저 상에서 번역을 편집할 수 있습니다. [별도 페이지](https://aquaclara.github.io/hrmy-translate/editable-mode.html)를 참고하세요.

## 구조

```
translations/   번역 데이터 (yaml)
src/shared/     데이터 모델, URL↔yaml 경로 매핑 등 공용 코드
src/web/        웹페이지 (브라우저 창 + 번역 패널)
src/legacy/     예전 크롬 확장프로그램 (Manifest V3, 관리하지 않음)
web/            웹페이지. 빌드하면 dist/, translations/, 문서 페이지가 생김
legacy/         확장프로그램 패키지. 빌드하면 dist/ 와 translations/ 가 생김
docs/           소개·번역 원칙·수정 모드 문서 (빌드 시 web/ 에 HTML로 렌더링)
scripts/        화 번호 대응표(web/episodes.json) 갱신 스크립트
```

## 개발

Node.js는 `.nvmrc`의 버전을 씁니다.

```sh
npm ci
npm run build           # web/ 과 legacy/ 를 빌드
npm test                # Prettier 검사
npm run typecheck       # tsc 타입 검사
npm run index-episodes  # 사이트 메뉴에서 화 번호 대응표 갱신
```

- 웹페이지는 `web/` 폴더를 정적 서버로 띄워 봅니다. `main`에 push하면 GitHub Actions가 GitHub Pages에 배포합니다.
- 확장프로그램은 `legacy/` 폴더를 `chrome://extensions`에서 압축해제된 확장 프로그램으로 로드해 시험합니다.

## 라이센스

번역본을 제외한 소스코드의 라이센스는 [LICENSE](LICENSE)를 참고해주세요.
번역본의 라이센스는 각 파일에 명시되어 있습니다.

[dka-hero.me]: http://dka-hero.me/
[pull request]: https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests
