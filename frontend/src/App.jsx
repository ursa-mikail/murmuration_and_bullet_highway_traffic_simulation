import { useEffect, useRef, useState } from 'react'
import { Flock, Traffic, buildLayout } from './sim.js'

const FB = [
  { slug: 'halo', name: 'The Halo', kind: 'loop', params: { k: 6, R: 330 } },
  { slug: 'spine', name: 'The Spine', kind: 'spine', params: { k: 5, L: 1800 } },
]
export default function App() {
  const cv = useRef(), eng = useRef(null)
  const [mode, setMode] = useState('flock'), [layouts, setLayouts] = useState(FB), [slug, setSlug] = useState('halo')
  const [sp, setSp] = useState(50), [dem, setDem] = useState(.35), [paused, setPaused] = useState(false)
  const [st, setSt] = useState({}), [top, setTop] = useState([]), [msg, setMsg] = useState('')
  const speed = .1 * Math.pow(80, sp / 100), ref = useRef()
  ref.current = { speed, paused }
  const nFor = d => Math.round(400 + d * 2400)

  useEffect(() => { fetch('/api/layouts').then(r => r.json()).then(l => l.length && setLayouts(l)).catch(() => {}) }, [])
  useEffect(() => {
    if (mode === 'flock') eng.current = new Flock(innerWidth, innerHeight, nFor(dem))
    else eng.current = new Traffic(buildLayout(layouts.find(x => x.slug === slug) || layouts[0]), dem)
    if (mode === 'freeway') loadTop()
  }, [mode, slug, layouts])
  useEffect(() => { const e = eng.current; if (e) mode === 'flock' ? e.setN(nFor(dem)) : (e.demand = dem) }, [dem])
  const loadTop = () => fetch('/api/runs?layout=' + slug).then(r => r.json()).then(setTop).catch(() => {})

  useEffect(() => {
    const c = cv.current, x = c.getContext('2d'); let W, H, raf, last = performance.now()
    const rs = () => { const d = devicePixelRatio || 1; W = innerWidth; H = innerHeight; c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0); eng.current?.resize?.(W, H) }
    rs(); addEventListener('resize', rs)
    const mm = e => { if (eng.current instanceof Flock) eng.current.mouse = [e.clientX, e.clientY, e.buttons > 0] }
    c.addEventListener('pointermove', mm); c.addEventListener('pointerdown', mm); c.addEventListener('pointerup', mm)
    c.addEventListener('pointerleave', () => { if (eng.current) eng.current.mouse = null })
    const key = e => { if (e.code === 'Space') { e.preventDefault(); setPaused(p => !p) } if (e.key === 'ArrowUp') setSp(s => Math.min(100, s + 5)); if (e.key === 'ArrowDown') setSp(s => Math.max(0, s - 5)) }
    addEventListener('keydown', key)
    const loop = t => {
      const e = eng.current, dt = Math.min(.05, (t - last) / 1000); last = t
      if (e) { const { speed, paused } = ref.current; if (!paused) { const sd = dt * speed, n = Math.max(1, Math.ceil(sd / (1 / 30))); for (let i = 0; i < n; i++) e.step(sd / n) } e.draw(x, W, H) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const iv = setInterval(() => eng.current && setSt(eng.current.stats()), 250)
    return () => { cancelAnimationFrame(raf); clearInterval(iv); removeEventListener('resize', rs); removeEventListener('keydown', key) }
  }, [])

  const submit = async () => {
    const s = eng.current.stats()
    await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layout: slug, score: s.cleared, avgSpeed: s.avg }) }).catch(() => {})
    setMsg('Run saved ✓'); setTimeout(() => setMsg(''), 1800); loadTop()
  }
  const f = (v, d = 0) => (v ?? 0).toFixed(d)
  const cards = mode === 'flock'
    ? [['Birds', st.birds], ['Order Φ', f(st.phi, 3)], ['Speed', f(st.spd)]]
    : [['Vehicles', st.veh], ['Avg km/h', f(st.kmh)], ['Flow /min', f(st.rate)], ['Cleared', st.cleared], ['Collisions', 0], ['Hard brakes', st.hard]]
  return <>
    <canvas ref={cv} />
    <div className="panel">
      <h1>MURMUR</h1><p className="sub">{mode === 'flock' ? 'Drag to unleash the falcon.' : 'Red flows. Green merges. Zero collisions.'}</p>
      <div className="tabs">{[['flock', 'Murmuration'], ['freeway', 'Freeway']].map(([m, n]) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{n}</button>)}</div>
      {mode === 'freeway' && <div className="chips">{layouts.map(l => <button key={l.slug} className={slug === l.slug ? 'on' : ''} onClick={() => setSlug(l.slug)}>{l.name}</button>)}</div>}
      <label>Speed <b>×{speed.toFixed(speed < 1 ? 2 : 1)}</b><input type="range" min="0" max="100" value={sp} onChange={e => setSp(+e.target.value)} /></label>
      <label>{mode === 'flock' ? 'Flock size' : 'Demand'} <b>{mode === 'flock' ? nFor(dem) : Math.round(dem * 100) + '%'}</b><input type="range" min="0" max="1" step=".01" value={dem} onChange={e => setDem(+e.target.value)} /></label>
      <div className="row"><button onClick={() => setPaused(!paused)}>{paused ? '▶ Play' : '❚❚ Pause'}</button>{mode === 'freeway' && <><button onClick={() => eng.current.reset()}>↺ Reset</button><button className="hot" onClick={submit}>⚑ Submit</button></>}</div>
      <small>space = pause · ↑↓ = speed {msg && <em>{msg}</em>}</small>
    </div>
    <div className="hud">{cards.map(([k, v]) => <div key={k} className={k === 'Collisions' ? 'ok' : ''}><b>{v ?? 0}</b><span>{k}</span></div>)}</div>
    {mode === 'freeway' && <div className="board"><h3>Top runs · {slug}</h3>{top.length ? top.map((r, i) => <div key={i}><span>#{i + 1}</span><b>{r.score}</b><i>{f(r.avgSpeed)} km/h</i></div>) : <i>No runs yet — be first.</i>}</div>}
  </>
}
