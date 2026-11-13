const MODULES = [
  {
    id: 'quote',
    icon: '📋',
    title: '报价单生成器',
    desc: '填好项目明细，一键生成专业报价单，导出图片或打印成 PDF 发给客户。',
    tag: '获客谈单',
    storeKey: '',
  },
  {
    id: 'ledger',
    icon: '🧾',
    title: '账单对账助手',
    desc: '粘贴微信/支付宝账单，自动分类汇总，收入支出结余一目了然。',
    tag: '理清账目',
    storeKey: 'zg.ledger.txs',
  },
  {
    id: 'schedule',
    icon: '📅',
    title: '需求排期',
    desc: '把零散的需求整理成任务清单，自动排出一张可执行的工期表。',
    tag: '干活不慌',
    storeKey: 'zg.sched.tasks',
  },
  {
    id: 'book',
    icon: '💰',
    title: '收支账本',
    desc: '随手记一笔，按分类统计月度收支，数据可导出备份。',
    tag: '日常记账',
    storeKey: 'zg.book.entries',
  },
] as const

function readCount(key: string): number {
  if (!key) return 0
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return 0
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.length : 0
  } catch {
    return 0
  }
}

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <h1>
          掌柜工具箱<span className="hero-dot">.</span>
        </h1>
        <p className="hero-sub">报价、对账、排期、记账，一个小站管好小生意。</p>
        <div className="hero-pills">
          <span>🧮 免费使用</span>
          <span>📱 手机电脑都行</span>
          <span>🔒 数据留在本机</span>
        </div>
      </section>

      <div className="module-grid">
        {MODULES.map((m) => {
          const count = readCount(m.storeKey)
          return (
            <a key={m.id} href={`#/${m.id}`} className="module-card">
              <span className="mc-icon">{m.icon}</span>
              <h2>{m.title}</h2>
              <p>{m.desc}</p>
              <span className="mc-foot">
                <span className="mc-tag">{m.tag}</span>
                {count > 0 && <span className="mc-count">已存 {count} 条</span>}
              </span>
            </a>
          )
        })}
      </div>

      <section className="card tips">
        <h2>💡 三步上手</h2>
        <ol>
          <li>
            <b>报价单</b>：填店名、客户和项目明细 → 点「导出图片」发微信。
          </li>
          <li>
            <b>对账</b>：微信/支付宝里导出账单 CSV → 粘贴或上传到这里 → 自动分类汇总。
          </li>
          <li>
            <b>排期</b>与<b>账本</b>：数据自动保存在本机，关掉页面也不会丢。
          </li>
        </ol>
      </section>

      <section className="card privacy">
        <h2>🔐 隐私说明</h2>
        <p>
          所有数据只保存在您当前浏览器的本地存储中，不会上传到任何服务器。
          换浏览器或清除浏览器数据会丢失记录，重要数据请用各模块的「导出」功能备份。
        </p>
      </section>
    </div>
  )
}
