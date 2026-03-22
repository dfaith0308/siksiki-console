import { createSupabaseServerClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return (
    <div className="app-shell">
      <Sidebar user={user} />
      <main className="app-main">{children}</main>
    </div>
  )
}
