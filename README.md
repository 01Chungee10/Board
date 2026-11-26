# 현대제철 CEO–CL 온라인 워크숍

- **참가자 접속 주소 (새 저장소의 Pages 배포 후):** https://01chungee10.github.io/Board/
- **관리 저장소:** https://github.com/01Chungee10/Board
- **주소 공개 주의:** GitHub Pages 기본 주소에는 GitHub 사용자명이 노출됩니다. 계정명을 숨겨야 한다면 별도 도메인/프록시를 연결한 뒤 해당 주소로 안내하세요. 이전 단축 링크 `is.gd/HSteelCLWorkshop`는 옛 저장소 주소를 가리키므로 사용하지 않습니다.
- **화면명:** 온라인 워크숍
- **핵심 흐름:** 질문 작성 → 최신순·공감순 탐색 → 질문 크게 보기·CEO 공식 답변

## 참가자 사용 방식

1. 위 주소로 접속합니다. **이메일, 회원가입, 이름 또는 참여코드를 입력하지 않습니다.**
2. 화면 상단의 질문 입력란에 질문을 쓰고 **질문 등록**을 누릅니다.
3. 모든 참가자가 같은 타임라인에서 질문과 CEO 답변을 실시간으로 확인합니다.

사이트는 보이지 않는 Supabase 익명 세션을 자동 생성해 서버 권한 정책(RLS)을 적용합니다. 이는 참가자에게 별도 인증 절차를 요구하는 것이 아닙니다. 사용자가 이름을 입력하거나 실명으로 노출되는 구조는 아닙니다. 별도의 데이터 삭제·접근 통제 방침은 워크숍 운영자가 수립해야 합니다.

## CEO 직접 답변

CEO는 일반 참가자 페이지가 아닌 **운영자용 접근경로**
`https://01chungee10.github.io/Board/?host=1`을 열고,
운영자가 CEO에게 직접 제공하는 1회용 전용 인증코드를 입력합니다.

코드는 GitHub, 자바스크립트, 공개 QR 등에 포함되지 않습니다. 서버의
`private.meeting_access`와 `meeting_members`를 통해 CEO 역할이 검증됩니다.
CEO의 질문 카드에는 공식 답변 작성 버튼이 표시되며 참가자는 답변을 읽기만 할 수 있습니다.
CEO 코드는 **반드시 현장에서 본인에게 직접 전달**해야 합니다.

## 화면 설계

- 흰색 배경과 Pantone 288C (`#002D62`), 현대제철 CI 원본, 작은 용강이 일러스트
- **질문 입력창 한 개**, 질문 카드와 CEO 답변 표시
- 질문마다 하트 공감 버튼, 전체 공감 수 및 본인 공감 상태 표시. 공감 재선택 시 취소 가능(서버에서 사용자당 1회 제한)
- 화면 오른쪽 아래에 고정된 **QR 접속** 버튼으로 누구나 공유 링크를 스캔하거나 복사할 수 있음
- 기존의 통계·카테고리·검색·가이드 카드·일반 참가자 로그인은 제거
- 화면 폭에 따라 질문 카드를 1~4열로 배치: 760px 미만 1열, 760px 이상 2열, 1120px 이상 3열, 1560px 이상 4열
- **최신순 / 공감순** 버튼으로 정렬. 공감 수가 같으면 최신 질문 우선. 서버에서 정렬한 뒤 최대 250건을 조회하며 실시간 갱신에도 선택한 정렬 유지
- 질문 카드나 **크게 보기** 버튼을 누르면 질문·답변 전체를 큰 글씨로 표시. 모바일은 화면 전체, 데스크톱은 넓은 상세 창 사용
- 상세 창은 Esc·닫기 버튼으로 종료하고 원래 카드로 키보드 초점 복귀. 공감 버튼은 상세 창 열기와 분리되며 카드·상세 창의 공감 상태 동기화
- 참가자 질문은 `meeting_posts`의 `kind=question`, `is_anonymous=true`로 기록
- 질문 본문은 4–3,000자, 제목은 본문에서 자동 생성 (별도 제목 입력 불필요)
- 신규 질문·답변·공감 수는 Postgres Changes로 동기화. 네트워크 오류 시 12초 주기로 재조회
- 공감 집계는 기존 `meeting_reactions`/`meeting_posts.reaction_count` 및 서버 RLS/trigger 사용. 테이블 추가 또는 운영 데이터 변경 불필요
- 행사 운영자가 `meeting_sessions.is_open=false`로 설정하면 신규 질문과 답변 입력은 서버 정책에서 차단

## 운영 환경

