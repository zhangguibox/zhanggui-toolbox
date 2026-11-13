const DIGITS = '零壹贰叁肆伍陆柒捌玖'
const UNITS = ['', '拾', '佰', '仟']
const GROUP = ['', '万', '亿', '兆']

function groupToCn(raw: string): string {
  let out = ''
  const n = raw.length
  for (let i = 0; i < n; i++) {
    const d = raw.charCodeAt(i) - 48
    const pos = n - 1 - i
    if (d === 0) {
      if (out && !out.endsWith('零')) out += '零'
    } else {
      out += DIGITS[d] + UNITS[pos]
    }
  }
  return out.replace(/零+$/, '')
}

function intToCn(n: number): string {
  if (n <= 0) return ''
  const s = String(Math.floor(n))
  const groups: string[] = []
  for (let end = s.length; end > 0; end -= 4) {
    groups.unshift(s.slice(Math.max(0, end - 4), end))
  }
  let out = ''
  let skippedZero = false
  for (let i = 0; i < groups.length; i++) {
    const raw = groups[i]
    const val = parseInt(raw, 10)
    const gu = GROUP[groups.length - 1 - i]
    if (val === 0) {
      if (out) skippedZero = true
      continue
    }
    if (out) {
      const prev = groups[i - 1]
      const prevVal = parseInt(prev ?? '0', 10)
      const needZero =
        skippedZero || val < 1000 || (prevVal !== 0 && prev!.endsWith('0'))
      if (needZero) out += '零'
    }
    out += groupToCn(raw) + gu
    skippedZero = false
  }
  return out
}

/** 人民币大写金额，例如 12345.67 -> 壹万贰仟叁佰肆拾伍元陆角柒分 */
export function toCnMoney(n: number): string {
  if (!isFinite(n)) return ''
  const neg = n < 0
  const abs = Math.abs(round2safe(n))
  const int = Math.floor(abs)
  const frac = Math.round((abs - int) * 100)
  const jiao = Math.floor(frac / 10)
  const fen = frac % 10

  const intPart = intToCn(int)
  let tail = ''
  if (jiao === 0 && fen === 0) {
    tail = '整'
  } else {
    if (jiao > 0) tail += DIGITS[jiao] + '角'
    else if (int > 0) tail += '零'
    if (fen > 0) tail += DIGITS[fen] + '分'
  }
  const yuan = intPart
    ? intPart + '元'
    : int === 0 && jiao === 0 && fen === 0
      ? '零元'
      : ''
  return (neg ? '负' : '') + yuan + tail
}

function round2safe(n: number) {
  return Math.round(n * 100) / 100
}
