# 현대제철 CEO–CL 온라인 미팅

현대제철 최고경영자(CEO)와 Change Leader(CL)의 실시간 타운홀 대화를 위한 웹앱.

> **2026-10-23 상태:** 디자인·프런트엔드 구현과 로컬 테스트가 끝난 **미리보기**입니다. 보안 데이터베이스와 기업 인증/승인 절차가 완료되기 전까지 실제 사내 의견을 입력하거나 운영하지 않습니다.
>
> 원래 GitHub Pages 홈페이지(`index.html`)와 과거 `posts`/`comments` 데이터는 변경하지 않습니다. 개편 화면은 `preview.html`로 분리해 준비합니다.

## 구성

| 분야 | 설계 |
|---|---|
| 프런트엔드 | React + Vite, Pretendard 호환 고딕/Noto Sans KR, 모바일 반응형 |
| 디자인 | 흰색 배경, Pantone 288C(` #002D62 `), 회사 CI 원본, 용강이 이미지 및 별도 배경 그래픽 |
| 타임라인 | 최신순/공감순, 유형별 필터, 질문 검색, CEO 답변 여부 표시 |
| 참여 | 실명/익명 CL 질문, 답변 및 댓글, 사용자별 1회 공감, QR 모바일 접속 |
| 실시간 동기화 | Supabase Postgres Changes + 15초 폴링 백업(실서비스 백엔드 활성화 후) |
| 인증 | 사전 초대된 구성원 이메일 OTP, Supabase Auth 및 회원 테이블 검증 |
| 권한 | CEO/CL/운영진 역할은 서버에서만 부여, SQL RLS 및 감사 매핑 테이블 적용 |
| 보안 | 작성자 UUID는 참가자에게 제공하지 않고, 익명 원문과 감사 기록 분리 |

## 화면 확인

`docs/qa/desktop.png` / `docs/qa/mobile.png`은 로컬 브라우저에서 검증한 실제 화면 캡처입니다. 화면에 포함된 질문과 답변은 **모두 가상 예시**입니다.

### 개발/미리보기

```bash
npm ci
npm run test
npm run dev # http://127.0.0.1:5173/Board/
npm run stage:preview # /Board/preview.html 배포 파일 구성, index.html 유지
```

GitHub Pages의 루트 `index.html`은 구버전 서비스로 그대로 유지합니다. `stage:preview`는 새 빌드를 `preview.html`, `brand/`, `assets/`, `favicon.svg`에만 배치합니다. PR 병합 전까지 GitHub Pages URL에 적용되지 않습니다.

프로젝트 구조:

- `app/`: Vite/React 소스 (`app/index.html`)
- `app/public/brand/`: 실제 서비스에서 사용하는 CI, 용강이, 생성형 배경 그래픽
- `design-sources/`: 이미지 리빌드용 내부 원본 (배포 산출물에는 포함되지 않음)
- `scripts/build-brand-art.mjs`: 원본 용강이 이미지에서 웹용 자산 추출·최적화
- `supabase/migrations/`: 신규 회의 테이블·RLS·서버 검증 트리거
- `docs/qa/`: 로컬 브라우저 검증 화면

## 운영 활성화 전 필수 작업 (회사의 IT·보안 책임자와 승인)

