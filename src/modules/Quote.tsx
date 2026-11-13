import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { PageHead, Card, Field, Stat } from '../components/ui'
import { useStored } from '../lib/useStored'
import { fmtMoney, fmtNum, todayStr, uid, round2, downloadDataUrl } from '../lib/format'
import { toCnMoney } from '../lib/cnMoney'

interface Item {
  id: string
  name: string
  spec: string
  qty: string
  unit: string
  price: string
}

interface QuoteData {
  seller: { name: string; contact: string; phone: string; addr: string }
  customer: { name: string; contact: string; phone: string; addr: string }
  meta: { no: string; date: string; validDays: string }
  taxRate: string
  discount: string
  items: Item[]
  notes: string
}

const emptyData = (): QuoteData => ({
  seller: { name: '', contact: '', phone: '', addr: '' },
  customer: { name: '', contact: '', phone: '', addr: '' },
  meta: { no: `BJ${todayStr().replace(/-/g, '')}-01`, date: todayStr(), validDays: '7' },
  taxRate: '0',
  discount: '0',
  items: [
    { id: uid(), name: '', spec: '', qty: '1', unit: '个', price: '' },
  ],
  notes: '1. 本报价有效期见右上角，逾期价格需重新确认。\n2. 税费、运费另计。\n3. 确认后请签字或回传本单。',
})

const sampleData = (): QuoteData => ({
  seller: { name: '小辣堡 · 香辣鸡腿堡', contact: '王掌柜', phone: '138-0000-0000', addr: '幸福路 88 号一层' },
  customer: { name: '阳光科技园 · 团餐部', contact: '李经理', phone: '139-0000-0000', addr: '' },
  meta: { no: `BJ${todayStr().replace(/-/g, '')}-01`, date: todayStr(), validDays: '7' },
  taxRate: '1',
  discount: '50',
  items: [
    { id: uid(), name: '香辣鸡腿堡套餐', spec: '汉堡+薯条+可乐', qty: '50', unit: '份', price: '19.9' },
    { id: uid(), name: '经典鸡腿堡', spec: '单个装', qty: '30', unit: '个', price: '12' },
    { id: uid(), name: '芝士鸡排堡', spec: '单个装', qty: '20', unit: '个', price: '13.5' },
    { id: uid(), name: '配送费', spec: '园区内统一配送', qty: '1', unit: '次', price: '30' },
  ],
  notes: '1. 本报价有效期见右上角，逾期价格需重新确认。\n2. 税费、运费另计。\n3. 团餐请提前 1 天预订，可提供发票。\n4. 确认后请签字或回传本单。',
})

