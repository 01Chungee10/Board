# Board 계정 이전·운영 복구 점검표 — 2026-11-13

대상: 2026 현대제철 CEO–CL 온라인 워크숍. 이 문서는 단일 프로젝트 폴더에 유지한다.
**운영 데이터 보호 원칙:** 기존 Supabase 테이블과 데이터를 삭제/복제/초기화하지 않고, 새 GitHub Pages가 검증될 때까지 기존 설정을 유지한다. 서비스 권한과 CLI 토큰은 저장소에 저장하지 않는다.

## A. 현재 확인한 사실

| 항목 | 상태 | 근거 및 처리 |
|---|---|---|
| 로컬 소스 | 완료 | 단일 Board 저장소, `main`과 정적 배포 파일 준비 |
| GitHub 이전 대상 | 확인 | GitHub 사용자 `01Chungee10` 존재, `origin=https://github.com/01Chungee10/Board.git` |
| 새 GitHub 원격 `Board` | **미완료** | 대상 저장소 API 조회 404. 현재 CLI 인증은 정지된 `01chungee10snu` 계정이므로 새 계정 로그인 필요 |
| GitHub Pages | **미완료** | 새 원격 저장소가 없어 아직 공개 접속 주소 미활성 |
| Supabase CLI 재연결 | 완료 | `supabase link --project-ref nianjjguagrddzbelcao`, `supabase/.temp/project-ref` 로컬 저장 |
| Supabase 프로젝트 상태 | 완료 | `ACTIVE_HEALTHY`, 서울 `ap-northeast-2` |
| 마이그레이션 이력 | 완료 | 로컬 SQL 5건과 원격 적용 이력 5건 일치 |
| 기존 운영 데이터 | 확인 | 세션 1건(질문 접수 중), 질문 8건, 답변 0건, 공감 0건 |
| 접근제어 | 확인 | 공개 업무 테이블 7개 모두 RLS 활성, 서버 RPC는 `authenticated`에만 실행 허용 |
| Realtime | 확인 | `meeting_posts`, `meeting_replies`, `meeting_reactions` publication 구성 |
| 현행 Auth 설정 | 확인 | 익명 사용자 활성. 원격 `site_url`과 Redirect URL은 **이전** GitHub Pages 주소만 포함 |
| 새 Supabase 계정 접근권 | **미완료** | 프로젝트 소속 조직 `hqhycnmeierokqgvhxte`에 소유자 1명. `brienz311@gmail.com`은 아직 구성원으로 조회되지 않음 |
| 새 공개 URL Auth 등록 | **미완료** | 로컬 config.toml에는 구주소+신주소를 기재했으나 원격 설정 변경은 아직 반영되지 않음 |
| 프런트엔드 단위테스트 | 완료 | 12/12 성공 |
| UI 테스트 | 완료 | 320px, 390px, 1440px 반응형·하트 토글·QR 테스트 통과 |
| 실제 DB 연동 UI 스모크 테스트 | 완료 | 로컬 운영 빌드에서 질문 8건/공감 버튼 8개 조회, JS 오류 0건 |
| 개인정보·계정명 미노출 | **추가 조치 필요** | GitHub Pages 기본 도메인은 GitHub 사용자명과 공개 Git 기록이 노출될 수 있음. 커스텀 도메인·별도 호스트 이름 필요 |

## B. 권장 이전 구조

- **프런트엔드:** `01Chungee10/Board` 저장소 `main` 브랜치의 `/(root)` 정적 산출물 → GitHub Pages.
- **백엔드:** 기존 Supabase `nianjjguagrddzbelcao` 프로젝트 그대로 사용. 운영 데이터 재입력, DB 재생성 및 SQL 재적용 금지.
- **DB 연결:** `app/.env.production.local`에 이미 존재하는 publishable 키와 프로젝트 URL을 로컬 빌드에만 사용. 비밀 키는 버전 관리에 넣지 않음.
- **QR:** `window.location.origin + import.meta.env.BASE_URL`에서 접속 주소 생성. 이전 단축링크로의 강제 이동 제거.
- **관리·인증:** 현재 Supabase 조직은 Free 플랜으로 프로젝트별 권한 분리가 불가하다. 기존 조직에 새 Gmail을 Owner로 추가하면 다른 프로젝트까지 공개되므로, 우선 프로젝트는 유지하고 새 Gmail의 **별도 조직으로 Board 프로젝트만 이전**하는 방식을 권장한다.
- **사용자 주소 익명성:** 독립적으로 관리하는 HTTPS 도메인을 Pages Custom domain에 연결해야 브라우저 주소 표시줄에서 GitHub 사용자명이 보이지 않음.

