'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function Row({ label, sub, action }: { label: string; sub?: string; action: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text)' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: 'var(--c-text3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div>{action}</div>
    </div>
  )
}

export default function SettingsPage() {
  const supabase = createClientComponentClient()
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMsg,     setBackupMsg]     = useState('')
  const [newEmail,      setNewEmail]      = useState('')
  const [newPassword,   setNewPassword]   = useState('')
  const [memberMsg,     setMemberMsg]     = useState('')
  const [memberLoading, setMemberLoading] = useState(false)
  const [members,       setMembers]       = useState<{ id: string; email: string; created_at: string }[]>([])

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    const res = await fetch('/api/admin/members')
    if (res.ok) {
      const data = await res.json()
      setMembers(data.users ?? [])
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail || !newPassword) return
    setMemberLoading(true); setMemberMsg('')
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: newPassword }),
    })
    const data = await res.json()
    if (res.ok) {
      setMemberMsg(`✓ ${newEmail} 계정이 생성되었습니다.`)
      setNewEmail(''); setNewPassword('')
      fetchMembers()
    } else {
      setMemberMsg(`오류: ${data.error}`)
    }
    setMemberLoading(false)
  }

  async function triggerBackup() {
    setBackupLoading(true); setBackupMsg('')
    try {
      const res = await fetch('/api/backup', { method: 'POST' })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `backup-${new Date().toISOString().split('T')[0]}.zip`; a.click(); URL.revokeObjectURL(url)
        setBackupMsg('백업이 완료되었습니다.')
      } else { setBackupMsg('백업 실패. 관리자 권한이 필요합니다.') }
    } catch { setBackupMsg('백업 중 오류가 발생했습니다.') }
    finally { setBackupLoading(false) }
  }

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div><h1 className="page-title">설정</h1><p className="page-sub">시스템 설정 및 데이터 관리</p></div>
      </div>
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>

        {/* 멤버 관리 */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="section-head"><span className="section-title">멤버 관리</span></div>
          <div style={{ padding: '18px 20px' }}>

            {/* 현재 멤버 목록 */}
            {members.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>현재 멤버</div>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--c-surf)', borderRadius: 'var(--r-md)', marginBottom: 6, border: '1px solid var(--c-border)' }}>
                    <span style={{ fontSize: '0.83rem', color: 'var(--c-text)' }}>{m.email}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text3)' }}>{new Date(m.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 새 계정 추가 */}
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>새 계정 추가</div>
            <form onSubmit={addMember} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="form-label">이메일</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="form-input" placeholder="직원이메일@example.com" required />
              </div>
              <div>
                <label className="form-label">초기 비밀번호</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input" placeholder="8자 이상" minLength={8} required />
              </div>
              {memberMsg && (
                <div className={`alert-banner ${memberMsg.startsWith('✓') ? 'alert-g' : 'alert-r'}`}>
                  <span>{memberMsg.startsWith('✓') ? '✓' : '⚠'}</span><span>{memberMsg}</span>
                </div>
              )}
              <button type="submit" disabled={memberLoading} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
                {memberLoading ? '생성 중...' : '계정 생성'}
              </button>
            </form>
          </div>
        </div>

        {/* 데이터 내보내기 */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="section-head"><span className="section-title">데이터 내보내기</span></div>
          <div style={{ padding: '0 20px' }}>
            <Row label="거래처 목록"  sub="전체 거래처 정보를 Excel로 내보냅니다"  action={<Link href="/api/export/customers"   className="btn btn-outline btn-sm">Excel 다운로드</Link>} />
            <Row label="상품 목록"    sub="전체 상품 정보를 Excel로 내보냅니다"    action={<Link href="/api/export/products"    className="btn btn-outline btn-sm">Excel 다운로드</Link>} />
            <Row label="주문 내역"    sub="전체 주문 및 품목을 Excel로 내보냅니다" action={<Link href="/api/export/orders"      className="btn btn-outline btn-sm">Excel 다운로드</Link>} />
            <Row label="미수금 현황"  sub="전체 미수금 현황을 Excel로 내보냅니다"  action={<Link href="/api/export/receivables" className="btn btn-outline btn-sm">Excel 다운로드</Link>} />
          </div>
        </div>

        {/* 백업 */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="section-head"><span className="section-title">데이터 백업</span></div>
          <div style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--c-text2)', lineHeight: 1.6, marginBottom: 14 }}>전체 데이터를 ZIP 파일로 백업합니다.</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={triggerBackup} disabled={backupLoading} className="btn btn-primary btn-sm">{backupLoading ? '백업 중...' : '지금 백업'}</button>
              {backupMsg && <span style={{ fontSize: '0.78rem', color: backupMsg.includes('완료') ? 'var(--c-success-text)' : 'var(--c-danger-text)', fontWeight: 600 }}>{backupMsg}</span>}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}