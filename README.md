# MURMUR — murmurations & collision-free bullet freeways

```
./up      # build + start  → http://localhost:8080
./down    # stop
./clean   # stop + delete volumes + local images
```

Concept by [Greg Tomasyk](https://www.linkedin.com/in/gtomasyk/)

**Stack** React/Vite (nginx) · Go API · Postgres 16 · docker compose.
Postgres holds `layouts` (freeway configs, parameters as JSONB) and `runs` (leaderboard). Go serves `GET /api/layouts`, `GET|POST /api/runs`.
The physics runs in the browser at 60 fps (a server round-trip per frame would add latency for no benefit); the backend owns configs and scores.
Controls: speed slider (×0.1…×8, sub-stepped so dt ≤ 1/30 s regardless of speed), demand slider, Space = pause, ↑↓ = speed, drag = falcon.

---
## 1. Murmuration (random, emergent)
Bird *i* has position **x**ᵢ, velocity **v**ᵢ. Neighbours Nᵢ = up to 14 birds within r=60 (a cap approximates the *topological* ≈7 neighbour rule observed in starlings). Acceleration:

**a**ᵢ = k_s Σ_{j∈Nᵢ, d<16} (1−d/16)·(**x**ᵢ−**x**ⱼ)/d² ·… + k_a(⟨**v**⟩−**v**ᵢ) + k_c⟨**x**ⱼ−**x**ᵢ⟩ + k_r **r̂**(t) + **f**_falcon + **f**_wall

* separation (k_s=260), alignment (k_a=1.9), cohesion (k_c=0.9);
* roost attractor **R**(t) = c + (0.28W cos .23t, 0.22H sin .37t) pulls the flock along a Lissajous path, which gives the sweeping, folding shapes;
* falcon: repulsion ∝ (1−d/170)/d, which creates the density waves that travel through the flock;
* |**v**| clamped to [85,175].

Order parameter (polarisation) Φ = |Σ**v**ᵢ| / Σ|**v**ᵢ| ∈ [0,1], shown live. Φ→1 is a coherent flock, Φ→0 is a swirling gas.
Collision-avoidance here is *soft* (repulsive potential), not guaranteed — real flocks are not guaranteed either.

## 2. Freeway: why it is collision-free
### 2.1 Network
Directed graph of lanes ℓ with arc-length coordinate s∈[0,Lℓ]. Vehicle state (ℓ, s, v, length ℓ_v=4.5 m).
Each carriageway = chain of segments split at *diverge* points D_j and *merge* points M_j (D_j, M_j = u_j ∓ 48 m). Off-ramps leave at D_j (route probability 0.32), on-ramps join at M_j. Vehicle colour: **red** on mainline/off-ramp, **green** from the on-ramp until 4 s after merging, then fades back to red.

### 2.2 Car-following invariant (Gipps safe speed)
Let gap g = s_leader − s − ℓ_v, follower speed v, leader speed v_l, brake b, reaction time τ. If the leader brakes to a halt at once, safe iff the follower's stopping distance fits:

vτ + v²/(2b) ≤ g − g₀ + v_l²/(2b)

Solving the quadratic in v:

**v_safe = −bτ + √( b²τ² + v_l² + 2b·(g−g₀) )**

Update: v′ = min(v_max, v + a·Δt, v_safe).  With τ ≥ Δt (τ=0.8, Δt ≤ 1/30) the inequality is preserved by induction, so **g(t) ≥ g₀ > 0 for all t** → no two vehicles on one lane ever overlap. (a=3, b=4, g₀=2 m.)
Moving the vehicle by ds = v′Δt is additionally clamped to ≤ g−0.5 (*kinematic guard*) so that, even under numerical or admission violations, overlap is impossible by construction; the count of decelerations > 6 m/s² is displayed as “Hard brakes”.

### 2.3 Merging without a crossing conflict — the *virtual leader*
Two lanes A, B feed M. Define the common coordinate x = s − L_lane (distance to the merge node, ≤0 before it). Within Z = v_max²/(2b) = 450 m of the node every vehicle treats *every* vehicle on the sibling branch as a candidate leader whenever x_j > x_i (ties by id). The follower uses the **minimum gap** over all candidates.
Result: the two branches are *zipped into one virtual lane* ordered by x.
1. Within the virtual lane, §2.2 applies, so x_j − x_i ≥ ℓ_v+g₀ for consecutive vehicles.
2. Strict gaps ⇒ order never swaps (no overtaking) ⇒ the precedence relation is fixed once set.
3. Two vehicles can only conflict physically at the node (x=0); they would need |x_i−x_j|<ℓ_v there, contradicting 1. Hence merge conflicts are impossible.

**Divergence** only removes a vehicle from a lane; followers see a larger gap (monotone safe).

### 2.4 Admission control (marshalling)
A vehicle is injected at s=0 of an entry lane only if the lane's tail satisfies s_tail > 14 + v_tail (≥ 1 s headway + 14 m) and at speed ≤ v_tail. Otherwise the arrival waits (queue builds on-ramp). Inflow λ = w·demand·1.1 veh/s (Poisson-like accumulator).

### 2.5 Capacity & why it jams (the game)
Steady flow per lane: q = ρv; with safe headway h = (ℓ_v+g₀)/v + τ′ the max flow is q_max ≈ 1/(τ′+(ℓ_v+g₀)/v) ≈ 1 veh/s per lane at 60 m/s. Merge zones share this capacity, so main inflow + ramp inflow > q_max forms a shockwave that moves backwards at c = Δq/Δρ < 0 — push **Demand** up and watch it. Score = vehicles cleared; submit runs to the leaderboard.

### 2.6 Honest limits
The guarantee is exact when admission holds; at the first instant a sibling vehicle enters the window the required braking may exceed b, the guard then limits motion (never overlap) at the cost of a hard brake (counted). Ramps are 170 m + 90 m of lead-in to make this rare. Lane changes on the mainline are not modelled.

## 3. Layouts (Postgres `layouts`)
`loop` {k interchanges, R radius} · `spine` {k, L length, twin carriageways}. Add rows to `db/init.sql` (then `make clean && make up`) to create new configs.
