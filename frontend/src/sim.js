const R = Math.random
export const P = { A: 3, B: 4, EB: 9, T: 0.8, G0: 2, LEN: 4.5, Z: 450 }

/* ================= MURMURATION ================= */
export class Flock {
  constructor(w, h, n) { this.w = w; this.h = h; this.t = 0; this.mouse = null; this.n = 0; this.setN(n) }
  resize(w, h) { this.w = w; this.h = h }
  setN(n) {
    const o = this, f = (a) => { const b = new Float32Array(n); if (a) b.set(a.subarray(0, Math.min(n, a.length))); return b }
    const x = f(o.x), y = f(o.y), vx = f(o.vx), vy = f(o.vy)
    for (let i = o.n; i < n; i++) {
      const j = o.n ? (R() * o.n) | 0 : -1, a = R() * 6.28
      x[i] = j >= 0 ? o.x[j] + R() * 10 : o.w / 2 + (R() - .5) * 300; y[i] = j >= 0 ? o.y[j] + R() * 10 : o.h / 2 + (R() - .5) * 200
      vx[i] = Math.cos(a) * 120; vy[i] = Math.sin(a) * 120
    }
    Object.assign(o, { x, y, vx, vy, fx: new Float32Array(n), fy: new Float32Array(n), bk: new Uint8Array(n), n })
  }
  step(dt) {
    const { n, x, y, vx, vy, fx, fy, w, h } = this, C = 48, cols = Math.ceil(w / C) + 2, rows = Math.ceil(h / C) + 2
    const head = new Int32Array(cols * rows).fill(-1), nx = new Int32Array(n); this.t += dt
    const cell = (i) => Math.min(rows - 1, Math.max(0, (y[i] / C) | 0)) * cols + Math.min(cols - 1, Math.max(0, (x[i] / C) | 0))
    for (let i = 0; i < n; i++) { const c = cell(i); nx[i] = head[c]; head[c] = i }
    const rx = w / 2 + Math.cos(this.t * .23) * w * .28, ry = h / 2 + Math.sin(this.t * .37) * h * .22, m_ = this.mouse
    for (let i = 0; i < n; i++) {
      let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, m = 0
      const gx = Math.min(cols - 1, Math.max(0, (x[i] / C) | 0)), gy = Math.min(rows - 1, Math.max(0, (y[i] / C) | 0))
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
        const X = gx + a, Y = gy + b; if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue
        for (let j = head[Y * cols + X]; j >= 0 && m < 14; j = nx[j]) {
          if (j === i) continue
          const dx = x[j] - x[i], dy = y[j] - y[i], d2 = dx * dx + dy * dy
          if (d2 < 3600) { m++; ax += vx[j]; ay += vy[j]; cx += dx; cy += dy; if (d2 < 256) { const d = Math.sqrt(d2) + .01, f = (1 - d / 16) / d; sx -= dx * f; sy -= dy * f } }
        }
      }
      let Fx = sx * 260, Fy = sy * 260
      if (m) { Fx += (ax / m - vx[i]) * 1.9 + cx / m * .9; Fy += (ay / m - vy[i]) * 1.9 + cy / m * .9 }
      const dr = Math.hypot(rx - x[i], ry - y[i]) + 1; Fx += (rx - x[i]) / dr * 45; Fy += (ry - y[i]) / dr * 45
      if (m_) { const dx = x[i] - m_[0], dy = y[i] - m_[1], d = Math.hypot(dx, dy); if (d < 170) { const k = (1 - d / 170) * (m_[2] ? 1400 : 500) / (d + 1); Fx += dx * k; Fy += dy * k } }
      if (x[i] < 90) Fx += (90 - x[i]) * 3; if (x[i] > w - 90) Fx -= (x[i] - w + 90) * 3
      if (y[i] < 90) Fy += (90 - y[i]) * 3; if (y[i] > h - 90) Fy -= (y[i] - h + 90) * 3
      fx[i] = Fx; fy[i] = Fy
    }
    for (let i = 0; i < n; i++) {
      vx[i] += fx[i] * dt; vy[i] += fy[i] * dt
      const s = Math.hypot(vx[i], vy[i]) || 1, c = Math.min(175, Math.max(85, s)) / s; vx[i] *= c; vy[i] *= c
      x[i] += vx[i] * dt; y[i] += vy[i] * dt; this.bk[i] = Math.min(5, (((Math.atan2(vy[i], vx[i]) + Math.PI) / 6.2832) * 6) | 0)
    }
  }
  draw(c, W, H) {
    c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(4,5,14,.17)'; c.fillRect(0, 0, W, H)
    c.globalCompositeOperation = 'lighter'; c.lineWidth = 1.7; c.lineCap = 'round'
    for (let b = 0; b < 6; b++) {
      c.strokeStyle = `hsla(${185 + b * 30},90%,62%,.55)`; c.beginPath()
      for (let i = 0; i < this.n; i++) if (this.bk[i] === b) { c.moveTo(this.x[i], this.y[i]); c.lineTo(this.x[i] - this.vx[i] * .05, this.y[i] - this.vy[i] * .05) }
      c.stroke()
    }
    if (this.mouse) { c.strokeStyle = 'rgba(255,60,90,.7)'; c.beginPath(); c.arc(this.mouse[0], this.mouse[1], this.mouse[2] ? 14 : 6, 0, 6.3); c.stroke() }
  }
  stats() {
    let a = 0, b = 0, s = 0; for (let i = 0; i < this.n; i++) { a += this.vx[i]; b += this.vy[i]; s += Math.hypot(this.vx[i], this.vy[i]) }
    return { birds: this.n, phi: Math.hypot(a, b) / s, spd: s / this.n }
  }
}

