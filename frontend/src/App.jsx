import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import './App.css'
import { categorize } from './categorize'

const API_BASE = "/api"
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

const BLOOD_FACTS = [
  "Nearly 1 in 2 Indians run low on vitamin D — even with all our sunshine. ☀️",
  "B12 comes mostly from animal foods, so vegetarians are far more likely to run low. 🥛",
  "More than half of Indian women are estimated to be anaemic — most often from low iron. 🩸",
  "Iron's main job is carrying oxygen to every cell — run low and you feel tired and foggy.",
  "Your red blood cells live only about 120 days — your blood is always renewing itself.",
  "One blood draw can hint at your heart, liver, kidney and thyroid health all at once.",
  "B12 can take years to show up as low — your liver quietly keeps a long backup store.",
  "Your thyroid is a small butterfly-shaped gland that sets your whole body's pace. 🦋",
  "Low vitamin D is linked to fatigue, low mood and weaker bones over time.",
  "Fasting before a cholesterol test matters — a recent meal can skew the numbers. 🍽️",
  "Being dehydrated concentrates your blood and can nudge several readings higher. 💧",
  "Magnesium quietly powers over 300 reactions in your body — and many of us fall short.",
  "Vitamin D acts more like a hormone — your skin makes it from sunlight.",
  "HDL is the 'good' cholesterol — it helps clear the other kind out of your arteries.",
]

