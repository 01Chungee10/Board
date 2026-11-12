# 현대제철 CEO–CL 온라인 워크숍

- **참가자 공유 주소:** https://is.gd/HSteelCLWorkshop (계정명 미노출 단축 링크)
- **운영 원본:** https://01chungee10snu.github.io/Board/ (단축 링크로 접속해도 브라우저 주소 표시줄에 원본 주소가 노출됨)
- **화면명:** 온라인 워크숍
- **핵심 흐름:** 질문 작성 → 최신순 타임라인 → CEO 공식 답변

## 참가자 사용 방식

1. 위 주소로 접속합니다. **이메일, 회원가입, 이름 또는 참여코드를 입력하지 않습니다.**
2. 화면 상단의 질문 입력란에 질문을 쓰고 **질문 등록**을 누릅니다.
3. 모든 참가자가 같은 타임라인에서 질문과 CEO 답변을 실시간으로 확인합니다.

사이트는 보이지 않는 Supabase 익명 세션을 자동 생성해 서버 권한 정책(RLS)을 적용합니다. 이는 참가자에게 별도 인증 절차를 요구하는 것이 아닙니다. 사용자가 이름을 입력하거나 실명으로 노출되는 구조는 아닙니다. 별도의 데이터 삭제·접근 통제 방침은 워크숍 운영자가 수립해야 합니다.

## CEO 직접 답변

CEO는 일반 참가자 페이지가 아닌 **운영자용 접근경로**
`https://01chungee10snu.github.io/Board/?host=1`을 열고,
운영자가 CEO에게 직접 제공하는 1회용 전용 인증코드를 입력합니다.

코드는 GitHub, 자바스크립트, 공개 QR 등에 포함되지 않습니다. 서버의
`private.meeting_access`와 `meeting_members`를 통해 CEO 역할이 검증됩니다.
CEO의 질문 카드에는 공식 답변 작성 버튼이 표시되며 참가자는 답변을 읽기만 할 수 있습니다.
CEO 코드는 **반드시 현장에서 본인에게 직접 전달**해야 합니다.

## 화면 설계

- 흰색 배경과 Pantone 288C (`#002D62`), 현대제철 CI 원본, 작은 용강이 일러스트
- **질문 입력창 한 개**, 최신 질문 타임라인과 CEO 답변만 표시
- 질문마다 하트 공감 버튼, 전체 공감 수 및 본인 공감 상태 표시. 공감 재선택 시 취소 가능(서버에서 사용자당 1회 제한)
- 헤더의 **QR 접속** 버튼으로 누구나 공유 링크를 스캔하거나 복사할 수 있음
- 기존의 통계·카테고리·검색·가이드 카드·일반 참가자 로그인은 제거
- 스마트폰 320–430px를 기본으로 디자인하고, PC에서는 중앙 집중형 목록 사용
- 참가자 질문은 `meeting_posts`의 `kind=question`, `is_anonymous=true`로 기록
- 질문 본문은 4–3,000자, 제목은 본문에서 자동 생성 (별도 제목 입력 불필요)
- 신규 질문·답변·공감 수는 Postgres Changes로 동기화. 네트워크 오류 시 12초 주기로 재조회
- 공감 집계는 기존 `meeting_reactions`/`meeting_posts.reaction_count` 및 서버 RLS/trigger 사용. 테이블 추가 또는 운영 데이터 변경 불필요
- 행사 운영자가 `meeting_sessions.is_open=false`로 설정하면 신규 질문과 답변 입력은 서버 정책에서 차단

## 운영 환경

- **Frontend:** GitHub Pages (`gh-pages`), React, Vite
- **Database:** Supabase 서울 리전 `nianjjguagrddzbelcao`
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
- 모바일·데스크톱 브라우저 검증: `scripts/qa-online-workshop.mjs`
- 검증 이미지 및 결과: `docs/qa/workshop-20261026/`
- 데이터가 있는 경우와 없는 경우 모두 검증했고 임시 게시글·테스트 계정은 삭제함

`app/.env.production.local`은 개발자 로컬에만 보관하며 `.gitignore`로 제외합니다. 이전 화면과 코드도 Git 이력 및 `legacy/`에서 추적할 수 있습니다.