export default function Quote() {
  const [data, setData] = useStored<QuoteData>('quote.data', emptyData)
  const [tpls, setTpls] = useStored<Array<{ name: string; data: QuoteData }>>('quote.tpl', [])
  const [tplName, setTplName] = useState('')
  const [busy, setBusy] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const set = <K extends keyof QuoteData>(k: K, v: QuoteData[K]) =>
    setData((d) => ({ ...d, [k]: v }))

  const totals = useMemo(() => {
    const subtotal = round2(
      data.items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0),
    )
    const tax = round2((subtotal * (parseFloat(data.taxRate) || 0)) / 100)
    const discount = parseFloat(data.discount) || 0
    return { subtotal, tax, discount, total: round2(subtotal + tax - discount) }
  }, [data])

  const upItem = (id: string, patch: Partial<Item>) =>
    setData((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }))

  const addItem = () =>
    setData((d) => ({
      ...d,
      items: [...d.items, { id: uid(), name: '', spec: '', qty: '1', unit: '个', price: '' }],
    }))

  const delItem = (id: string) =>
    setData((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }))

  const exportPng = async () => {
    if (!sheetRef.current) return
    setBusy(true)
    try {
      const dataUrl = await toPng(sheetRef.current, { pixelRatio: 2, cacheBust: true })
      downloadDataUrl(`报价单-${data.meta.no || '未编号'}.png`, dataUrl)
    } catch (e) {
      alert('导出失败，请重试或改用「打印/PDF」' + (e instanceof Error ? '：' + e.message : ''))
    } finally {
      setBusy(false)
    }
  }

  const saveTpl = () => {
    const name = tplName.trim() || '模板' + (tpls.length + 1)
    setTpls((ts) => {
      const i = ts.findIndex((t) => t.name === name)
      const next = [...ts]
      if (i >= 0) next[i] = { name, data }
      else next.push({ name, data })
      return next
    })
    setTplName('')
  }

  const loadTpl = (name: string) => {
    const t = tpls.find((x) => x.name === name)
    if (t) setData(t.data)
  }

  const delTpl = (name: string) => setTpls((ts) => ts.filter((t) => t.name !== name))

  const newQuote = () => {
    if (window.confirm('新建报价单会清空当前内容，确定吗？（建议先保存模板）')) setData(emptyData())
  }

  const loadSample = () => {
    const hasContent = data.items.some((it) => it.name || it.price)
    if (hasContent && !window.confirm('载入示例会替换当前内容，确定吗？')) return
    setData(sampleData())
  }

  const validTo = useMemo(() => {
    const d = new Date(data.meta.date + 'T00:00:00')
    if (isNaN(d.getTime())) return '-'
    const days = parseInt(data.meta.validDays) || 0
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [data.meta])

  return (
    <div className="page">
      <PageHead title="报价单生成器" desc="填好明细，实时预览，一键导出图片发客户">
        <button className="btn primary" onClick={exportPng} disabled={busy}>
          {busy ? '导出中…' : '📥 导出图片'}
        </button>
        <button className="btn" onClick={() => window.print()}>
          🖨 打印 / PDF
        </button>
        <button className="btn" onClick={loadSample}>
          🎲 载入示例
        </button>
        <button className="btn" onClick={newQuote}>
          ➕ 新建
        </button>
      </PageHead>

      <div className="quote-layout">
        <div className="quote-form">
          <Card title="🏪 店方信息">
            <div className="form-grid">
              <Field label="店名 / 抬头" required>
                <input
                  value={data.seller.name}
                  onChange={(e) => set('seller', { ...data.seller, name: e.target.value })}
                  placeholder="如：小辣堡"
                />
              </Field>
              <Field label="联系人">
                <input
                  value={data.seller.contact}
                  onChange={(e) => set('seller', { ...data.seller, contact: e.target.value })}
                  placeholder="如：王掌柜"
                />
              </Field>
              <Field label="联系电话">
                <input
                  value={data.seller.phone}
                  onChange={(e) => set('seller', { ...data.seller, phone: e.target.value })}
                  placeholder="手机 / 微信"
                />
              </Field>
              <Field label="地址">
                <input
                  value={data.seller.addr}
                  onChange={(e) => set('seller', { ...data.seller, addr: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card title="🧑‍🤝‍🧑 客户信息">
            <div className="form-grid">
              <Field label="客户名称" required>
                <input
                  value={data.customer.name}
                  onChange={(e) => set('customer', { ...data.customer, name: e.target.value })}
                  placeholder="如：XX 公司 / 王先生"
                />
              </Field>
              <Field label="联系人">
                <input
                  value={data.customer.contact}
                  onChange={(e) => set('customer', { ...data.customer, contact: e.target.value })}
                />
              </Field>
              <Field label="电话">
                <input
                  value={data.customer.phone}
                  onChange={(e) => set('customer', { ...data.customer, phone: e.target.value })}
                />
              </Field>
              <Field label="地址">
                <input
                  value={data.customer.addr}
                  onChange={(e) => set('customer', { ...data.customer, addr: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card title="📄 单号与金额设置">
            <div className="form-grid">
              <Field label="报价单编号">
                <input
                  value={data.meta.no}
                  onChange={(e) => set('meta', { ...data.meta, no: e.target.value })}
                />
              </Field>
              <Field label="报价日期">
                <input
                  type="date"
                  value={data.meta.date}
                  onChange={(e) => set('meta', { ...data.meta, date: e.target.value })}
                />
              </Field>
              <Field label="有效期（天）">
                <input
                  type="number"
                  min="0"
                  value={data.meta.validDays}
                  onChange={(e) => set('meta', { ...data.meta, validDays: e.target.value })}
                />
              </Field>
              <Field label="税率（%）">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={data.taxRate}
                  onChange={(e) => set('taxRate', e.target.value)}
                />
              </Field>
              <Field label="优惠金额（元）">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.discount}
                  onChange={(e) => set('discount', e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card
            title="🧾 项目明细"
            actions={
              <button className="btn sm" onClick={addItem}>
                ＋ 加一行
              </button>
            }
          >
            <div className="tb-wrap">
              <table className="tb">
                <thead>
                  <tr>
                    <th style={{ width: 34 }}>#</th>
                    <th>项目名称</th>
                    <th>规格说明</th>
                    <th style={{ width: 70 }}>数量</th>
                    <th style={{ width: 70 }}>单位</th>
                    <th style={{ width: 96 }}>单价(元)</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it, i) => (
                    <tr key={it.id}>
                      <td className="num">{i + 1}</td>
                      <td>
                        <input
                          value={it.name}
                          onChange={(e) => upItem(it.id, { name: e.target.value })}
                          placeholder="如：汉堡套餐"
                        />
                      </td>
                      <td>
                        <input
                          value={it.spec}
                          onChange={(e) => upItem(it.id, { spec: e.target.value })}
                          placeholder="规格 / 说明"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={it.qty}
                          onChange={(e) => upItem(it.id, { qty: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={it.unit}
                          onChange={(e) => upItem(it.id, { unit: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.price}
                          onChange={(e) => upItem(it.id, { price: e.target.value })}
                        />
                      </td>
                      <td>
                        <button className="btn sm danger" onClick={() => delItem(it.id)}>
                          删
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="📝 备注条款">
            <textarea
              value={data.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="付款方式、交货周期、质保等条款，一行一条"
              rows={4}
            />
          </Card>

          <Card title="💾 模板">
            <div className="tpl-row">
              <input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="模板名，如：汉堡店-标准报价"
              />
              <button className="btn sm primary" onClick={saveTpl}>
                保存当前为模板
              </button>
            </div>
            {tpls.length > 0 && (
              <div className="tpl-list">
                {tpls.map((t) => (
                  <span key={t.name} className="tpl-chip">
                    <a href="#/quote" onClick={() => loadTpl(t.name)}>
                      {t.name}
                    </a>
                    <button onClick={() => delTpl(t.name)}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <div className="stats no-print" style={{ marginBottom: 14 }}>
            <Stat label="小计" value={fmtMoney(totals.subtotal)} />
            <Stat label="税额" value={fmtMoney(totals.tax)} />
            <Stat label="优惠" value={fmtMoney(totals.discount)} />
            <Stat label="合计" value={fmtMoney(totals.total)} />
          </div>

          <div className="sheet-scroll">
            <div id="quote-sheet" ref={sheetRef}>
            <div className="qs-top">
              <div className="qs-shop">
                <b>{data.seller.name || '你的店名'}</b>
                <div className="contact">
                  {data.seller.contact && `联系人：${data.seller.contact}`}
                  {data.seller.phone && `\n电话：${data.seller.phone}`}
                  {data.seller.addr && `\n地址：${data.seller.addr}`}
                </div>
              </div>
              <div className="qs-title">
                <b>报价单</b>
                <div className="qs-meta">
                  编号：{data.meta.no || '-'}
                  <br />
                  日期：{data.meta.date || '-'}
                  <br />
                  有效期至：{validTo}
                </div>
              </div>
            </div>

            <div className="qs-parties">
              <div className="qs-party">
                <b>致：{data.customer.name || '客户名称'}</b>
                <p>
                  {data.customer.contact && `联系人：${data.customer.contact}\n`}
                  {data.customer.phone && `电话：${data.customer.phone}\n`}
                  {data.customer.addr && `地址：${data.customer.addr}`}
                </p>
              </div>
              <div className="qs-party">
                <b>报价说明</b>
                <p>以下报价供您参考，如有疑问欢迎随时联系。</p>
              </div>
            </div>

            <table className="qs-table">
              <thead>
                <tr>
                  <th className="c" style={{ width: 40 }}>序号</th>
                  <th>项目名称</th>
                  <th>规格说明</th>
                  <th className="c" style={{ width: 64 }}>数量</th>
                  <th className="c" style={{ width: 48 }}>单位</th>
                  <th className="r" style={{ width: 100 }}>单价</th>
                  <th className="r" style={{ width: 110 }}>金额</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => {
                  const qty = parseFloat(it.qty) || 0
                  const price = parseFloat(it.price) || 0
                  return (
                    <tr key={it.id}>
                      <td className="c">{i + 1}</td>
                      <td>{it.name || '—'}</td>
                      <td>{it.spec || '—'}</td>
                      <td className="c">{fmtNum(qty)}</td>
                      <td className="c">{it.unit || '—'}</td>
                      <td className="r">{fmtMoney(price)}</td>
                      <td className="r">{fmtMoney(qty * price)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="qs-sum">
              <div className="qs-sum-row">
                <span>小计</span>
                <span>{fmtMoney(totals.subtotal)}</span>
              </div>
              {(parseFloat(data.taxRate) || 0) > 0 && (
                <div className="qs-sum-row">
                  <span>税额（{data.taxRate}%）</span>
                  <span>{fmtMoney(totals.tax)}</span>
                </div>
              )}
              {totals.discount > 0 && (
                <div className="qs-sum-row">
                  <span>优惠</span>
                  <span>-{fmtMoney(totals.discount)}</span>
                </div>
              )}
              <div className="qs-sum-row total">
                <span>合计（含税）</span>
                <span>{fmtMoney(totals.total)}</span>
              </div>
            </div>
            <div className="qs-cn">大写：{toCnMoney(totals.total)}</div>

            {data.notes.trim() && <div className="qs-notes">{data.notes}</div>}

            <div className="qs-foot">
              感谢您的信任与支持 · {data.seller.name || '小店'} 敬上
              {data.seller.phone && ` · 电话 ${data.seller.phone}`}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