function FactsLoader({ text }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * BLOOD_FACTS.length))
  const [show, setShow] = useState(true)
  useEffect(() => {
    const t = setInterval(() => {
      setShow(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % BLOOD_FACTS.length)
        setShow(true)
      }, 450)
    }, 4200)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="facts-loader fade-in">
      <div className="spinner-orbit">
        <div className="spinner-core"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring ring2"></div>
      </div>
      <div className="facts-status">{text}</div>
      <div className={`facts-card ${show ? "show" : "hide"}`}>
        <div className="facts-eyebrow">Did you know?</div>
        <div className="facts-text">{BLOOD_FACTS[idx]}</div>
      </div>
    </div>
  )
}

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    try {
      if (mode === "signup") {
        const res = await callWithRetry(() =>
          axios.post(`${API_BASE}/signup`, {
            name,
            email,
            password,
          })
        )

        onLogin(res.data.user_id, res.data.name, res.data.access_token)
      } else {
        const res = await callWithRetry(() =>
          axios.post(`${API_BASE}/login`, {
            email,
            password,
          })
        )

        onLogin(res.data.user_id, res.data.name, res.data.access_token)
      }
    } catch (err) {
      if (mode === "signup") {
        setError(
          err?.response?.status === 400
            ? "An account with this email already exists."
            : "Unable to create your account. Please try again."
        )
      } else {
        setError("Invalid email or password.")
      }
    }

    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && email && password && (mode === "login" || name)) {
      handleSubmit()
    }
  }

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login")
    setError(null)
    setName("")
    setEmail("")
    setPassword("")
  }

  return (
    <>
      <AnimatedBackground />
      <div className="login-box pop-in">
        <div className="eyebrow glow-text">FitTwins &middot; Health Intelligence</div>

        <h2 className="login-title">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>

        <p className="login-sub">
          {mode === "login"
            ? "Sign in to see your biological age and personalized plan."
            : "Create your account to discover your biological age and personalized plan."}
        </p>

        {mode === "signup" && (
          <input
            className="login-input"
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}

        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <input
          className="login-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {error && <p className="status-text error">{error}</p>}

        <button
          className="btn btn-block btn-glow"
          onClick={handleSubmit}
          disabled={
            loading ||
            !email ||
            !password ||
            (mode === "signup" && !name)
          }
        >
          {loading
            ? mode === "signup" ? "Creating account..." : "Signing in..."
            : mode === "signup" ? "Create Account" : "Sign In"}
        </button>

        <button
          type="button"
          className="login-switch"
          onClick={switchMode}
        >
          {mode === "login"
            ? "Don't have an account? Create one"
            : "Already have an account? Sign In"}
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

// Plain-language explainers for the common markers. Keyed by a lowercase
// substring of the marker name; first match wins, so more specific keys
// (ldl/hdl) come before broader ones (cholesterol).
const BIOMARKER_INFO = {
  "vitamin d": { what: "A sunshine nutrient that acts like a hormone, helping your body absorb calcium and keep bones, muscles and immunity strong.", matters: "Running low is very common in India and is linked to tiredness, low mood, aches and weaker bones over time.", improve: "Get 15–20 min of midday sun on bare skin a few times a week, and ask your doctor whether a vitamin D supplement is right for you." },
  "b12": { what: "A vitamin your nerves and blood cells depend on. It comes almost entirely from animal foods.", matters: "Low B12 can cause fatigue, tingling in hands and feet, poor memory and a type of anaemia. Vegetarians are most at risk.", improve: "Include dairy, eggs or fortified foods; strict vegetarians often need a B12 supplement. Your liver stores it, so levels change slowly." },
  "folate": { what: "Vitamin B9 — works hand in hand with B12 to build healthy red blood cells.", matters: "Low folate causes a type of anaemia and tiredness, and matters a lot in pregnancy.", improve: "Eat more leafy greens, beans, lentils and citrus; a supplement may be advised, especially when planning pregnancy." },
  "ferritin": { what: "Your body's stored-iron level — like the fuel left in your iron tank.", matters: "Low ferritin is the earliest sign of iron deficiency and shows up as fatigue, hair fall and breathlessness. Very high can signal inflammation.", improve: "If low: iron-rich foods (greens, dates, jaggery, meat) plus vitamin C to absorb it better. Retest before supplementing long-term." },
  "hemoglobin": { what: "The protein in red blood cells that carries oxygen from your lungs to the rest of your body.", matters: "Low hemoglobin means anaemia — tiredness, pale skin, breathlessness and poor focus. It's extremely common in Indian women.", improve: "Iron- and B12-rich foods with vitamin C help; your doctor will look at the cause before treating." },
  "haemoglobin": { what: "The protein in red blood cells that carries oxygen from your lungs to the rest of your body.", matters: "Low haemoglobin means anaemia — tiredness, pale skin, breathlessness and poor focus. It's extremely common in Indian women.", improve: "Iron- and B12-rich foods with vitamin C help; your doctor will look at the cause before treating." },
  "iron": { what: "The mineral your body uses to carry oxygen in the blood.", matters: "Low iron leaves you tired, foggy and short of breath; it's the world's most common deficiency.", improve: "Pair iron-rich foods with vitamin C (lemon, amla); avoid tea/coffee right after meals as they block absorption." },
  "hba1c": { what: "Your average blood sugar over the last ~3 months — a report card for sugar control.", matters: "A higher value points toward pre-diabetes or diabetes, which quietly affects the heart, kidneys, eyes and nerves.", improve: "Cut refined carbs and sugary drinks, move daily, manage weight and sleep. Changes show up at the next 3-month test." },
  "glucose": { what: "The sugar your body uses for energy, measured in your blood.", matters: "Consistently high glucose can mean diabetes risk; very low can cause shakiness and dizziness.", improve: "Balance meals with protein and fibre, stay active, and fast properly before the test so the reading is accurate." },
  "tsh": { what: "The brain's signal to your thyroid gland, which sets your whole body's speed.", matters: "High TSH often means an underactive thyroid (fatigue, weight gain, cold); low can mean an overactive one (anxiety, weight loss).", improve: "Thyroid issues need a doctor's guidance — don't self-treat. Adequate iodine and selenium support normal function." },
  "ldl": { what: "The 'bad' cholesterol that can build up in artery walls.", matters: "High LDL raises the long-term risk of heart attack and stroke, usually with no symptoms until late.", improve: "More fibre, nuts and healthy oils; less fried and processed food; regular exercise. Some people also need medication." },
  "hdl": { what: "The 'good' cholesterol that clears the bad kind out of your arteries.", matters: "Low HDL is less protective for your heart; higher is generally better.", improve: "Regular exercise, healthy fats (nuts, fish, olive oil) and quitting smoking help raise it." },
  "triglyceride": { what: "A type of fat in your blood, strongly tied to diet and alcohol.", matters: "High triglycerides raise heart risk and can strain the pancreas at very high levels.", improve: "Cut sugar, refined carbs and alcohol; add omega-3 foods and exercise. Fast before testing for an accurate number." },
  "cholesterol": { what: "A waxy fat your body needs — but balance between the 'good' and 'bad' types matters.", matters: "An unhealthy balance quietly raises heart-disease risk over years.", improve: "A fibre-rich, less-fried diet, regular activity and not smoking all help the balance." },
  "creatinine": { what: "A waste product from muscles that your kidneys filter out — a window on kidney function.", matters: "A higher value can signal the kidneys aren't filtering well; it's read alongside other kidney markers.", improve: "Stay well hydrated and avoid unnecessary painkillers; a doctor should interpret a high value in context." },
  "uric acid": { what: "A waste product from breaking down certain foods; cleared by the kidneys.", matters: "High levels can crystallise in joints and cause gout, and are linked to kidney stones.", improve: "Drink more water; cut back on red meat, organ meat, alcohol and sugary drinks." },
  "calcium": { what: "The mineral behind strong bones and teeth, and also vital for nerves and muscles.", matters: "Out-of-range calcium can affect bones, muscles and heart rhythm and is read with vitamin D.", improve: "Dairy, ragi, sesame and leafy greens supply calcium; vitamin D helps you absorb it." },
  "crp": { what: "A marker of inflammation anywhere in the body.", matters: "A raised value signals inflammation or infection somewhere — it's a flag, not a diagnosis.", improve: "Treat the underlying cause; an anti-inflammatory lifestyle (sleep, exercise, less processed food) helps baseline levels." },
}

function getBiomarkerInfo(name) {
  const key = (name || "").toLowerCase()
  for (const k in BIOMARKER_INFO) {
    if (key.includes(k)) return BIOMARKER_INFO[k]
  }
  return null
}

function BiomarkerModal({ biomarker, onClose }) {
  const [supp, setSupp] = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE}/biomarker-info/${encodeURIComponent(biomarker.marker_name)}`)
      .then(res => setSupp(res.data))
      .catch(() => setSupp(null))
  }, [])

  const info = getBiomarkerInfo(biomarker.marker_name)
  const min = biomarker.normal_range_min
  const max = biomarker.normal_range_max
  let direction = "Normal"
  if (min != null && biomarker.value < min) direction = "Low"
  else if (max != null && biomarker.value > max) direction = "High"
  else if (biomarker.status === "red") direction = "Out of range"
  const isNormal = direction === "Normal"
  const flagClass = direction === "Low" ? "low" : isNormal ? "normal" : "high"

  return createPortal(
    <div className="modal-backdrop fade-in" onClick={onClose}>
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h3>{biomarker.marker_name}</h3>
          <Gauge value={biomarker.value} min={min} max={max} status={biomarker.status} size={44} glow />
        </div>
        <div className="modal-value">
          <span className={`modal-flag ${flagClass}`}>{direction}</span>
          {biomarker.value} {biomarker.unit}
        </div>

        <div className="modal-row">
          <div className="label">Healthy Range</div>
          <div className="value">{min ?? "—"} to {max ?? "—"} {biomarker.unit}</div>
        </div>

        {info && (
          <div className="modal-row">
            <div className="label">What it is</div>
            <div className="value">{info.what}</div>
          </div>
        )}

        {isNormal ? (
          <div className="modal-row">
            <div className="label">Where you stand</div>
            <div className="value">Good news — this one's sitting in the healthy range. Keep doing what you're doing.</div>
          </div>
        ) : info ? (
          <>
            <div className="modal-row">
              <div className="label">{direction === "High" ? "What a high level can mean" : "What a low level can mean"}</div>
              <div className="value">{info.matters}</div>
            </div>
            <div className="modal-row">
              <div className="label">How to improve it</div>
              <div className="value">{info.improve} You'll find specific foods in your diet plan below.</div>
            </div>
          </>
        ) : (
          <div className="modal-row">
            <div className="value dim">This one's outside the healthy range. Share it with your doctor to understand what it means for you, and check your diet plan below for food-first steps.</div>
          </div>
        )}

        {supp && supp.supplement && !isNormal && (
          <div className="modal-row modal-supp">
            <div className="label">Supplement note</div>
            <div className="value">{supp.supplement}{supp.typical_dose ? ` — ${supp.typical_dose}` : ""}</div>
          </div>
        )}

        <div className="modal-note">Educational only — not a diagnosis. Always confirm with your doctor.</div>
        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body
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
              className="gcard clickable"
              onClick={() => onSelect(b)}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Gauge value={b.value} min={b.normal_range_min} max={b.normal_range_max} status={b.status} animateDelay={index * 70 + i * 40} />
              <div className="gcard-info">
                <div className="gname">{b.marker_name}</div>
                <div className="gvalue">{b.value}<span className="unit">{b.unit}</span></div>
              </div>
              <div className="gcard-tap">tap to learn</div>
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
  const [dietLoading, setDietLoading] = useState(false)
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
      const res = await callWithRetry(() => axios.post(`${API_BASE}/upload-report`, formData))
      setReportData(res.data)
    } catch (err) {
      setError("Upload failed after retrying. Please try again in a moment.")
    }
    setLoading(false)
  }

  const handleGetDietPlan = async () => {
    if (!reportData) return
    setDietLoading(true)
    setError(null)
    try {
      const res = await callWithRetry(() => axios.get(`${API_BASE}/diet-plan/${reportData.report_id}`))
      setDietPlan(res.data.diet_plan)
    } catch (err) {
      setError("Could not generate diet plan after retrying. Please try again.")
    }
    setDietLoading(false)
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

      {loading && <FactsLoader text={loadingText} />}
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
              {reportData.biomarkers.length} tested &middot; {reportData.biomarkers.filter(b => b.status === "red").length} flagged &middot; tap any marker to learn about it
            </span>
          </div>

          {groups.map((group, gi) => (
            <BiomarkerPanel key={gi} group={group} onSelect={setSelectedBiomarker} index={gi} />
          ))}

          {selectedBiomarker && (
            <BiomarkerModal biomarker={selectedBiomarker} onClose={() => setSelectedBiomarker(null)} />
          )}

          <div className="section-title" style={{ marginTop: 44 }}>Your Diet Plan</div>
          {dietLoading ? (
            <FactsLoader text="Building your personalized diet plan..." />
          ) : !dietPlan ? (
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

function setAuthToken(token) {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    try { localStorage.setItem("ft_token", token) } catch { /* ignore */ }
  } else {
    delete axios.defaults.headers.common["Authorization"]
    try { localStorage.removeItem("ft_token") } catch { /* ignore */ }
    try { localStorage.removeItem("ft_session") } catch { /* ignore */ }
  }
}

function loadStoredSession() {
  try {
    const token = localStorage.getItem("ft_token")
    const raw = localStorage.getItem("ft_session")
    if (token && raw) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
      return JSON.parse(raw)
    }
  } catch { /* ignore */ }
  return null
}

function App() {
  const [session, setSession] = useState(loadStoredSession)

  const handleLogin = (userId, name, token) => {
    setAuthToken(token)
    const next = { userId, userName: name }
    try { localStorage.setItem("ft_session", JSON.stringify(next)) } catch { /* ignore */ }
    setSession(next)
  }

  const handleLogout = () => {
    setAuthToken(null)
    setSession(null)
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return <Dashboard userId={session.userId} userName={session.userName} onLogout={handleLogout} />
}

export default App