/* ================= FREEWAY ================= */
const bez = (a, b, c, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]] })

export function buildLayout({ kind, params: p }) {
  const lanes = []
  const add = (o) => { const L = { vs: [], next: [], preds: [], w: 0, acc: 0, vmax: 60, ...o }; lanes.push(L); return L }
  const track = (f, closed, k, pfx) => {
    const Pt = (u) => f(closed ? ((u % 1) + 1) % 1 : Math.min(1, Math.max(0, u)))
    const Tn = (u) => { const a = Pt(u - .002), b = Pt(u + .002), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l] }
    let len = 0, q = Pt(0); for (let i = 1; i <= 200; i++) { const r = Pt(i / 200); len += Math.hypot(r[0] - q[0], r[1] - q[1]); q = r }
    const dl = 48 / len, B = []
    if (!closed) B.push({ u: 0, t: 'S' })
    for (let j = 0; j < k; j++) { const u = closed ? (j + .5) / k : (j + 1) / (k + 1); B.push({ u: u - dl, t: 'D' }, { u: u + dl, t: 'M' }) }
    B.push(closed ? { u: B[0].u + 1, t: 'D' } : { u: 1, t: 'E' })
    const segs = []
    for (let i = 0; i < B.length - 1; i++) {
      const a = B[i].u, b = B[i + 1].u, n = Math.max(3, Math.ceil((b - a) * len / 10)), pts = []
      for (let s = 0; s <= n; s++) pts.push(Pt(a + (b - a) * s / n))
      segs.push(add({ id: pfx + i, pts, kind: 'main', w: !closed && i === 0 ? 1 : 0 }))
    }
    segs.forEach((L, i) => {
      const s = B[i], e = B[i + 1], nxt = closed ? segs[(i + 1) % segs.length] : segs[i + 1]
      if (nxt) L.next.push([nxt, 1])
      if (e.t === 'D') {
        const [x, y] = Pt(e.u), t = Tn(e.u), n = [t[1], -t[0]]
        const X = add({ kind: 'exit', vmax: 45, pts: bez([x, y], [x + t[0] * 60, y + t[1] * 60], [x + t[0] * 150 + n[0] * 80, y + t[1] * 150 + n[1] * 80]) })
        L.next[0][1] = .68; L.next.push([X, .32])
      }
      if (s.t === 'M') {
        const [x, y] = Pt(s.u), t = Tn(s.u), n = [-t[1], t[0]]
        add({ kind: 'entry', vmax: 45, w: .3, next: [[L, 1]], pts: bez([x - t[0] * 170 + n[0] * 80, y - t[1] * 170 + n[1] * 80], [x - t[0] * 70, y - t[1] * 70], [x, y]) })
      }
    })
  }
  if (kind === 'loop') track(u => [p.R * Math.cos(6.2832 * u), p.R * Math.sin(6.2832 * u)], true, p.k, 'a')
  else { const g = 26; track(u => [-p.L / 2 + u * p.L, -g], false, p.k, 'e'); track(u => [p.L / 2 - u * p.L, g], false, p.k, 'w') }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
  for (const L of lanes) {
    L.next.forEach(([n]) => n.preds.push(L)); L.cum = [0]
    for (let i = 1; i < L.pts.length; i++) L.cum.push(L.cum[i - 1] + Math.hypot(L.pts[i][0] - L.pts[i - 1][0], L.pts[i][1] - L.pts[i - 1][1]))
    L.len = L.cum[L.cum.length - 1]
    for (const [x, y] of L.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  }
  return { lanes, bb: [x0, y0, x1, y1] }
}

export function at(L, s) {
  s = Math.min(L.len, Math.max(0, s)); const c = L.cum; let lo = 0, hi = c.length - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; c[m] <= s ? lo = m : hi = m }
  const a = L.pts[lo], b = L.pts[hi], t = (s - c[lo]) / ((c[hi] - c[lo]) || 1)
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]
}

