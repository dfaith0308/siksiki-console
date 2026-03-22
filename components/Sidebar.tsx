'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'

const NAV = [
  { href: '/dashboard',   label: '대시보드', icon: '⊞' },
  { href: '/customers',   label: '거래처',   icon: '◎' },
  { href: '/products',    label: '상품',     icon: '▣' },
  { href: '/orders',      label: '주문',     icon: '◧' },
  { href: '/activities',  label: '활동',     icon: '◈' },
  { href: '/receivables', label: '미수금',   icon: '◉' },
  { href: '/settings',    label: '설정',     icon: '⊙' },
]

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link href={href} style={{
      display:'flex', alignItems:'center', gap:10, padding:'8px 11px', borderRadius:7,
      fontSize:'0.83rem', fontWeight: active ? 700 : 400,
      color: active ? '#fff' : 'rgba(255,255,255,0.58)',
      background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
      textDecoration:'none', transition:'all 0.12s',
    }}>
      <span style={{ fontSize:'0.85rem', lineHeight:1, opacity: active ? 1 : 0.65 }}>{icon}</span>
      <span>{label}</span>
      {active && <span style={{ marginLeft:'auto', width:4, height:4, borderRadius:'50%', background:'#fff', opacity:0.7, flexShrink:0 }} />}
    </Link>
  )
}

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClientComponentClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{ width:216, minWidth:216, background:'#1f5d3a', display:'flex', flexDirection:'column', height:'100vh', flexShrink:0, borderRight:'1px solid rgba(0,0,0,0.15)' }}>
      <div style={{ padding:'16px 16px 13px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, background:'rgba(255,255,255,0.18)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#fff', flexShrink:0 }}>식</div>
          <div>
            <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#fff', letterSpacing:-0.4, lineHeight:1.2 }}>식식이 콘솔</div>
            <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.45)', fontFamily:'JetBrains Mono,monospace', letterSpacing:0.5 }}>Siksiki Console</div>
          </div>
        </div>
      </div>

      <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2 }}>
        {NAV.map(item => {
          const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
          return <NavItem key={item.href} {...item} active={active} />
        })}
      </nav>

      <div style={{ padding:'0 8px 8px' }}>
        <Link href="/orders/new" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'9px 0', borderRadius:7, fontSize:'0.8rem', fontWeight:700, background:'rgba(255,255,255,0.18)', color:'#fff', textDecoration:'none', border:'1px solid rgba(255,255,255,0.2)', transition:'background 0.12s' }}>
          + 주문 등록
        </Link>
      </div>

      <div style={{ padding:'11px 14px', borderTop:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.45)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</span>
        <button onClick={logout} style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.38)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>로그아웃</button>
      </div>
    </aside>
  )
}
