export interface Tx {
  id: string
  time: string // yyyy-mm-dd hh:mm:ss
  type: '收' | '支'
  counterparty: string
  product: string
  method: string
  status: string
  amount: number
  category: string
}

const EXPENSE_RULES: Array<{ cat: string; kw: string[] }> = [
  { cat: '餐饮', kw: ['美团', '饿了么', '麦当劳', '肯德基', '汉堡', '咖啡', '奶茶', '餐厅', '饭店', '小吃', '面馆', '烧烤', '火锅', '外卖', '瑞幸', '星巴克', '早餐', '午餐', '晚餐', '食堂', '披萨', '蛋糕', '甜品'] },
  { cat: '交通出行', kw: ['滴滴', '出行', '打车', '出租', '高铁', '火车', '地铁', '公交', '加油', '中石化', '中石油', '停车', '充电', '航空', '机票', '骑行', '共享单车', '过路费'] },
  { cat: '进货采购', kw: ['批发', '食材', '进货', '供应链', '供应商', '农贸', '冻品', '生鲜', '粮油', '调味', '包装', '纸箱', '餐盒', '耗材', '原料'] },
  { cat: '购物消费', kw: ['淘宝', '天猫', '京东', '拼多多', '超市', '便利店', '商场', '百货', '服饰', '鞋', '旗舰店', '文具', '五金', '建材', '家具'] },
  { cat: '居住生活', kw: ['水费', '电费', '燃气', '物业', '房租', '宽带', '话费', '移动', '联通', '电信', '缴费', '家政', '维修', '快递', '顺丰', '中通', '圆通', '韵达', '租金'] },
  { cat: '医疗健康', kw: ['医院', '药房', '药店', '诊所', '体检', '挂号', '医药'] },
  { cat: '教育培训', kw: ['书店', '培训', '学费', '课程', '教材', '考试', '报名费'] },
  { cat: '休闲娱乐', kw: ['电影', 'KTV', '游戏', '视频会员', '腾讯视频', '爱奇艺', '优酷', '网易云', '音乐', '健身', '旅游', '酒店', '景区', '门票'] },
  { cat: '金融保险', kw: ['银行', '转账', '理财', '基金', '股票', '保险', '还款', '信用卡', '利息', '手续费'] },
  { cat: '员工工资', kw: ['工资', '薪资', '奖金', '薪酬', '兼职'] },
  { cat: '广告营销', kw: ['广告', '推广', '投放', '抖音', '快手', '小红书', '公众号'] },
]

const INCOME_RULES: Array<{ cat: string; kw: string[] }> = [
  { cat: '平台结算', kw: ['美团', '饿了么', '抖音', '平台', '结算', '来单'] },
  { cat: '门店收款', kw: ['收款', '扫码', '付款', '转账', '红包'] },
  { cat: '其他收入', kw: ['利息', '退款', '理赔', '报销'] },
]

export function categorize(type: '收' | '支', text: string): string {
  const rules = type === '收' ? INCOME_RULES : EXPENSE_RULES
  const t = text || ''
  for (const r of rules) {
    if (r.kw.some((k) => t.includes(k))) return r.cat
  }
  return type === '收' ? '其他收入' : '其他支出'
}

