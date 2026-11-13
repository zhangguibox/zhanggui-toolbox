import { useMemo, useRef, useState } from 'react'
import { PageHead, Card, Stat } from '../components/ui'
import { Donut, Bar } from '../components/Chart'
import { useStored } from '../lib/useStored'
import { fmtMoney, downloadText } from '../lib/format'
import {
  Tx,
  parseBill,
  summarizeByMonth,
  summarizeByCat,
  txToCSV,
  SAMPLE_TXS,
} from '../lib/parsers'

type TypeF = '全部' | '收' | '支'

export default function Ledger() {
  const [txs, setTxs] = useStored<Tx[]>('ledger.txs', [])
  const [source, setSource] = useStored<string>('ledger.source', '')
  const [paste, setPaste] = useState('')
  const [month, setMonth] = useState('')
  const [typeF, setTypeF] = useState<TypeF>('全部')
  const [catF, setCatF] = useState('')
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const months = useMemo(
    () => [...new Set(txs.map((t) => t.time.slice(0, 7)))].sort().reverse(),
    [txs],
  )
  const cats = useMemo(() => [...new Set(txs.map((t) => t.category))], [txs])

  const filtered = useMemo(
    () =>
      txs
        .filter(
          (t) =>
            (month === '' || t.time.slice(0, 7) === month) &&
            (typeF === '全部' || t.type === typeF) &&
            (catF === '' || t.category === catF),
        )
        .slice()
        .sort((a, b) => b.time.localeCompare(a.time)),
    [txs, month, typeF, catF],
  )

  const stat = useMemo(() => {
    let inSum = 0
    let outSum = 0
    for (const t of filtered) {
      if (t.type === '收') inSum += t.amount
      else outSum += t.amount
    }
    return { inSum, outSum, balance: inSum - outSum, count: filtered.length }
  }, [filtered])

  const monthRows = useMemo(() => summarizeByMonth(txs), [txs])
  const donutMonth = month || months[0] || ''
  const donutData = useMemo(() => summarizeByCat(txs, donutMonth, '支'), [txs, donutMonth])

  const doImport = (text: string) => {
    try {
      const { txs: parsed, source: src } = parseBill(text)
      if (txs.length > 0 && !window.confirm(`当前已有 ${txs.length} 条记录，导入将替换它们，继续吗？`)) return
      setTxs(parsed)
      setSource(src)
      setErr('')
      setPaste('')
      setMonth('')
      setTypeF('全部')
      setCatF('')
      if (fileRef.current) fileRef.current.value = ''
      alert(`解析成功：${parsed.length} 笔交易（${src}）`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '解析失败')
    }
  }

  const loadSample = () => {
    if (txs.length > 0 && !window.confirm('载入示例数据会替换当前记录，继续吗？')) return
    setTxs(structuredClone(SAMPLE_TXS))
    setSource('示例数据 · 小辣堡 2026年10-11月')
    setErr('')
    alert('已载入示例数据，可随意修改、筛选和导出。')
  }

  const clearAll = () => {
    if (window.confirm('确定清空全部对账数据吗？此操作不可恢复。')) {
      setTxs([])
      setSource('')
    }
  }

  const exportCsv = () => {
    if (filtered.length === 0) return alert('当前没有可导出的记录')
    downloadText(`对账-${month || '全部月份'}.csv`, txToCSV(filtered), 'text/csv')
  }

  const editCat = (id: string, cat: string) =>
    setTxs((ts) => ts.map((t) => (t.id === id ? { ...t, category: cat } : t)))

  const delRow = (id: string) => setTxs((ts) => ts.filter((t) => t.id !== id))

  return (
    <div className="page">
      <PageHead title="账单对账助手" desc="微信/支付宝账单粘贴即解析，自动分类汇总">
        <button className="btn primary" onClick={exportCsv}>
          📥 导出汇总
        </button>
      </PageHead>

      <Card title="📥 导入账单">
        <div className="hint">
          微信导出：我 → 服务 → 钱包 → 账单 → 常见问题 → 下载账单（用于个人对账）；支付宝：我的 →
          账单 → 开具交易流水证明。拿到 CSV 文件后上传，或直接把 CSV 内容整段粘贴到下面。
        </div>
        <div className="tb-wrap" style={{ marginTop: 10 }}>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'粘贴账单 CSV 内容（第一行含「交易时间」表头），例如：\n交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态…'}
            rows={5}
          />
        </div>
        <div className="tools" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => doImport(paste)}>
            ⚡ 解析导入
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            📂 选择 CSV 文件
          </button>
          <button className="btn" onClick={loadSample}>
            🎲 载入示例数据
          </button>
          {txs.length > 0 && (
            <button className="btn danger" onClick={clearAll}>
              清空数据
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              f.text().then((t) => doImport(t))
            }}
          />
        </div>
        {err && <div className="callout bad">⚠️ {err}</div>}
        {source && !err && (
          <div className="callout good">
            当前数据：{source}（{txs.length} 笔）
          </div>
        )}
      </Card>

      <Card title="🔍 筛选">
        <div className="form-grid">
          <label className="field">
            <span>月份</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">全部月份</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>收支</span>
            <select value={typeF} onChange={(e) => setTypeF(e.target.value as TypeF)}>
              <option value="全部">全部</option>
              <option value="收">只看收入</option>
              <option value="支">只看支出</option>
            </select>
          </label>
          <label className="field">
            <span>分类</span>
            <select value={catF} onChange={(e) => setCatF(e.target.value)}>
              <option value="">全部分类</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {txs.length > 0 && (
        <>
          <div className="stats">
            <Stat label="收入合计" value={fmtMoney(stat.inSum)} tone="in" />
            <Stat label="支出合计" value={fmtMoney(stat.outSum)} tone="out" />
            <Stat label="结余" value={fmtMoney(stat.balance)} tone={stat.balance >= 0 ? 'in' : 'out'} />
            <Stat label="交易笔数" value={String(stat.count)} />
          </div>

          <Card title="📊 月度收支趋势">
            <Bar
              labels={monthRows.map((m) => m.month)}
              series={[
                { name: '收入', values: monthRows.map((m) => m.in), color: '#37b24d' },
                { name: '支出', values: monthRows.map((m) => m.out), color: '#e8590c' },
              ]}
            />
          </Card>

          {donutData.length > 0 && (
            <Card title={`📊 支出分类占比（${donutMonth || '全部'}）`}>
              <Donut
                labels={donutData.map((d) => d[0])}
                values={donutData.map((d) => Math.round(d[1] * 100) / 100)}
              />
              <div className="hint" style={{ marginTop: 8 }}>
                分类由关键词自动匹配（如「美团」→ 平台结算、「批发市场」→ 进货采购），可逐笔在下方修改。
              </div>
            </Card>
          )}

          <Card title="📋 明细（可在表内改分类）">
            <div className="tb-wrap">
              <table className="tb">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>收/支</th>
                    <th>分类</th>
                    <th>交易对方</th>
                    <th>商品</th>
                    <th style={{ textAlign: 'right' }}>金额</th>
                    <th>方式</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 300).map((t) => (
                    <tr key={t.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{t.time.slice(0, 16)}</td>
                      <td>
                        <span className={'type-tag ' + (t.type === '收' ? 'in' : 'out')}>
                          {t.type === '收' ? '收入' : '支出'}
                        </span>
                      </td>
                      <td style={{ minWidth: 110 }}>
                        <select value={t.category} onChange={(e) => editCat(t.id, e.target.value)}>
                          {[...new Set([...cats, t.category])].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{t.counterparty}</td>
                      <td>{t.product}</td>
                      <td className="num" style={{ color: t.type === '收' ? '#2f9e44' : '#e03131' }}>
                        {t.type === '收' ? '+' : '-'}
                        {fmtMoney(t.amount)}
                      </td>
                      <td>{t.method}</td>
                      <td>
                        <button className="btn sm danger" onClick={() => delRow(t.id)}>
                          删
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 300 && (
                <div className="hint" style={{ marginTop: 8 }}>
                  仅显示前 300 条，导出会包含全部 {filtered.length} 条。
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {txs.length === 0 && (
        <Card title="还没有数据">
          <div className="hint">
            点上面的「🎲 载入示例数据」先体验一把，或导入你自己的微信/支付宝账单 CSV。所有解析都在本机浏览器完成，账单内容不会上传。
          </div>
        </Card>
      )}
    </div>
  )
}
