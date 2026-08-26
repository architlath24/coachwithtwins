import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'
import { categorize } from './categorize'

const API_BASE = "http://localhost:8000"
const DIET_TABS = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "non_vegetarian", label: "Non-Vegetarian" },
  { key: "vegan", label: "Vegan" },
]

function callWithRetry(fn, retries = 2) {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const result = await fn()
        return resolve(result)
      } catch (err) {
        const status = err?.response?.status
        const retryable = status === 500 || status === 503
        if (i < retries && retryable) {
          await new Promise(r => setTimeout(r, 1800))
          continue
        }
        return reject(err)
      }
    }
  })
}

function AnimatedBackground() {
  return (
    <div className="bg-orbs" aria-hidden="true">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
    </div>
  )
}

function Spinner({ text }) {
  return (
    <div className="spinner-wrap fade-in">
      <div className="spinner-orbit">
        <div className="spinner-core"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring ring2"></div>
      </div>
      <div className="spinner-text">{text}</div>
    </div>
  )
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await callWithRetry(() =>
        axios.post(`${API_BASE}/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
      )
      onLogin(res.data.user_id, res.data.name)
    } catch (err) {
      setError("Invalid email or password.")
    }
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && email && password) handleLogin()
  }

  return (
    <>
      <AnimatedBackground />
      <div className="login-box pop-in">
        <div className="eyebrow glow-text">FitTwins &middot; Health Intelligence</div>
        <h2 className="login-title">Welcome back</h2>
        <p className="login-sub">Sign in to see your biological age and personalized plan.</p>
        <input className="login-input" type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} />
        <input className="login-input" type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
        {error && <p className="status-text error">{error}</p>}
        <button className="btn btn-block btn-glow" onClick={handleLogin} disabled={loading || !email || !password}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </>
  )
}

function useCountUp(target, duration = 1200, decimals = 1) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target == null) return
    let start = null
    const from = 0
    const animate = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (target - from) * eased)
      if (progress < 1) requestAnimationFrame(animate)
      else setValue(target)
    }
    requestAnimationFrame(animate)
  }, [target])
  return value.toFixed(decimals)
}

function Gauge({ value, min, max, status, size = 46, glow = false, animateDelay = 0 }) {
  const color = status === "red" ? "var(--red)" : "var(--green)"
  let pct = 0.5
  if (min != null && max != null && max > min) {
    pct = (value - min) / (max - min)
    pct = Math.max(0.04, Math.min(1, pct))
  }
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), animateDelay)
    return () => clearTimeout(t)
  }, [animateDelay])

  const r = (size - 8) / 2
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - (drawn ? pct : 0))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`gauge-svg ${glow ? "gauge-glow" : ""}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cx})`} className="gauge-arc" style={{ filter: status === "red" ? `drop-shadow(0 0 4px ${color})` : "none" }} />
    </svg>
  )
}

function BiomarkerModal({ biomarker, onClose }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API_BASE}/biomarker-info/${encodeURIComponent(biomarker.marker_name)}`)
      .then(res => setInfo(res.data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="modal-backdrop fade-in" onClick={onClose}>
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h3>{biomarker.marker_name}</h3>
          <Gauge value={biomarker.value} min={biomarker.normal_range_min} max={biomarker.normal_range_max} status="red" size={44} glow />
        </div>
        <div className="modal-value">{biomarker.value} {biomarker.unit} &middot; out of healthy range</div>

        <div className="modal-row">
          <div className="label">Normal Range</div>
          <div className="value">{biomarker.normal_range_min ?? "—"} to {biomarker.normal_range_max ?? "—"} {biomarker.unit}</div>
        </div>

        {loading ? (
          <div className="modal-row"><div className="value dim">Loading suggestions...</div></div>
        ) : info && (
          <>
            <div className="modal-row">
              <div className="label">Suggested Supplement</div>
              <div className="value">{info.supplement}</div>
            </div>
            <div className="modal-row">
              <div className="label">Typical Approach</div>
              <div className="value">{info.typical_dose}</div>
            </div>
          </>
        )}

        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function BiomarkerPanel({ group, onSelect, index }) {
  const [open, setOpen] = useState(true)
  const flaggedCount = group.items.filter(b => b.status === "red").length

  return (
    <div className="panel fade-in-up" style={{ animationDelay: `${index * 70}ms` }}>
      <button className="panel-header" onClick={() => setOpen(!open)}>
        <div className="panel-title">
          <span className={`panel-dot ${flaggedCount > 0 ? "flag" : "ok"}`}></span>
          {group.name}
          <span className={`panel-badge ${flaggedCount > 0 ? "flag" : "ok"}`}>
            {flaggedCount > 0 ? `${flaggedCount} of ${group.items.length} flagged` : `all ${group.items.length} normal`}
          </span>
        </div>
        <div className={`chev ${open ? "open" : ""}`}>▾</div>
      </button>
      <div className={`panel-body-wrap ${open ? "open" : "closed"}`}>
        <div className="panel-body">
          {group.items.map((b, i) => (
            <button
              key={i}
              className={`gcard ${b.status === "red" ? "clickable" : ""}`}
              onClick={() => b.status === "red" && onSelect(b)}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Gauge value={b.value} min={b.normal_range_min} max={b.normal_range_max} status={b.status} animateDelay={index * 70 + i * 40} />
              <div className="gcard-info">
                <div className="gname">{b.marker_name}</div>
                <div className="gvalue">{b.value}<span className="unit">{b.unit}</span></div>
              </div>
              {b.status === "red" && <div className="gcard-tap">tap for details</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function OverviewRing({ groups }) {
  const total = groups.reduce((sum, g) => sum + g.items.length, 0)
  const flagged = groups.reduce((sum, g) => sum + g.items.filter(b => b.status === "red").length, 0)
  const healthyPct = total > 0 ? (total - flagged) / total : 1
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 300); return () => clearTimeout(t) }, [])

  const r = 54
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - (drawn ? healthyPct : 0))

  return (
    <div className="overview-ring-wrap fade-in">
      <div className="overview-ring">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
          <circle cx="65" cy="65" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 65 65)"
            className="overview-ring-arc" />
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7FA88C" />
              <stop offset="100%" stopColor="#A8D4B5" />
            </linearGradient>
          </defs>
        </svg>
        <div className="overview-ring-center">
          <div className="overview-ring-num">{total - flagged}<span>/{total}</span></div>
          <div className="overview-ring-label">normal</div>
        </div>
      </div>
      <div className="overview-legend">
        {groups.map((g, i) => {
          const f = g.items.filter(b => b.status === "red").length
          return (
            <div className="legend-item" key={i}>
              <span className={`legend-dot ${f > 0 ? "flag" : "ok"}`}></span>
              <span className="legend-name">{g.name}</span>
              <span className="legend-count">{f > 0 ? `${f} flagged` : "clear"}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Dashboard({ userId, userName, onLogout }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("")
  const [reportData, setReportData] = useState(null)
  const [dietPlan, setDietPlan] = useState(null)
  const [dietTab, setDietTab] = useState("vegetarian")
  const [selectedBiomarker, setSelectedBiomarker] = useState(null)
  const [error, setError] = useState(null)

  const bioAgeAnimated = useCountUp(reportData?.biological_age)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setLoadingText("Reading your report and extracting biomarkers...")
    setError(null)
    setDietPlan(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await callWithRetry(() => axios.post(`${API_BASE}/upload-report?user_id=${userId}`, formData))
      setReportData(res.data)
    } catch (err) {
      setError("Upload failed after retrying. Please try again in a moment.")
    }
    setLoading(false)
  }

  const handleGetDietPlan = async () => {
    if (!reportData) return
    setLoading(true)
    setLoadingText("Building your personalized diet plan...")
    setError(null)
    try {
      const res = await callWithRetry(() => axios.get(`${API_BASE}/diet-plan/${reportData.report_id}`))
      setDietPlan(res.data.diet_plan)
    } catch (err) {
      setError("Could not generate diet plan after retrying. Please try again.")
    }
    setLoading(false)
  }

  const groups = reportData ? categorize(reportData.biomarkers) : []

  return (
    <div className="container">
      <AnimatedBackground />
      <div className="top-bar">
        <div className="eyebrow glow-text" style={{ marginBottom: 0 }}>FitTwins &middot; Health Intelligence</div>
        <button className="logout-btn" onClick={onLogout}>Log out</button>
      </div>

      {!reportData && !loading && (
        <div className="upload-zone pop-in">
          <div className="upload-icon pulse">＋</div>
          <strong>Know Your Biological Age, {userName}</strong>
          <p className="upload-sub">Upload a blood report (PDF or image) to get started</p>
          <label className="file-label">
            {file ? file.name : "Choose a file"}
            <input type="file" onChange={(e) => setFile(e.target.files[0])} hidden />
          </label>
          <button className="btn btn-glow" onClick={handleUpload} disabled={!file}>Upload &amp; Analyze</button>
        </div>
      )}

      {loading && <Spinner text={loadingText} />}
      {error && <p className="status-text error">{error}</p>}

      {reportData && !loading && (
        <>
          <div className="hero fade-in">
            <div className="hero-label">Your Biological Age</div>
            <div className="hero-number-wrap">
              <span className="hero-number glow-number">{bioAgeAnimated}</span>
              <span className="hero-unit">yrs</span>
            </div>
            {reportData.chronological_age != null && (
              <div className={`hero-compare ${reportData.biological_age > reportData.chronological_age ? "worse" : "better"}`}>
                {reportData.biological_age > reportData.chronological_age ? "+" : ""}
                {(reportData.biological_age - reportData.chronological_age).toFixed(1)} years vs chronological age ({reportData.chronological_age})
              </div>
            )}
            <div className={`hero-method ${reportData.validated ? "validated" : "unvalidated"}`}>
              {reportData.validated ? "✓ " : "~ "}{reportData.method}
            </div>
          </div>

          {groups.length > 1 && <OverviewRing groups={groups} />}

          <div className="section-title">
            Biomarkers
            <span className="count">
              {reportData.biomarkers.length} tested &middot; {reportData.biomarkers.filter(b => b.status === "red").length} flagged &middot; tap a red one for details
            </span>
          </div>

          {groups.map((group, gi) => (
            <BiomarkerPanel key={gi} group={group} onSelect={setSelectedBiomarker} index={gi} />
          ))}

          {selectedBiomarker && (
            <BiomarkerModal biomarker={selectedBiomarker} onClose={() => setSelectedBiomarker(null)} />
          )}

          <div className="section-title" style={{ marginTop: 44 }}>Your Diet Plan</div>
          {!dietPlan ? (
            <div style={{ textAlign: "center" }}>
              <button className="btn btn-glow" onClick={handleGetDietPlan}>Generate My Diet Plan</button>
            </div>
          ) : (
            <div className="fade-in">
              <div className="summary-card">{dietPlan.summary}</div>

              <div className="diet-tabs">
                {DIET_TABS.map(tab => (
                  <button
                    key={tab.key}
                    className={`diet-tab ${dietTab === tab.key ? "active" : ""}`}
                    onClick={() => setDietTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="diet-section" key={dietTab}>
                {(dietPlan[dietTab] || []).map((block, i) => (
                  <div className="diet-block fade-in-up" style={{ animationDelay: `${i * 60}ms` }} key={i}>
                    <h3>{block.deficiency}</h3>
                    <div className="tip">💡 {block.tip}</div>
                    <ul>
                      {block.foods.map((f, j) => <li key={j}>{f}</li>)}
                    </ul>
                  </div>
                ))}
                {dietPlan.closing && <div className="diet-closing">{dietPlan.closing}</div>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)

  if (!session) {
    return <LoginScreen onLogin={(userId, name) => setSession({ userId, userName: name })} />
  }

  return <Dashboard userId={session.userId} userName={session.userName} onLogout={() => setSession(null)} />
}

export default App
