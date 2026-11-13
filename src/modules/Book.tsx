import { useMemo, useRef, useState } from 'react'
import { PageHead, Card, Field, Stat } from '../components/ui'
import { Donut } from '../components/Chart'
import { useStored } from '../lib/useStored'
import { fmtMoney, todayStr, uid, downloadText } from '../lib/format'

interface Entry {
  id: string
  date: string
  type: '收' | '支'
  category: string
  amount: string
  note: string
}

const EXPENSE_CATS = ['进货采购', '餐饮', '交通出行', '购物消费', '居住生活', '医疗健康', '教育培训', '休闲娱乐', '金融保险', '员工工资', '广告营销', '其他支出']
const INCOME_CATS = ['平台结算', '门店收款', '其他收入']

export default function Book() {
  const [entries, setEntries] = useStored<Entry[]>('book.entries', [])
  const [form, setForm] = useState({
    date: todayStr(),
    type: '支' as '收' | '支',
    category: EXPENSE_CATS[0],
    amount: '',
    note: '',
  })
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const fileRef = useRef<HTMLInputElement>(null)

  const curMonth = todayStr().slice(0, 7)
  const months = useMemo(
    () =>
      [...new Set([...entries.map((e) => e.date.slice(0, 7)), curMonth])].sort().reverse(),
    [entries, curMonth],
  )

  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => month === '' || e.date.slice(0, 7) === month)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, month],
  )

  const stat = useMemo(() => {
    let inSum = 0
    let outSum = 0
    for (const e of monthEntries) {
      const v = parseFloat(e.amount) || 0
      if (e.type === '收') inSum += v
      else outSum += v
    }
    return { inSum, outSum, balance: inSum - outSum, count: monthEntries.length }
  }, [monthEntries])

  const donutData = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of monthEntries) {
      if (e.type !== '支') continue
      map.set(e.category, (map.get(e.category) || 0) + (parseFloat(e.amount) || 0))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [monthEntries])

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of monthEntries) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date)!.push(e)
    }
    return [...map.entries()]
  }, [monthEntries])

  const add = () => {
    const v = parseFloat(form.amount)
    if (!isFinite(v) || v <= 0) return alert('请填写正确的金额')
    setEntries((es) => [
      ...es,
      {
        id: uid(),
        date: form.date,
        type: form.type,
        category: form.category,
        amount: String(Math.round(v * 100) / 100),
        note: form.note.trim(),
      },
    ])
    setForm((f) => ({ ...f, amount: '', note: '' }))
  }

  const del = (id: string) => setEntries((es) => es.filter((e) => e.id !== id))

  const exportBackup = () => {
    if (entries.length === 0) return alert('没有可备份的数据')
    downloadText(`账本备份-${todayStr()}.json`, JSON.stringify(entries, null, 2), 'application/json')
  }

  const importBackup = (text: string) => {
    try {
      const arr = JSON.parse(text) as Entry[]
      if (!Array.isArray(arr)) throw new Error('格式不对')
      if (entries.length > 0 && !window.confirm(`导入将替换当前 ${entries.length} 条记录，继续吗？`)) return
      setEntries(arr)
      alert(`导入成功：${arr.length} 条记录`)
    } catch {
      alert('导入失败：文件不是本工具导出的备份格式')
    }
  }

  const clearAll = () => {
    if (window.confirm('确定清空全部账本数据吗？建议先「导出备份」。')) setEntries([])
  }

  return (
    <div className="page">
      <PageHead title="收支账本" desc="随手记一笔，月底一眼看清钱花在哪">
        <button className="btn" onClick={exportBackup}>
          ⬇ 导出备份
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          📂 导入备份
        </button>
        <button className="btn danger" onClick={clearAll}>
          清空
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            f.text().then(importBackup)
          }}
        />
      </PageHead>

      <Card title="➕ 记一笔">
        <div className="form-grid">
          <Field label="日期">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field label="类型">
            <div className="seg">
              <button
                className={form.type === '支' ? 'seg-btn on out' : 'seg-btn'}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    type: '支',
                    category: f.category.startsWith('支出') || EXPENSE_CATS.includes(f.category) ? f.category : EXPENSE_CATS[0],
                  }))
                }
              >
                支出
              </button>
              <button
                className={form.type === '收' ? 'seg-btn on in' : 'seg-btn'}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    type: '收',
                    category: INCOME_CATS.includes(f.category) ? f.category : INCOME_CATS[0],
                  }))
                }
              >
                收入
              </button>
            </div>
          </Field>
          <Field label="分类">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {(form.type === '支' ? EXPENSE_CATS : INCOME_CATS).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="金额（元）" required>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
            />
          </Field>
          <Field label="备注">
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="如：鸡腿肉进货"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
          </Field>
        </div>
        <div className="tools" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={add}>
            💾 保存这笔
          </button>
        </div>
      </Card>

      <Card title="🔍 月份">
        <div className="form-grid">
          <label className="field">
            <span>查看月份</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">全部</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="stats">
        <Stat label="收入" value={fmtMoney(stat.inSum)} tone="in" />
        <Stat label="支出" value={fmtMoney(stat.outSum)} tone="out" />
        <Stat label="结余" value={fmtMoney(stat.balance)} tone={stat.balance >= 0 ? 'in' : 'out'} />
        <Stat label="笔数" value={String(stat.count)} />
      </div>

      {donutData.length > 0 && (
        <Card title={`📊 支出分类（${month || '全部'}）`}>
          <Donut
            labels={donutData.map((d) => d[0])}
            values={donutData.map((d) => Math.round(d[1] * 100) / 100)}
          />
        </Card>
      )}

      <Card title="📋 明细">
        {grouped.length === 0 ? (
          <div className="hint">本月还没有记录，先「记一笔」吧。</div>
        ) : (
          grouped.map(([date, list]) => (
            <div key={date}>
              <div className="book-day">
                {date}（{list.length} 笔）
              </div>
              {list.map((e) => (
                <div className="book-item" key={e.id}>
                  <span className={'type-tag ' + (e.type === '收' ? 'in' : 'out')}>
                    {e.type === '收' ? '收' : '支'}
                  </span>
                  <span className="bi-cat">{e.category}</span>
                  <span className="bi-note">{e.note || '—'}</span>
                  <span className={'amt ' + (e.type === '收' ? 'in' : 'out')}>
                    {e.type === '收' ? '+' : '-'}
                    {fmtMoney(parseFloat(e.amount) || 0)}
                  </span>
                  <button className="btn sm danger" onClick={() => del(e.id)}>
                    删
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