export class Traffic {
  constructor(layout, demand = .5) { this.lanes = layout.lanes; this.bb = layout.bb; this.demand = demand; this.reset() }
  reset() {
    this.t = 0; this.cleared = 0; this.hard = 0; this.log = []; this.id = 0; this.sv = 0; this.sn = 0
    for (const L of this.lanes) { L.vs = []; L.acc = 0 }
    const gap = 40 + (1 - this.demand) * 160
    for (const L of this.lanes) if (L.kind === 'main') for (let s = 10; s < L.len - 10; s += gap) this.add(L, s, 30)
  }
  pick(L) { if (!L.next.length) return null; let r = R(); for (const [n, p] of L.next) { if ((r -= p) <= 0) return n } return L.next[0][0] }
  add(L, s, v) { const o = { id: this.id++, s, v, g: 0, nx: null }; o.nx = this.pick(L); L.vs.push(o); L.vs.sort((a, b) => a.s - b.s) }
  step(dt) {
    this.t += dt
    for (const L of this.lanes) if (L.w) {
      L.acc = Math.min(2, L.acc + dt * L.w * this.demand * 1.1); const f = L.vs[0]
      if (L.acc >= 1 && (!f || f.s > 14 + f.v)) { this.add(L, 0, Math.min(L.vmax * .8, f ? f.v : 1e9)); L.acc -= 1 }
    }
    for (const L of this.lanes) {
      const vs = L.vs, mv = []
      for (let k = vs.length - 1; k >= 0; k--) {
        const v = vs[k]; let g = Infinity, vl = 0; const cand = (a, u) => { if (a < g) { g = a; vl = u } }
        if (vs[k + 1]) cand(vs[k + 1].s - v.s - P.LEN, vs[k + 1].v)
        else if (v.nx) { let d = L.len - v.s, ln = v.nx, h = 0; while (ln && h++ < 3 && d < P.Z) { const f = ln.vs[0]; if (f) { cand(d + f.s - P.LEN, f.v); break } d += ln.len; ln = ln.next.length ? ln.next[0][0] : null } }
        if (v.nx && v.nx.preds.length > 1 && L.len - v.s < P.Z) {            // virtual leader across merge
          const xi = v.s - L.len
          for (const Q of v.nx.preds) { if (Q === L) continue
            for (let m = Q.vs.length - 1; m >= 0; m--) { const w = Q.vs[m]; if (w.s < Q.len - P.Z) break; const xj = w.s - Q.len; if (xj > xi || (xj === xi && w.id < v.id)) cand(xj - xi - P.LEN, w.v) } }
        }
        const cap = Math.min(L.vmax, v.v + P.A * dt); let nv = cap
        if (g < Infinity) { const gg = Math.max(0, g - P.G0), bt = P.B * P.T; nv = Math.min(cap, -bt + Math.sqrt(bt * bt + vl * vl + 2 * P.B * gg)) }
        nv = Math.max(0, nv, v.v - P.EB * dt); if (v.v - nv > 6 * dt) this.hard++
        let ds = nv * dt; if (g < Infinity && ds > Math.max(0, g - .5)) { ds = Math.max(0, g - .5); nv = ds / dt }
        v.v = nv; v.s += ds; v.g = Math.max(0, v.g - dt); this.sv += nv; this.sn++
        if (v.s >= L.len) mv.push(v)
      }
      if (mv.length) {
        vs.splice(vs.length - mv.length)
        for (const v of mv) {
          if (!v.nx) { this.cleared++; this.log.push(this.t); continue }
          const N = v.nx; v.s -= L.len; if (L.kind === 'entry') v.g = 4
          v.nx = this.pick(N); N.vs.push(v); N.vs.sort((a, b) => a.s - b.s)
        }
      }
    }
    if (this.log.length && this.log[0] < this.t - 60) this.log = this.log.filter(t => t > this.t - 60)
  }
  draw(c, W, H) {
    c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(4,5,14,.24)'; c.fillRect(0, 0, W, H)
    const [x0, y0, x1, y1] = this.bb, s = Math.min(W / (x1 - x0 + 260), H / (y1 - y0 + 260)), ox = W / 2 - (x0 + x1) / 2 * s, oy = H / 2 - (y0 + y1) / 2 * s
    c.save(); c.translate(ox, oy); c.scale(s, s); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'
    for (const L of this.lanes) { c.beginPath(); L.pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = 'rgba(90,110,255,.10)'; c.lineWidth = 11; c.stroke(); c.strokeStyle = 'rgba(140,160,255,.22)'; c.lineWidth = .8; c.stroke() }
    for (const L of this.lanes) for (const v of L.vs) {
      const [x, y, a] = at(L, v.s), g = Math.max(L.kind === 'entry' ? 1 : 0, v.g / 4), col = `rgb(${255 - 210 * g | 0},${45 + 210 * g | 0},${85 + 53 * g | 0})`
      c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = .16; c.fillStyle = col; c.fillRect(-10, -4, 20, 8); c.globalAlpha = 1; c.fillRect(-4.5, -1.7, 9, 3.4); c.restore()
    }
    c.restore()
  }
  stats() {
    let n = 0, s = 0; for (const L of this.lanes) for (const v of L.vs) { n++; s += v.v }
    return { veh: n, kmh: n ? s / n * 3.6 : 0, rate: this.log.length / Math.min(60, Math.max(1, this.t)) * 60, cleared: this.cleared, hard: this.hard, avg: this.sn ? this.sv / this.sn * 3.6 : 0 }
  }
}
