export const fmtMoney = (n: number, digit = 2) =>
  '¥' +
  n.toLocaleString('zh-CN', {
    minimumFractionDigits: digit,
    maximumFractionDigits: digit,
  })

export const fmtNum = (n: number) => n.toLocaleString('zh-CN')

export const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`

export const todayStr = () => fmtDate(new Date())

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export const round2 = (n: number) => Math.round(n * 100) / 100

export function downloadText(name: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

export function downloadDataUrl(name: string, dataUrl: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** 增加 n 个工作日 */
export function addBusinessDays(start: Date, n: number, skipWeekend: boolean): Date {
  const d = new Date(start)
  let added = 0
  while (added < n) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (skipWeekend && (dow === 0 || dow === 6)) continue
    added++
  }
  return d
}
