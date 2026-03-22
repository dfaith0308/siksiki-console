# 식식이 콘솔 (Siksiki Console)

B2B 식자재 공급 CRM + 수주관리 SaaS

---

## 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 에 Supabase 값 입력

# 3. Supabase SQL Editor 에서 실행
# schema_full.sql 전체 실행

# 4. Supabase Storage → New bucket
# 이름: backups  /  접근: private

# 5. 실행
npm run dev
# http://localhost:3000
```

---

## 프로젝트 구조

```
/                        ← 루트
├── middleware.ts         ← 인증 미들웨어
├── schema_full.sql       ← DB 초기화 (Supabase SQL Editor 에서 실행)
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
│
├── app/                  ← Next.js App Router
│   ├── layout.tsx        ← 루트 레이아웃 (HTML 껍데기만)
│   ├── page.tsx          ← / → /dashboard 리디렉트
│   ├── globals.css       ← 디자인 토큰 + 공통 CSS 클래스
│   ├── login/            ← 로그인 (인증 불필요)
│   └── (app)/            ← 인증 영역 (URL에 미노출)
│       ├── layout.tsx    ← 사이드바 레이아웃
│       ├── dashboard/
│       ├── customers/    ← 목록 + [id] 상세 + new
│       ├── orders/       ← 목록 + [id] 상세 + new
│       ├── products/     ← 목록 + [id] 상세 + new
│       ├── activities/
│       ├── receivables/
│       ├── settings/
│       ├── print/        ← 원장(ledger) + 전표(invoice) 출력
│       └── api/          ← Excel 내보내기 + 백업 API
│
├── components/
│   ├── Sidebar.tsx
│   ├── OrderForm.tsx
│   ├── CustomerEditForm.tsx
│   ├── ProductEditForm.tsx
│   ├── ActivityForm.tsx
│   ├── OrderPaymentStatusForm.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Number.tsx
│       └── Feedback.tsx
│
├── lib/                  ← 서버 액션 + 유틸리티
│   ├── supabase.ts
│   ├── customers.ts
│   ├── products.ts
│   ├── orders.ts         ← 주문 트랜잭션 + 가격 autofill
│   ├── receivables.ts
│   ├── activities.ts
│   ├── dashboard.ts
│   ├── xlsx.ts
│   └── backup.ts
│
└── types/
    └── index.ts
```

---

## 인증

| 경로 | 접근 |
|------|------|
| `/login` | 누구나 |
| `/_next/*`, 정적파일 | 제외 |
| 그 외 모든 경로 | `middleware.ts` → 미인증시 `/login` 리디렉트 |

---

## 관리자 권한 (백업 API)

Supabase 대시보드 → Authentication → Users → Edit → `app_metadata`:
```json
{ "role": "admin" }
```