## C. 외부 계정의 사용자가 처리해야 하는 인증

1. 새 GitHub 계정 `01Chungee10`으로 GitHub CLI 또는 ChatGPT GitHub 연동을 인증한다. `gh auth login -h github.com -p https --web`로 진행 가능하며 인증 코드는 사람 본인이 승인한다.
2. Supabase를 `brienz311@gmail.com`으로 로그인해 별도 조직을 준비한다. 기존 조직(`hqhycnmeierokqgvhxte`, Free 플랜)의 Owner 계정이 이 새 조직에 가입해야 Board 프로젝트의 **조직 간 이전**을 시작할 수 있다. 기존 조직에 Gmail을 Owner로 초대하는 것은 다른 프로젝트들에 대한 과도한 접근 권한을 부여하므로 별도 승인 없이 시행하지 않는다. 이전 전에는 대상 조직의 플랜·사용량·과금 가능성·일시 중단 가능성을 검토하고, 기존 Owner 접근을 유지한다.
3. GitHub Pages 설정은 공개 저장소의 Pages → Deploy from a branch → `main` / `/(root)` 로 지정한다(아래 스크립트는 API로 이 단계까지 시도).
4. Supabase Dashboard → Authentication → URL Configuration에서 `https://01chungee10.github.io/Board/` 및 `https://01chungee10.github.io/Board/preview.html`을 허용 Redirect URL에 **추가**한다. 이전 URL은 새 사이트 검증 후 제거 여부를 판단한다. 새 Pages 가동 후 Site URL도 신주소로 전환한다.
5. GitHub 계정명 미노출이 필수라면 DNS를 관리할 수 있는 맞춤 도메인을 지정한다. 단순 단축 링크는 브라우저 최종 주소에서 GitHub 사용자명을 가리지 못한다.

## D. 이미 준비된 자동 배포

인증 후 Board 저장소 루트에서:

```bash
gh auth status
npm test
npm run stage:production
bash scripts/publish-to-new-github.sh
```

- 게시 스크립트는 인증 GitHub 사용자명이 정확히 `01Chungee10`인지 검사하고, 저장소가 없으면 신규 공개 저장소를 만든 다음 `main`을 푸시하고 Pages 구성을 진행한다.
- 스크립트가 실패하면 실패한 단계를 먼저 해결하고, 기존 Supabase 데이터를 변경하지 않는다.
- GitHub Pages가 온라인이 된 후 참가자 URL에서 공개 질문 조회·공감·질문 등록이 정상인지 확인한다. **실제 질문 작성/공감 테스트는 운영 데이터에 영향이 있으므로 별도 테스트용 행사 세션에서 수행하는 것을 권장**한다.
- 기존 운영 사이트의 접근 기록과 서비스 상태를 확인하기 전에는 기존 Supabase 프로젝트 또는 데이터 삭제 금지.

## E. 보안 및 운영 잔여 점검

- GitHub 공개 저장소는 소스, 커밋 메타데이터, 이전 계정 식별자가 노출될 수 있다. 비밀 키와 CEO 단회 코드는 절대로 커밋하지 않는다.
- 인터넷에 공개된 익명 게시판이므로 접근 URL을 아는 누구나 질문을 제출할 수 있다. 행사 규모에 맞춘 rate-limit, 보안·모니터링, 운영자의 게시 중지 절차를 확인한다.
- 전사/인사/건강 관련 민감 정보는 회사 보안 승인 없이 입력하지 않도록 참가자에게 안내한다.
- 기존 GitHub 계정이 정지되어 있으므로 계정의 재활성화 여부와 관계없이 **새 GitHub 계정으로 인증 확인 전에는 푸시 불가**. 이전 완료를 주장하지 않는다.
- Supabase CLI v2.106.0이 동작함. v3으로 업그레이드할 때 `[inbucket]`→`[local_smtp]` 호환성 및 명령 대상 기본값 변경에 주의하고, 생산 DB에 `db reset`을 절대 실행하지 않는다.

## F. 최종 완료 조건

- [ ] `github.com/01Chungee10/Board` 접근 가능, 원격 `main` 최근 커밋 반영
- [ ] `https://01chungee10.github.io/Board/` HTTP 200
- [ ] 새 Pages에서 Supabase 질문 타임라인·하트 표시 정상
- [ ] QR 스캔 시 동일한 새 사이트로 접속
- [ ] 새 Gmail 소유 조직으로 Board만 이전하거나 기존 조직 유지 결정, 원격 Auth URL 설정 반영
- [ ] 사용자명 미노출이 필요하면 별도 도메인 연결 및 최종 URL 검증
