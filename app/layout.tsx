import type { Metadata } from 'next'
import './globals.css'
import { createSupabaseServerClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: '식식이 콘솔',
  description: 'B2B 식자재 공급 CRM + 수주관리',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {}

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {user ? (
          <div className="app-shell">
            <Sidebar user={user} />
            <main className="app-main">{children}</main>
          </div>
        ) : (
          <>{children}</>
        )}
      </body>
    </html>
  )
}