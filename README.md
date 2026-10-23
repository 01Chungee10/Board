# 현대제철 CEO–CL 온라인 미팅

**서비스:** https://01chungee10snu.github.io/Board/

현대제철 Change Leader(CL)가 현장 질문을 남기고, CEO가 직접 질문을 선택해 답변을 게시하는 실시간 타운홀 웹앱. GitHub Pages(프런트엔드) + 별도 Supabase(데이터/Auth/Realtime)로 운영.

## 배포 아키텍처

- **URL:** `https://01chungee10snu.github.io/Board/` / GitHub Pages `gh-pages` 브랜치
- **Frontend:** React 19, Vite, 회사 CI + 용강이 원화에서 제작한 배경/캐릭터, 흰색/Pantone 288C
- **Backend:** `nianjjguagrddzbelcao` (Supabase, Seoul `ap-northeast-2`)
- **Table isolation:** 신규 `meeting_*` 테이블만 사용. 과거 Board `posts/comments`와 테스트 DB는 사용하지 않음
- **Realtime:** Supabase Postgres Changes 구독, 네트워크 장애 시 15초 주기 자동 갱신
- **Validation:** 2026-10-23 React 빌드/단위테스트 6개 PASS, 브라우저 QR/현장코드/실제 질문·댓글·공감 확인, 다른 기기로 INSERT 이벤트 수신 확인

## 현장 입장

### CL 참가자

현장에 배포하는 초대 링크 `https://01chungee10snu.github.io/Board/?join=<참여코드>`를 열면 코드가 미리 입력된 입장창이 뜸. 이름은 선택, 기본값은 Change Leader. 입장하면 질문·댓글·공감이 즉시 활성화. 참가자에게는 게시글의 익명 이름만 표시하며, 관리자에게는 식별용 감사 매핑이 보존됨.

코드를 URL에 포함해 배포할 경우 **이 URL을 아는 사람은 참가자 권한을 얻을 수 있습니다.** 대외 공개 게시물·온라인 검색·GitHub 소스에 포함하지 마세요.

### CEO

- **현장 입장(기본):** 입장창의 `CEO 직접 답변` → 운영자가 CEO에게만 전달한 **1회용 CEO 인증코드**를 입력. 기기는 Supabase Auth 익명 계정에 귀속되고, 서버에서 최초 1인에게만 `ceo` 역할을 배정. CEO 댓글은 `CEO 답변` 배지로 표시.
- **이메일 인증(선택):** 별도 이메일 인증 후 CEO 코드를 등록하는 방식도 구현됨. 단, Supabase 기본 메일 발송은 프로젝트 팀의 사전 인증된 메일 주소로 제한되므로, 일반 임직원 이메일로 사용하려면 공식 SMTP 구성이 필요.
- **분실·기기 초기화:** 최초 등록한 브라우저의 데이터를 초기화하면 재인증을 위해 운영자가 기존 CEO 역할 연결을 해제하고 코드를 재발급해야 함. 코드 재발급은 SQL Editor 관리자 권한이 필요.

**특히 중요:** 현장형 CEO 인증은 코드 소지에 대한 인증이지 회사 계정 기반의 개인 신원 검증은 아닙니다. 반드시 행사 운영자가 CEO의 기기에 직접 전달하고 입력 상태를 확인하세요. 외부 공유나 캡처 게시를 금지합니다.

## 운영자 자격증명

회의코드와 CEO 코드는 **저장소·웹 번들·GitHub Actions에 보관하지 않습니다.** 운영자 컴퓨터의 `~/.config/ceo-cl-board-deploy/venue-access.json`(파일 권한 600)에 별도 보관. 채팅·메일·공개 QR에 CEO 코드를 함께 적지 마세요. 공개 홈페이지의 QR 버튼은 URL만 안내하므로 현장 접근코드는 별도 배부합니다.

```
project_ref: nianjjguagrddzbelcao
meeting_slug: ceo-cl-2026
```

초대코드가 유효한 기간은 최초 설치일부터 30일. 종료/재개는 SQL Editor의 `meeting_sessions.is_open`으로 관리. 첫 실행 당시 실제 질문과 CEO 답변은 0건이며, 테스트 메시지는 삭제함.

## 보안과 제약

- 인증 후에도 `meeting_members` 및 각 테이블의 RLS가 서버에서 접근·역할 검증
- 가명/익명 질문 작성자 UUID는 일반 게시글에서 제외, 운영진 접근이 가능한 감사 매핑에 분리
- 질문/댓글 속도 제한, 한 사용자 1공감, 운영진만 게시글 숨김 권한
- **관리 권고:** 실명이 드러나는 개인 민원, 건강·보상·인사평가 등 민감한 내용을 입력하지 않도록 운영 안내 필요. Supabase 프로젝트는 개인 관리 계정 내에 생성됨 — 기업 보안/데이터보호 담당자 승인 및 전환 검토 필요
- Supabase Free 플랜은 장기간 활동이 없으면 자동 일시 중지될 수 있고, 백업·복구·부하보장 기능이 제한됨
- 익명 인증 로그인은 같은 NAT IP에서 시간당 120회로 설정해 놓았음. 대규모 행사에서 연결 테스트 및 CAPTCHA/보호 장치 추가 검토 필요
- 사전 승인된 기업 CI/캐릭터 사용 정책 확인

## 로컬 빌드

```bash
npm ci
npm run test
npm run dev
npm run stage:production
```

프로덕션 환경변수는 `app/.env.production.local`에 있으며 **.gitignore 처리**됨. `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`만 프런트엔드에 사용. Secret 또는 service-role 키는 절대 번들링하지 않음.

SQL 배포:

```bash
supabase link --project-ref nianjjguagrddzbelcao
supabase db push --linked
```

자산/버전 관리:

- `app/`: React 소스
- `app/public/brand/`: 현대제철 CI/용강이 실제 사용 자산
- `design-sources/`: 참고 이미지 (공개 JS에는 포함되지 않음)
- `supabase/migrations/`: 신규 회의 스키마, RLS, 초대코드 입장 및 CEO 인증
- `docs/qa/`: 로컬 브라우저 캡처
- `legacy/board-original-20261023.html`: 과거 게시판 정적 HTML 사본 (필요 시 롤백)
- `preview.html`: 새 React 화면의 별도 진입점 (실제 운영 화면과 동일)

## 후속 운영 개선 제안

1. 기업 공식 SSO·역할 매핑으로 온사이트 임시 CEO 인증을 대체
2. 운영진 모더레이션 UI 및 신고/비식별화 흐름 구축
3. 행사 종료 후 질문–CEO 답변–후속 실행과제 상태 추적/내보내기 기능 추가
4. 동시 접속 규모에 맞춰 Supabase 유료 플랜, 백업 정책, CAPTCHA, 실시간 Broadcast 검증
