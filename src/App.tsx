import { useEffect, useState } from 'react'
import Home from './modules/Home'
import Quote from './modules/Quote'
import Ledger from './modules/Ledger'
import Schedule from './modules/Schedule'
import Book from './modules/Book'

export const TABS = [
  { id: 'home', label: '首页', icon: '🏠' },
  { id: 'quote', label: '报价单', icon: '📋' },
  { id: 'ledger', label: '对账', icon: '🧾' },
  { id: 'schedule', label: '排期', icon: '📅' },
  { id: 'book', label: '账本', icon: '💰' },
] as const

export type RouteId = (typeof TABS)[number]['id']

function useHashRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() => {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
    return (TABS.some((t) => t.id === h) ? h : 'home') as RouteId
  })
  useEffect(() => {
    const onHash = () => {
      const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
      setRoute((TABS.some((t) => t.id === h) ? h : 'home') as RouteId)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}

function Logo() {
  return (
    <a className="logo" href="#/home">
      <span className="logo-mark">掌</span>
      <span className="logo-text">
        <b>掌柜工具箱</b>
        <i>小生意好帮手</i>
      </span>
    </a>
  )
}

export default function App() {
  const route = useHashRoute()
  return (
    <div className="app">
      <aside className="sidebar">
        <Logo />
        <nav className="side-nav">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#/${t.id}`}
              className={route === t.id ? 'nav-item on' : 'nav-item'}
            >
              <span className="nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <p>🔒 数据只保存在本机浏览器</p>
          <p>不上传、不注册、打开即用</p>
        </div>
      </aside>
      <main className="main">
        {route === 'home' && <Home />}
        {route === 'quote' && <Quote />}
        {route === 'ledger' && <Ledger />}
        {route === 'schedule' && <Schedule />}
        {route === 'book' && <Book />}
      </main>
      <nav className="bottom-nav">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`#/${t.id}`}
            className={route === t.id ? 'bn-item on' : 'bn-item'}
          >
            <span className="bn-icon">{t.icon}</span>
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