/** 解析 CSV/TSV 文本 */
export function parseCSV(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, '')
  const delim = s.indexOf(',') === -1 && s.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else inQ = false
      } else field += c
    } else if (c === '"') inQ = true
    else if (c === delim) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c === '\r') {
      /* skip */
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** 解析微信/支付宝账单 CSV，返回交易列表；格式不对时抛错 */
export function parseBill(text: string): { txs: Tx[]; source: string } {
  const rows = parseCSV(text)
  if (rows.length < 2) throw new Error('内容为空，请粘贴或上传账单 CSV 文件')

  let hIdx = rows.findIndex((r) => r.join('').includes('交易时间'))
  if (hIdx < 0) hIdx = rows.findIndex((r) => r.join('').includes('时间') && r.join('').includes('金额'))
  if (hIdx < 0) throw new Error('没找到表头，请粘贴从微信/支付宝导出的完整账单 CSV（含表头行）')

  const header = rows[hIdx].map((c) => c.trim())
  const find = (...names: string[]) => {
    for (const n of names) {
      const i = header.findIndex((c) => c.includes(n))
      if (i >= 0) return i
    }
    return -1
  }
  const ci = {
    time: find('交易时间'),
    type: find('收/支'),
    txType: find('交易类型'),
    counterparty: find('交易对方'),
    product: find('商品'),
    method: find('支付方式', '收/付款方式'),
    status: find('状态'),
    amount: find('金额'),
  }
  if (ci.time < 0 || ci.amount < 0)
    throw new Error('缺少「交易时间」或「金额」列，请确认是微信/支付宝的账单导出文件')

  const source = header.join('').includes('微信') || header.join('').includes('单号')
    ? '微信账单'
    : header.join('').includes('支付宝') || header.join('').includes('订单号')
      ? '支付宝账单'
      : '账单文件'

  const txs: Tx[] = []
  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    const time = (r[ci.time] || '').trim()
    if (!time || time.startsWith('---') || time.startsWith('共')) continue
    const amtStr = (r[ci.amount] || '').replace(/[¥￥,\s]/g, '')
    const amount = parseFloat(amtStr)
    if (!isFinite(amount) || amount === 0) continue
    const rawType = (r[ci.type] || '').trim()
    const txType = ci.txType >= 0 ? (r[ci.txType] || '').trim() : ''
    const type: Tx['type'] = rawType.includes('支出')
      ? '支'
      : rawType.includes('收入')
        ? '收'
        : txType.includes('消费') || txType.includes('支付') || txType.includes('购买')
          ? '支'
          : txType.includes('收款') || txType.includes('转入') || txType.includes('结算') || txType.includes('退款')
            ? '收'
            : '支'
    const counterparty = (r[ci.counterparty] || '').trim() || '/'
    const product = ci.product >= 0 ? (r[ci.product] || '').trim() : ''
    const text = counterparty + product
    txs.push({
      id: `${i}-${time}-${amtStr}`,
      time: time.replace(/\//g, '-'),
      type,
      counterparty,
      product,
      method: ci.method >= 0 ? (r[ci.method] || '').trim() : '',
      status: ci.status >= 0 ? (r[ci.status] || '').trim() : '',
      amount: Math.abs(amount),
      category: categorize(type, text),
    })
  }
  if (txs.length === 0) throw new Error('没有解析出任何交易记录，请检查账单内容')
  return { txs, source }
}

export function summarizeByMonth(txs: Tx[]) {
  const map = new Map<string, { month: string; in: number; out: number }>()
  for (const t of txs) {
    const month = t.time.slice(0, 7)
    if (!map.has(month)) map.set(month, { month, in: 0, out: 0 })
    const m = map.get(month)!
    if (t.type === '收') m.in += t.amount
    else m.out += t.amount
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export function summarizeByCat(txs: Tx[], month: string, type: '收' | '支') {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== type) continue
    if (month && t.time.slice(0, 7) !== month) continue
    map.set(t.category, (map.get(t.category) || 0) + t.amount)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

export function txToCSV(txs: Tx[]): string {
  const head = '时间,收/支,分类,交易对方,商品,金额(元),支付方式'
  const lines = txs.map((t) =>
    [t.time, t.type === '收' ? '收入' : '支出', t.category, t.counterparty, t.product, t.amount.toFixed(2), t.method]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  )
  return '\uFEFF' + [head, ...lines].join('\r\n')
}

export const SAMPLE_TXS: Tx[] = [
  { id: 's1', time: '2026-10-05 10:21:00', type: '支', counterparty: '张房东', product: '10月房租', method: '零钱', status: '支付成功', amount: 4500, category: '居住生活' },
  { id: 's2', time: '2026-10-06 08:12:00', type: '支', counterparty: '城南农贸批发市场', product: '鸡腿肉/生菜/面包胚', method: '零钱', status: '支付成功', amount: 2380.5, category: '进货采购' },
  { id: 's3', time: '2026-10-08 15:00:00', type: '收', counterparty: '美团平台', product: '外卖订单结算', method: '零钱', status: '已入账', amount: 3256.4, category: '平台结算' },
  { id: 's4', time: '2026-10-09 13:47:00', type: '收', counterparty: '微信收款', product: '门店扫码收款', method: '零钱', status: '已入账', amount: 1180, category: '门店收款' },
  { id: 's5', time: '2026-10-10 09:30:00', type: '支', counterparty: '国家电网', product: '9月电费', method: '零钱通', status: '支付成功', amount: 862.3, category: '居住生活' },
  { id: 's6', time: '2026-10-12 11:05:00', type: '支', counterparty: '包装材料批发', product: '汉堡纸盒/打包袋', method: '零钱', status: '支付成功', amount: 356, category: '进货采购' },
  { id: 's7', time: '2026-10-15 18:22:00', type: '收', counterparty: '美团平台', product: '外卖订单结算', method: '零钱', status: '已入账', amount: 4120.8, category: '平台结算' },
  { id: 's8', time: '2026-10-16 14:40:00', type: '支', counterparty: '小辣堡兼职员工', product: '10月上半月工资', method: '零钱', status: '支付成功', amount: 1600, category: '员工工资' },
  { id: 's9', time: '2026-10-18 10:00:00', type: '支', counterparty: '抖音广告', product: '本地推广投放', method: '零钱', status: '支付成功', amount: 500, category: '广告营销' },
  { id: 's10', time: '2026-10-20 12:15:00', type: '支', counterparty: '燃气公司', product: '燃气费', method: '零钱通', status: '支付成功', amount: 415.2, category: '居住生活' },
  { id: 's11', time: '2026-10-22 19:30:00', type: '收', counterparty: '美团平台', product: '外卖订单结算', method: '零钱', status: '已入账', amount: 4568.2, category: '平台结算' },
  { id: 's12', time: '2026-10-25 09:12:00', type: '支', counterparty: '城南农贸批发市场', product: '鸡腿肉/酱料补货', method: '零钱', status: '支付成功', amount: 3120, category: '进货采购' },
  { id: 's13', time: '2026-10-28 16:45:00', type: '收', counterparty: '微信收款', product: '门店扫码收款', method: '零钱', status: '已入账', amount: 980, category: '门店收款' },
  { id: 's14', time: '2026-11-01 10:20:00', type: '支', counterparty: '张房东', product: '11月房租', method: '零钱', status: '支付成功', amount: 4500, category: '居住生活' },
  { id: 's15', time: '2026-11-03 08:30:00', type: '支', counterparty: '城南农贸批发市场', product: '鸡腿肉/面包胚', method: '零钱', status: '支付成功', amount: 2650, category: '进货采购' },
  { id: 's16', time: '2026-11-05 15:00:00', type: '收', counterparty: '美团平台', product: '外卖订单结算', method: '零钱', status: '已入账', amount: 3860.5, category: '平台结算' },
  { id: 's17', time: '2026-11-06 13:20:00', type: '收', counterparty: '微信收款', product: '门店扫码收款', method: '零钱', status: '已入账', amount: 1260, category: '门店收款' },
  { id: 's18', time: '2026-11-08 10:10:00', type: '支', counterparty: '国家电网', product: '10月电费', method: '零钱通', status: '支付成功', amount: 905.6, category: '居住生活' },
  { id: 's19', time: '2026-11-10 14:00:00', type: '支', counterparty: '美团推广', product: '外卖流量推广', method: '零钱', status: '支付成功', amount: 400, category: '广告营销' },
  { id: 's20', time: '2026-11-12 18:40:00', type: '收', counterparty: '美团平台', product: '外卖订单结算', method: '零钱', status: '已入账', amount: 4352.1, category: '平台结算' },
]
