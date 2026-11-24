# 2026-11-25 워크숍 Supabase 프로젝트 이전

## 목적
폐쇄된 예전 계정 소속 Supabase 프로젝트 `nianjjguagrddzbelcao`의 PostgREST 장애(PGRST002/PGRST003)에 대응해 GitHub Pages 프런트엔드는 그대로 두고 새 조직 `01Chungee10's Org`의 프로젝트 `ovhhiwntyoqwqyphoqga`로 운영 백엔드를 이전했다.

## 대상
- 운영 GitHub 저장소: `https://github.com/01Chungee10/Board` (변경 없음)
- GitHub Pages: `https://01chungee10.github.io/Board/` (변경 없음)
- 신규 Supabase: `https://ovhhiwntyoqwqyphoqga.supabase.co`, 서울 리전, 무료 플랜
- 원본 Supabase: `nianjjguagrddzbelcao` (삭제/재설정하지 않음)

## 데이터 이전
- 기존 `supabase/migrations/`의 SQL 다섯 개를 새 DB에 적용했다.
- 세션 1건의 동일 UUID, 게시글 21건(공개 4/숨김 17), 작성자 21건, 공감 20건, 참가자 116건, 비공개 접근정보 1건을 복구했다.
- 사용자 참조를 위한 기존 익명 Auth 사용자 116건을 새 DB에 복원했다. 원본 Auth 사용자는 153건이었으며 전체 원자료는 비공개 로컬 백업에 보존한다.
- 원본 `auth.sessions`의 세션 토큰은 새 프로젝트로 이전하지 않는다. 방문자는 새 익명 계정으로 자동 가입한다. 따라서 기존 참가자의 본인 공감 식별 상태는 새 ID로 다시 시작하지만, 게시글 공감 총계와 원본 기록은 그대로 유지한다.
- PostgreSQL 트리거는 게시글/공감 이관 트랜잭션 안에서만 일시 비활성화하고 다시 활성화하여 과거 작성 시각·표시 상태·집계를 보존했다.
- 비밀키, CEO 원문 코드, 인증 토큰, 원문 백업은 공개 저장소에 넣지 않는다.

## 확인된 결과
- 복원 SQL 확인: 참조 익명 사용자 116, 참가자 116, 게시글 21, 공개 4, 숨김 17, 작성자 21, 공감 20, 게시글 공감 합계 20, 접근정보 1, 원본 세션 ID 일치.
- 새 API 직접 검증: 익명 로그인/`join_public_workshop` 성공, 공개 질문 4개 조회, 공감 추가 후 집계 +1, 공감 취소 후 원래 합계 복원.
- 프런트엔드 재연결: `app/.env.production.local`의 새 Supabase 주소와 publishable key로 빌드한 다음 `index.html`과 정적 자산 배포.

## 복구 및 주의사항
- 원본 DB와 SQL 마이그레이션 및 원자료 백업 삭제 금지. 별도 비공개 Mac 백업 위치: `~/AI-Interop/backups/board-online-workshop/2026-11-25-postgrest-recovery/migration-full/` (권한 0700/0600).
- 이전 프로젝트로 롤백하려면 별도 정상화가 선행되어야 한다. 기존 API는 PGRST002를 반환했으며 무조건 롤백하면 장애가 재발한다.
- 새 프로젝트의 CEO 코드 유효기간과 로그인 세션은 운영 전 확인한다. 공개 액세스 URL/QR은 그대로 사용한다.