- **Frontend:** GitHub Pages (`gh-pages`), React, Vite
- **Database:** Supabase 서울 리전 `ovhhiwntyoqwqyphoqga` (현행 운영). 이전 프로젝트 `nianjjguagrddzbelcao`는 보존·백업 중이며 현 사이트에서 사용하지 않음
- **인증 방식:** 방문 즉시 Supabase anonymous auth → `join_public_workshop()` 자동 실행
- **RLS:** 참가자와 CEO 역할은 서버 테이블에서 관리. 클라이언트는 직접 역할을 설정할 수 없음
- **기존 데이터:** 같은 `meeting_posts`/`meeting_replies` 구조 사용, 기존 작성글 유지
- **변경 SQL:** `supabase/migrations/20261026111000_frictionless_workshop_join.sql` 및 `20261026113500_workshop_title_and_short_question.sql`
- **API 공개키:** `VITE_SUPABASE_PUBLISHABLE_KEY`만 브라우저에 탑재. 서비스 키와 행사 코드는 절대로 포함하지 않음

## 운영 위험과 유의사항

**참가자 인증과 초대코드가 모두 없으므로 URL을 아는 사람은 누구나 질문할 수 있습니다.** 이 디자인은 현장의 개방적인 워크숍에 적합하지만 외부 유입·도배·악의적인 질문을 원천 차단하지는 못합니다. 기본 서버 측의 사용자별 질문 속도 제한(분당 최대 3건)과 Supabase 익명 인증 한도를 적용했지만, 대규모 행사 전에 부하 테스트 및 스팸 방지 장치를 별도로 검토해야 합니다.

해당 Supabase 프로젝트는 개인 관리 조직 아래에 있습니다. 회사 정책에 따른 정보보호·개인정보 처리 적합성 확인 전에는 인사평가·고충·건강정보 등 민감한 정보를 입력하거나 외부 유출 위험이 있는 업무 내용을 게시하지 않도록 안내하세요.

## 개발·검증

```bash
npm ci
npm run test
npm run stage:production
```

- 원본 React: `app/src/App.jsx`, 스타일: `app/src/styles.css`
- 자동 참가 RPC: `public.join_public_workshop()` / CEO 역할 RPC: `public.claim_ceo_cl_on_site()`
- 유틸리티 단위테스트: `tests/workshop-utils.test.mjs`
- 기존 DB 연동 검증: `scripts/qa-online-workshop.mjs`
- 로컬 모의 데이터 기능 검증: `AGENT_BROWSER_OWNER=실제에이전트ID node tests/browser/reactions-share.test.mjs`. 임시 브라우저는 설치된 browser-session-guard를 통해 실행하며 종료 확인을 요구함
- 다열·정렬·상세 화면 검증: `docs/qa/workshop-20261116/`
- 검증 이미지 및 결과: `docs/qa/workshop-20261026/`
- 데이터가 있는 경우와 없는 경우 모두 검증했고 임시 게시글·테스트 계정은 삭제함

## 신규 GitHub 계정으로 게시

상세 이전 현황·위험·완료 점검표: [2026-11-13 이전 보고](docs/MIGRATION_2026-11-13.md).

- **GitHub 소유자:** `01Chungee10`
- **로컬 배포 브랜치:** `main` / **배포 원격:** `origin`
- GitHub CLI에서 `01Chungee10` 계정 인증 후, 저장소 루트에서 `bash scripts/publish-to-new-github.sh`를 실행합니다.
- 배포 스크립트는 대상 계정 일치 여부 및 커밋된 파일을 검증하고, 필요한 경우 공개 저장소를 만든 후 `main` 브랜치를 게시하며 GitHub Pages를 `main:/`로 구성합니다.
- 이후 화면 소스 수정 시 `npm test && npm run stage:production`으로 빌드 결과를 갱신해 커밋한 뒤 동일 스크립트로 배포합니다.
- **주의:** GitHub Pages의 기본 URL은 저장소 소유자명을 공개합니다. 소유자명 비노출이 필수라면 관리형 도메인을 별도로 연결해야 합니다.

`app/.env.production.local`은 개발자 로컬에만 보관하며 `.gitignore`로 제외합니다. 이전 화면과 코드도 Git 이력 및 `legacy/`에서 추적할 수 있습니다.

## 상호토의 주제 분리 (2026-11-18)

분리된 주제의 원문은 `app/src/discussion-topics.js`에 별도 보존하고, 일반 질문은 운영 DB에서 선별 편집합니다. 별도 영역은 질문 수·정렬·공감 대상에 포함하지 않습니다. 원 질문 2건 중 선정된 11개 질문을 이동하고, 나머지 6개 질문은 원 게시글에 유지합니다. 운영 데이터 변경은 기존 서버 권한으로 수행하며 키를 저장소에 저장하지 않습니다.

