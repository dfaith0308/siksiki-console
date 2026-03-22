'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createActivity } from '@/lib/activities'

export default function ActivityForm({ customerId }: { customerId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ activity_type:'', channel:'', result:'', next_action_date:'' })

  function set(k: string, v: string) { setForm(p=>({...p,[k]:v})) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.activity_type) { setError('활동 유형을 선택해주세요.'); return }
    setError('')
    startTransition(async () => {
      try {
        await createActivity({ customer_id:customerId, activity_type:form.activity_type, channel:form.channel||undefined, result:form.result||undefined, next_action_date:form.next_action_date||undefined })
        setForm({ activity_type:'', channel:'', result:'', next_action_date:'' })
        setOpen(false); router.refresh()
      } catch (err: unknown) { setError(err instanceof Error ? err.message : '오류가 발생했습니다.') }
    })
  }

  if (!open) return <button onClick={()=>setOpen(true)} className="btn btn-outline btn-sm">+ 활동 기록 추가</button>

  return (
    <form onSubmit={handleSubmit} className="card" style={{ overflow:'hidden' }}>
      <div className="section-head">
        <span className="section-title">활동 기록 추가</span>
        <button type="button" onClick={()=>setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--c-text3)', fontSize:'1rem', lineHeight:1 }}>×</button>
      </div>
      <div style={{ padding:'16px 20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
          <div>
            <label className="form-label">활동 유형 <span style={{color:'var(--c-danger)'}}>*</span></label>
            <select value={form.activity_type} onChange={e=>set('activity_type',e.target.value)} className="form-select form-select-sm" required autoFocus>
              <option value="">선택</option>
              <option value="전화">전화</option><option value="방문">방문</option>
              <option value="문자">문자</option><option value="이메일">이메일</option><option value="기타">기타</option>
            </select>
          </div>
          <div>
            <label className="form-label">채널</label>
            <input type="text" value={form.channel} onChange={e=>set('channel',e.target.value)} className="form-input form-input-sm" placeholder="카카오톡, 전화 등" />
          </div>
          <div>
            <label className="form-label">내용 / 결과</label>
            <input type="text" value={form.result} onChange={e=>set('result',e.target.value)} className="form-input form-input-sm" placeholder="통화 내용 요약" />
          </div>
          <div>
            <label className="form-label">다음 액션 날짜</label>
            <input type="date" value={form.next_action_date} onChange={e=>set('next_action_date',e.target.value)} className="form-input form-input-sm" />
          </div>
        </div>
        {error && <div className="alert-banner alert-r" style={{marginTop:10}}><span>⚠</span><span>{error}</span></div>}
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">{isPending?'저장 중...':'저장'}</button>
          <button type="button" onClick={()=>setOpen(false)} className="btn btn-outline btn-sm">취소</button>
        </div>
      </div>
    </form>
  )
}