1. **사내 데이터 저장 승인:** 기존 개인 계정의 Supabase `test` 프로젝트는 2026-10-23 조회 당시 **INACTIVE**였으며 기업용 운영처로 승인되지 않았습니다. 사용자·대화 내용의 저장 위치, 책임자, 접근 및 보존 기한, 파기 규정을 회사 기준에 맞춰 확인한 **전용 프로젝트**를 사용하세요. 유효한 서비스용 Supabase URL과 **publishable** 키만 클라이언트에 주입합니다. `service_role` 키는 절대 브라우저·GitHub에 포함하지 않습니다.
2. **SQL 마이그레이션:** 승인된 Supabase SQL Editor에서 `supabase/migrations/20261023090000_ceo_cl_secure_meeting.sql`을 적용합니다. 새로운 `meeting_*` 테이블만 생성되며 기존 `posts`/`comments`를 수정하지 않습니다. 스크립트는 라이브 백엔드에서 아직 실행하지 않았으므로 별도 스테이징 DB에서 RLS 검증 후 운영 DB에 적용해야 합니다.
3. **구성원 초대/식별:** Supabase Auth에서 참여자 계정을 관리자가 사전 등록합니다. 아래 SQL을 참고해 Auth 사용자 UUID별 `cl`, `ceo`, `moderator` 역할을 등록합니다. 이메일 OTP 대신 사내 Microsoft Entra ID SSO 등 공식 인증 체계 연계가 가능하다면 기업 SSO 사용을 권장합니다. OTP Redirect URL에 `https://01chungee10snu.github.io/Board/`를 등록해야 합니다(미리보기에는 `/preview.html`도 등록).
4. **RLS 검증:** 비로그인 조회 불가, CL의 CEO 역할 사칭 불가, 익명 글 작성자 UUID의 일반 참가자 노출 불가, 1인 1공감, 운영진만 숨김, 초대 해제 계정 차단 등을 실제 계정별로 점검합니다. 데이터 및 세션의 보존/삭제 정책, 유해 글 신고·모더레이션 정책도 결정해야 합니다.
5. **세션 오픈:** 준비가 끝난 뒤에만 `meeting_sessions.is_open=true` 설정. 기한 종료 시 `false`로 전환합니다.
6. **배포 전환:** 검증된 `.env` 또는 GitHub Actions 환경변수로 빌드하고 리뷰 후 메인 `index.html`을 전환합니다. 별도의 콘텐츠 승인 없이 미리보기에서 프로덕션으로 자동 전환하지 않습니다.

### 회원·진행자 등록 예시 (신규 프로젝트에서 관리자가 실행)

```sql
-- UUID는 Auth > Users에서 확인. 사용자에게 role 선택권을 제공하지 마세요.
insert into public.meeting_members (user_id, display_name, role)
values ('00000000-0000-4000-8000-000000000001','참여 구성원','cl');
-- 실제 Auth 사용자 UUID로 바꾸어 사용. 존재하지 않는 UUID는 FK 제약으로 실패합니다.

-- 행사 오픈: 보안 테스트와 참여자 초대 완료 후에만 실행
update public.meeting_sessions set is_open=true where slug='ceo-cl-2026';
```

### 배포 환경변수

`.env.example` 참고. 새 클라이언트는 환경변수가 누락되면 **가상 글만 표시하고 서버 쓰기를 차단**합니다.

```text
VITE_SUPABASE_URL=https://<approved-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_MEETING_SLUG=ceo-cl-2026
```

## 위험 및 운영 원칙

- **가상 익명성 금지:** 참가자 화면에 보이지 않아도 실제 작성자는 별도 운영진 감사 테이블에 저장됩니다. 개인정보 고지 시 이를 정확히 알려야 합니다.
- **실시간 기술의 한계:** Postgres Changes는 소규모 온라인 타운홀에 적합하며, 동시 접속이 급증하면 Supabase 공식 Broadcast 기반 전송과 부하 테스트가 필요합니다.
- **참여 심리적 안전:** 의견 수와 공감을 성과평가 지표나 개별 CL 순위로 이용하지 않는 운영원칙이 바람직합니다.
- **브랜드 승인:** 현대제철 CI 및 용강이 원본은 내부 이미지 자료에서 취득했으므로 공식 브랜드 관리 기준에 따라 사용 승인을 확인하세요. 브랜드 마크를 임의로 변형하지 않았습니다.
- **과거 데이터 분리:** 기존 게시글/댓글은 새 회의 데이터로 마이그레이션하지 않습니다. 개인 운영 테스트 프로젝트를 기업 대화 DB로 재사용하지 않습니다.

## 검증 내역

- `npm run test`: 6개 유틸리티 단위 테스트 통과
- `npm run build`: 성공
- `node scripts/qa-preview.mjs`: 1440px 데스크톱 및 390px 모바일 렌더링 확인, 콘솔 에러 0, 모바일 가로 넘침 없음
- 보안 SQL은 작성과 정적 검토까지 완료했으며 승인된 Supabase 프로젝트에 대한 실행/실데이터 테스트는 미수행