## 사전질문 및 현업검토의견 (2026-11-23)

질문 타임라인 아래, 상호토의 주제 위에 **CL → CEO 사전질문 및 현업검토의견** 영역을 둡니다. 제공받은 5개 주제와 답변 부서를 안내표로 연결하고, 각 주제를 펼쳐 질문과 현업검토의견 전체를 읽을 수 있습니다.

- 내용 원본: `app/src/prework-data.js` — 제공된 제목·분류·태그, 질문, 부서별 검토의견을 보존
- 화면: `app/src/PreworkSection.jsx`, `app/src/prework-section.css`
- 자료는 별도 열람 영역으로 표시하며 질문 타임라인의 공감·최신순 정렬과 질문 수에는 포함하지 않음
- 일반 참가자의 등록 질문과 CEO 공식 답변은 기존 운영 DB에서 관리하며 이번 자료 게시에는 DB 변경이 필요하지 않음
- 사전검토 자료 화면 검증: `tests/browser/prework-section.guard.js`, 결과·화면: `docs/qa/workshop-20261123/`

## 상호토의 주제 화면 숨김 (2026-11-23)

운영 화면에서 `상호토의 주제로 갈음` 영역을 숨겼습니다. `app/src/discussion-topics.js`의 11개 문항과 기존 운영 데이터는 변경하지 않았습니다. 복구 시 `app/src/App.jsx`의 `SHOW_DISCUSSION_TOPICS`를 `true`로 설정한 뒤 재배포하면 됩니다.

## 사전질문 표시 범위 조정 (2026-11-24)

사전질문 영역에서 **1번 AI·DX·AX(DX추진실)**와 **5번 경영 방향(경영전략실)**만 표시합니다. 2~4번 내용은 `app/src/prework-data.js`에 그대로 보존하며, `app/src/PreworkSection.jsx`의 노출 대상 필터를 변경하면 복구할 수 있습니다. 구분 번호(1·5)와 기존 앵커(`#prework-ai-dx-ax`, `#prework-strategy`)를 유지합니다.

## 번호 열 제거 (2026-11-24)

두 주제의 표에서 구분 번호와 번호 열을 제거하고, 상세 펼침 제목의 번호 표시도 제거했습니다. 원본 데이터와 `#prework-ai-dx-ax`, `#prework-strategy` 링크는 보존합니다.

## Supabase 운영 프로젝트 전환 (2026-11-25)

- 기존 GitHub 저장소 `01Chungee10/Board`와 Pages 주소를 유지하며 Supabase만 `ovhhiwntyoqwqyphoqga` (`01Chungee10's Org`, 서울)로 이전했습니다.
- 게시글 21건(공개 4/숨김 17), 작성자 연결 21건, 공감 20건, 참가자 116건, 과거 Auth 참조 116건, 워크숍 세션 및 비공개 인증 설정을 보존했습니다. 기존 Auth 세션은 새 프로젝트로 이전되지 않으므로 이용자는 새로운 익명 세션으로 참가합니다.
- 새 데이터 API에서 익명 로그인·참가 RPC·공개 질문 조회·공감 추가/취소를 검증했습니다.
- 로컬 비공개 `app/.env.production.local`에 신규 URL과 브라우저용 publishable key를 설정했습니다. 공개 빌드에 서비스 역할 비밀키를 포함하지 않습니다.
- 폐쇄된 계정과 연결됐던 구 Supabase 프로젝트는 삭제하지 않습니다. CLI 원격 링크가 옛 프로젝트를 가리킬 수 있으므로 관리 시 재확인하십시오.
- 세부 이전 증빙은 `docs/SUPABASE_MIGRATION_2026-11-25.md`에 있습니다.

## 사전질문 및 현업검토의견 전체 숨김 (2026-11-27)

운영 화면에서 하단 `CL → CEO 사전질문 및 현업검토의견` 영역 전체를 **숨김 처리**합니다. `app/src/prework-data.js`의 기존 두 주제와 현업검토의견 원문, `PreworkSection.jsx` 컴포넌트는 삭제하지 않습니다. 복구 시 `app/src/App.jsx`의 `SHOW_PREWORK_SECTION`을 `true`로 설정하고 재배포하면 됩니다. 화면에서 영역과 제목·표·상세 항목이 렌더링되지 않으며, 기존 질문 작성·공감·QR 및 다른 영역은 변경하지 않습니다.
