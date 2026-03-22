import React from 'react'

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr>{Array.from({length:cols}).map((_,i)=><th key={i}><span className="skeleton skeleton-text" style={{display:'block',width:'60%'}}>&nbsp;</span></th>)}</tr></thead>
        <tbody>{Array.from({length:rows}).map((_,r)=><tr key={r}>{Array.from({length:cols}).map((_,c)=><td key={c}><span className="skeleton skeleton-text" style={{display:'block',width:c===0?'70%':'55%'}}>&nbsp;</span></td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export function TableEmpty({ colSpan, message }: { colSpan: number; message?: string }) {
  return <tr><td colSpan={colSpan} className="table-empty">{message ?? '데이터가 없습니다'}</td></tr>
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="alert-banner alert-r"><span>⚠</span><span>{message}</span></div>
}

export function SuccessBanner({ message }: { message: string }) {
  return <div className="alert-banner alert-g"><span>✓</span><span>{message}</span></div>
}
