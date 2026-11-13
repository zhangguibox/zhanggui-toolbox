import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'

Chart.register(...registerables)

export const PALETTE = [
  '#e8590c', '#f59f00', '#37b24d', '#4dabf7', '#845ef7',
  '#f06595', '#15aabf', '#94a3b8', '#ff922b', '#63e6be',
]

interface DonutProps {
  labels: string[]
  values: number[]
  title?: string
}

export function Donut({ labels, values, title }: DonutProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const data: ChartData<'doughnut'> = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: PALETTE,
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    }
    const options: ChartOptions<'doughnut'> = {
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (c) => ` ${c.label}: ¥${Number(c.raw).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`,
          },
        },
      },
    }
    const chart = new Chart(ref.current, { type: 'doughnut', data, options })
    return () => chart.destroy()
  }, [labels, values, title])
  return (
    <div className="chart-box">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-body">
        <canvas ref={ref} />
      </div>
    </div>
  )
}

interface BarProps {
  labels: string[]
  series: Array<{ name: string; values: number[]; color: string }>
  title?: string
}

export function Bar({ labels, series, title }: BarProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const data: ChartData<'bar'> = {
      labels,
      datasets: series.map((s) => ({
        label: s.name,
        data: s.values,
        backgroundColor: s.color,
        borderRadius: 6,
      })),
    }
    const options: ChartOptions<'bar'> = {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (c) => ` ${c.dataset.label}: ¥${Number(c.raw).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`,
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => '¥' + Number(v).toLocaleString('zh-CN') } },
      },
    }
    const chart = new Chart(ref.current, { type: 'bar', data, options })
    return () => chart.destroy()
  }, [labels, series, title])
  return (
    <div className="chart-box">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-body">
        <canvas ref={ref} />
      </div>
    </div>
  )
}
