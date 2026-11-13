import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { PageHead, Card, Field, Stat } from '../components/ui'
import { useStored } from '../lib/useStored'
import { fmtDate, todayStr, uid, downloadText, downloadDataUrl, addBusinessDays } from '../lib/format'

interface Task {
  id: string
  client: string
  req: string
  days: string
  prio: '高' | '中' | '低'
}

interface PlanRow {
  task: Task
  start: Date
  end: Date
  days: number
  leftPct: number
  widthPct: number
}

const PRIO_RANK = { 高: 0, 中: 1, 低: 2 } as const

const normalizeStart = (d: Date, skip: boolean) => {
  const x = new Date(d)
  while (skip && (x.getDay() === 0 || x.getDay() === 6)) x.setDate(x.getDate() + 1)
  return x
}

export default function Schedule() {
  const [tasks, setTasks] = useStored<Task[]>('sched.tasks', [])
  const [startDate, setStartDate] = useStored<string>('sched.start', todayStr())
  const [skipWeekend, setSkipWeekend] = useStored<boolean>('sched.skip', true)
  const [newTask, setNewTask] = useState({ client: '', req: '', days: '1', prio: '中' as Task['prio'] })
  const [busy, setBusy] = useState(false)
  const planRef = useRef<HTMLDivElement>(null)

  const plan = useMemo<PlanRow[]>(() => {
    if (tasks.length === 0) return []
    const sorted = [...tasks].sort((a, b) => PRIO_RANK[a.prio] - PRIO_RANK[b.prio])
    let cursor = normalizeStart(new Date(startDate + 'T00:00:00'), skipWeekend)
    const rows: PlanRow[] = []
    for (const t of sorted) {
      const days = Math.max(1, Math.ceil(parseFloat(t.days) || 1))
      const start = new Date(cursor)
      const end = addBusinessDays(start, days - 1, skipWeekend)
      rows.push({ task: t, start, end, days, leftPct: 0, widthPct: 0 })
      cursor = normalizeStart(addBusinessDays(end, 1, skipWeekend), skipWeekend)
    }
    const t0 = rows[0].start.getTime()
    const t1 = rows[rows.length - 1].end.getTime()
    const span = Math.max(1, t1 - t0)
    for (const r of rows) {
      r.leftPct = Math.round(((r.start.getTime() - t0) / span) * 1000) / 10
      r.widthPct = Math.max(3, Math.round(((r.end.getTime() - r.start.getTime() + 86400000) / span) * 1000) / 10)
    }
    return rows
  }, [tasks, startDate, skipWeekend])

  const totalDays = useMemo(
    () => plan.reduce((s, r) => s + r.days, 0),
    [plan],
  )

  const addTask = () => {
    if (!newTask.req.trim()) return alert('请填写需求内容')
    setTasks((ts) => [
      ...ts,
      {
        id: uid(),
        client: newTask.client.trim(),
        req: newTask.req.trim(),
        days: newTask.days,
        prio: newTask.prio,
      },
    ])
    setNewTask((n) => ({ ...n, req: '', client: '' }))
  }

  const up = (id: string, patch: Partial<Task>) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const move = (id: string, dir: -1 | 1) =>
    setTasks((ts) => {
      const i = ts.findIndex((t) => t.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= ts.length) return ts
      const next = [...ts]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const del = (id: string) => setTasks((ts) => ts.filter((t) => t.id !== id))

  const planText = () => {
    const head = `排期表（开工 ${startDate}${skipWeekend ? '，跳过周末' : ''}）\n`
    const lines = plan.map((r, i) => {
      const p = PRIO_RANK[r.task.prio] === 0 ? '〔高〕' : PRIO_RANK[r.task.prio] === 1 ? '〔中〕' : '〔低〕'
      return `${i + 1}. ${r.task.req}${r.task.client ? '（' + r.task.client + '）' : ''} ${p} ${fmtDate(r.start)} → ${fmtDate(r.end)}，${r.days} 天`
    })
    return head + lines.join('\n')
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(planText())
      alert('已复制到剪贴板，可直接粘贴到微信发送')
    } catch {
      window.prompt('复制失败，请手动复制：', planText())
    }
  }

  const exportPng = async () => {
    if (!planRef.current) return
    setBusy(true)
    try {
      const dataUrl = await toPng(planRef.current, { pixelRatio: 2, cacheBust: true })
      downloadDataUrl(`排期表-${startDate}.png`, dataUrl)
    } catch {
      alert('导出失败，可改用「复制文本」')
    } finally {
      setBusy(false)
    }
  }

  const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000) + 1

  return (
    <div className="page">
      <PageHead title="需求排期" desc="把零散需求整理成任务，自动排出一张可执行的工期表">
        <button className="btn" onClick={copyText}>
          📋 复制文本
        </button>
        <button className="btn" onClick={() => downloadText(`排期表-${startDate}.txt`, planText())}>
          ⬇ 下载 TXT
        </button>
        <button className="btn primary" onClick={exportPng} disabled={busy || plan.length === 0}>
          {busy ? '导出中…' : '📥 导出图片'}
        </button>
      </PageHead>

      <Card title="➕ 添加任务">
        <div className="form-grid">
          <Field label="客户（选填）">
            <input
              value={newTask.client}
              onChange={(e) => setNewTask((n) => ({ ...n, client: e.target.value }))}
              placeholder="如：XX 公司"
            />
          </Field>
          <Field label="需求内容" required>
            <input
              value={newTask.req}
              onChange={(e) => setNewTask((n) => ({ ...n, req: e.target.value }))}
              placeholder="如：设计新菜单，更新灯箱图"
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
            />
          </Field>
          <Field label="预计天数">
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={newTask.days}
              onChange={(e) => setNewTask((n) => ({ ...n, days: e.target.value }))}
            />
          </Field>
          <Field label="优先级">
            <select
              value={newTask.prio}
              onChange={(e) => setNewTask((n) => ({ ...n, prio: e.target.value as Task['prio'] }))}
            >
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
            </select>
          </Field>
        </div>
        <div className="tools" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={addTask}>
            ＋ 加入清单
          </button>
          <label className="field inline">
            <span>开工日期</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: 'auto' }}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={skipWeekend}
              onChange={(e) => setSkipWeekend(e.target.checked)}
            />
            跳过周末
          </label>
        </div>
      </Card>

      <Card title="📋 任务清单">
        {tasks.length === 0 ? (
          <div className="hint">还没有任务。把客户零散的需求填进去，例如：换菜单、做海报、上新品、装修卫生间……</div>
        ) : (
          <div className="tb-wrap">
            <table className="tb">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>#</th>
                  <th>客户</th>
                  <th>需求内容</th>
                  <th style={{ width: 84 }}>天数</th>
                  <th style={{ width: 72 }}>优先级</th>
                  <th style={{ width: 120 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={t.id}>
                    <td className="num">{i + 1}</td>
                    <td style={{ minWidth: 90 }}>
                      <input value={t.client} onChange={(e) => up(t.id, { client: e.target.value })} />
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <input value={t.req} onChange={(e) => up(t.id, { req: e.target.value })} />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={t.days}
                        onChange={(e) => up(t.id, { days: e.target.value })}
                      />
                    </td>
                    <td>
                      <select value={t.prio} onChange={(e) => up(t.id, { prio: e.target.value as Task['prio'] })}>
                        <option value="高">高</option>
                        <option value="中">中</option>
                        <option value="低">低</option>
                      </select>
                    </td>
                    <td>
                      <div className="rowbtns">
                        <button className="btn sm" onClick={() => move(t.id, -1)} disabled={i === 0}>
                          ↑
                        </button>
                        <button
                          className="btn sm"
                          onClick={() => move(t.id, 1)}
                          disabled={i === tasks.length - 1}
                        >
                          ↓
                        </button>
                        <button className="btn sm danger" onClick={() => del(t.id)}>
                          删
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {plan.length > 0 && (
        <Card title="📅 排期表">
          <div className="stats" style={{ marginBottom: 12 }}>
            <Stat label="开工" value={fmtDate(plan[0].start)} />
            <Stat label="完工" value={fmtDate(plan[plan.length - 1].end)} />
            <Stat label="任务数" value={String(plan.length)} />
            <Stat label="总工时" value={totalDays + ' 人天'} />
          </div>
          <div id="schedule-plan" ref={planRef} className="tl-plan">
            <div className="tl-head">
              <span>📅 {fmtDate(plan[0].start)}</span>
              <span>
                共 {daysBetween(plan[0].start, plan[plan.length - 1].end)} 天（
                {skipWeekend ? '含周末' : '自然日'}）
              </span>
              <span>{fmtDate(plan[plan.length - 1].end)} 📅</span>
            </div>
            {plan.map((r) => (
              <div className="tl-row" key={r.task.id}>
                <div className="tl-label">
                  <b>{r.task.req}</b>
                  <i>
                    {r.task.client && `${r.task.client} · `}
                    {fmtDate(r.start)} → {fmtDate(r.end)}
                  </i>
                </div>
                <div className="tl-track">
                  <div
                    className={'tl-bar p' + r.task.prio}
                    style={{ left: r.leftPct + '%', width: r.widthPct + '%' }}
                  >
                    {r.days}天
                  </div>
                </div>
              </div>
            ))}
            <div className="tl-foot">高优先级排在最前 · 每天一件，干完上墙</div>
          </div>
        </Card>
      )}
    </div>
  )
}
