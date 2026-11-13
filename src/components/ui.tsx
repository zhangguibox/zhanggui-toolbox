import type { ReactNode } from 'react'

export function PageHead({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children?: ReactNode
}) {
  return (
    <div className="page-head no-print">
      <div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      <div className="tools">{children}</div>
    </div>
  )
}

export function Card({
  title,
  children,
  actions,
}: {
  title?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="card">
      {title && (
        <div className="card-head">
          <h2>{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={'field' + (className ? ' ' + className : '')}>
      <span>
        {label}
        {required && <em className="req">*</em>}
      </span>
      {children}
    </label>
  )
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'in' | 'out' | ''
}) {
  return (
    <div className={'stat' + (tone ? ' ' + tone : '')}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}
