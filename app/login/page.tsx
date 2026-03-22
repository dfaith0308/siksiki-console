'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClientComponentClient()
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError('')

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    setLoading(false)
  } else {
    console.log('로그인 성공', data)
    router.push('/dashboard')
    router.refresh()
  }
}

  return (
    <div style={{ minHeight:'100vh', background:'var(--c-bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ marginBottom:32, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, background:'var(--c-primary)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff' }}>식</div>
          <div>
            <div style={{ fontWeight:800, fontSize:'1.1rem', color:'var(--c-text)', letterSpacing:-0.4 }}>식식이 콘솔</div>
            <div style={{ fontSize:'0.7rem', color:'var(--c-text3)', fontFamily:'JetBrains Mono,monospace' }}>Siksiki Console</div>
          </div>
        </div>
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surf)' }}>
            <h2 style={{ fontSize:'1rem', fontWeight:700, color:'var(--c-text)' }}>로그인</h2>
            <p style={{ fontSize:'0.75rem', color:'var(--c-text3)', marginTop:3 }}>B2B 식자재 공급 수주관리 시스템</p>
          </div>
          <form onSubmit={handleLogin} style={{ padding:'22px', display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="form-label">이메일</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="form-input" placeholder="admin@example.com" autoFocus autoComplete="email" />
            </div>
            <div>
              <label className="form-label">비밀번호</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="form-input" placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && <div className="alert-banner alert-r"><span>⚠</span><span>{error}</span></div>}
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width:'100%', marginTop:4 }}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', marginTop:20, fontSize:'0.72rem', color:'var(--c-text3)' }}>© 2025 Siksiki Console</p>
      </div>
    </div>
  )
}
