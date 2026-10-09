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
// Plain-language explainers for blood-report markers. Each entry lists the
// name fragments it matches; the first entry whose keyword appears in the
// marker name wins, so specific/compound keywords are ordered before broad
// ones (e.g. "glycated" before "hemoglobin", "tibc" before "iron").
const BIOMARKER_INFO = [
  { keys: ["hba1c", "glycated", "a1c"], what: "Your average blood sugar over the past ~3 months — a report card for long-term sugar control.", matters: "A raised value points toward pre-diabetes or diabetes, which can quietly affect the heart, kidneys, eyes and nerves over years.", improve: "Cut sugary drinks and refined carbs, move your body daily, and manage weight and sleep. It updates at your next 3-month test." },
  { keys: ["hemoglobin", "haemoglobin"], what: "The protein in red blood cells that carries oxygen from your lungs to the rest of your body.", matters: "Low means anaemia — tiredness, pale skin, breathlessness and poor focus (very common in Indian women). High can come from dehydration or smoking.", improve: "Iron- and B12-rich foods with a little vitamin C help a low value; your doctor checks the cause first." },
  { keys: ["hematocrit", "haematocrit", "pcv", "packed cell"], what: "The share of your blood that is made up of red blood cells.", matters: "Low usually tracks with anaemia; high can mean dehydration or thicker blood.", improve: "Treat the cause — fluids for a high reading, an iron/B12 review for a low one." },
  { keys: ["rbc count", "red blood cell count", "total rbc", "rbc"], what: "The number of red blood cells carrying oxygen in your blood.", matters: "Low can mean anaemia; high can come from dehydration, smoking or living at high altitude.", improve: "Address the cause — fluids, or an iron/B12 review if it's low." },
  { keys: ["mchc"], what: "The average concentration of hemoglobin packed inside each red blood cell.", matters: "It helps classify the type of anaemia alongside MCV and MCH — it's rarely read alone.", improve: "Interpreted as part of the red-cell pattern; treating the underlying anaemia corrects it." },
  { keys: ["mch"], what: "The average amount of hemoglobin inside a single red blood cell.", matters: "Low points toward iron-deficiency-type anaemia; high toward B12 or folate types.", improve: "Addressed by correcting the underlying iron or vitamin deficiency." },
  { keys: ["mcv", "mean corpuscular volume", "mean cell volume"], what: "The average size of your red blood cells.", matters: "Smaller-than-normal cells suggest iron deficiency; larger-than-normal cells suggest B12 or folate deficiency.", improve: "Depends on direction — iron for small cells, B12/folate for large ones; confirm with your doctor." },
  { keys: ["rdw", "red cell distribution"], what: "How much your red blood cells vary in size from one another.", matters: "A high RDW is an early clue that red cells are uneven in size — often from iron, B12 or folate deficiency, sometimes before anaemia even shows up.", improve: "Usually improves once the underlying iron or vitamin deficiency is found and corrected." },
  { keys: ["neutrophil"], what: "The most common white blood cell — your body's first responder to bacterial infection.", matters: "High often means an infection or physical stress; low can weaken how well you fight infection.", improve: "Usually reflects a temporary illness — recheck after you recover." },
  { keys: ["lymphocyte"], what: "White blood cells that drive immune memory and fight viruses.", matters: "High can follow viral infections; low can appear with stress, steroids or certain infections.", improve: "Typically settles after the underlying illness; your doctor reads the trend." },
  { keys: ["eosinophil"], what: "White blood cells linked to allergies and parasite defence.", matters: "High is common with allergies, asthma or worm infections — all very frequent in India.", improve: "Managing allergies or treating a parasite infection usually brings it down." },
  { keys: ["monocyte"], what: "White blood cells that clean up damage and fight longer-lasting infections.", matters: "A mildly high value can follow infections or inflammation.", improve: "Usually normalises once the underlying cause settles." },
  { keys: ["basophil"], what: "The rarest white blood cells, involved in allergic responses.", matters: "Small changes are usually not significant on their own.", improve: "Interpreted as part of the full blood count." },
  { keys: ["platelet"], what: "Tiny cells that clump together to stop bleeding and form clots.", matters: "Low raises bruising and bleeding risk; high can follow infection or inflammation and occasionally raises clot risk.", improve: "Depends on the cause — treat any infection, review medicines; your doctor guides it." },
  { keys: ["esr"], what: "How fast red cells settle in a test tube — a simple, general signal of inflammation.", matters: "A high ESR means inflammation somewhere in the body; it's a clue, not a diagnosis.", improve: "Falls once the underlying inflammation or infection is treated." },
  { keys: ["crp", "c-reactive"], what: "A protein that rises when there's inflammation anywhere in the body.", matters: "A raised value flags inflammation or infection; higher levels can also relate to heart risk.", improve: "Treat the underlying cause; good sleep, exercise and less processed food help your baseline." },
  { keys: ["vitamin d", "25 hydroxy", "25-oh", "25 oh"], what: "A sunshine nutrient that acts like a hormone, helping your body absorb calcium and keep bones, muscles and immunity strong.", matters: "Running low is very common in India and is linked to tiredness, low mood, aches and weaker bones over time.", improve: "Get 15–20 min of midday sun on bare skin a few times a week, and ask your doctor whether a vitamin D supplement is right for you." },
  { keys: ["b12", "cobalamin"], what: "A vitamin your nerves and blood cells depend on, found almost entirely in animal foods.", matters: "Low B12 can cause fatigue, tingling in the hands and feet, poor memory and a type of anaemia — vegetarians are most at risk.", improve: "Include dairy, eggs or fortified foods; strict vegetarians often need a supplement. Your liver stores it, so levels change slowly." },
  { keys: ["folate", "folic", "vitamin b9"], what: "Vitamin B9 — works hand in hand with B12 to build healthy red blood cells.", matters: "Low folate causes a type of anaemia and tiredness, and matters a lot in pregnancy.", improve: "Eat more leafy greens, beans, lentils and citrus; a supplement may be advised, especially when planning pregnancy." },
  { keys: ["vitamin b6", "pyridoxine"], what: "A vitamin that helps your brain, nerves and metabolism run smoothly.", matters: "Low levels can show up as low mood, irritability or tingling, and are usually diet-related.", improve: "Whole grains, bananas, potatoes, chickpeas and fish are good sources." },
  { keys: ["ferritin"], what: "Your body's stored-iron level — like the fuel left in your iron tank.", matters: "Low ferritin is the earliest sign of iron deficiency (fatigue, hair fall, breathlessness); very high can signal inflammation.", improve: "If low: iron-rich foods (greens, dates, jaggery, meat) plus vitamin C to absorb it better. Retest before long-term supplements." },
  { keys: ["tibc", "iron binding", "transferrin"], what: "How much capacity your blood has to carry iron — a companion test to iron and ferritin.", matters: "A high TIBC alongside low iron points strongly to iron deficiency; it helps confirm the picture.", improve: "Improves as iron deficiency is corrected with diet and, if needed, supplements." },
  { keys: ["serum iron", "iron"], what: "The amount of iron circulating in your blood right now.", matters: "Low iron leaves you tired, foggy and short of breath; it's the world's most common deficiency.", improve: "Pair iron-rich foods with vitamin C (lemon, amla); avoid tea or coffee right after meals as they block absorption." },
  { keys: ["hdl"], what: "The 'good' cholesterol that clears the bad kind out of your arteries.", matters: "Low HDL is less protective for your heart; a higher value is generally better.", improve: "Regular exercise, healthy fats (nuts, fish, olive oil) and quitting smoking all help raise it." },
  { keys: ["ldl"], what: "The 'bad' cholesterol that can build up in artery walls.", matters: "High LDL raises the long-term risk of heart attack and stroke, usually with no symptoms until late.", improve: "More fibre, nuts and healthy oils; less fried and processed food; regular exercise. Some people also need medication." },
  { keys: ["vldl"], what: "A cholesterol particle that mainly carries triglyceride fat around the body.", matters: "A high VLDL tracks with high triglycerides and adds to heart risk.", improve: "Cut sugar, refined carbs and alcohol; add exercise and omega-3-rich foods." },
  { keys: ["triglyceride"], what: "A type of fat in your blood, strongly tied to diet and alcohol.", matters: "High triglycerides raise heart risk and, at very high levels, can strain the pancreas.", improve: "Cut sugar, refined carbs and alcohol; add omega-3 foods and exercise. Fast before testing for an accurate number." },
  { keys: ["cholesterol"], what: "A waxy fat your body needs — but the balance between the 'good' (HDL) and 'bad' (LDL) types is what matters.", matters: "An unhealthy balance quietly raises heart-disease risk over years.", improve: "A fibre-rich, less-fried diet, regular activity and not smoking all improve the balance." },
  { keys: ["sgpt", "alanine", "alt"], what: "A liver enzyme (ALT) — one of the clearest signals of how your liver is doing.", matters: "A high value suggests the liver is irritated, commonly from fatty liver, alcohol or certain medicines.", improve: "Lose excess weight gradually, cut alcohol and fried food, and recheck; your doctor rules out other causes." },
  { keys: ["sgot", "aspartate"], what: "A liver and muscle enzyme (AST), read alongside ALT.", matters: "High can come from the liver, but also from muscle; the ALT/AST pattern tells the story.", improve: "Address the liver cause (weight, alcohol, diet) and recheck with your doctor." },
  { keys: ["alkaline phosphatase", "alk phos", "alp"], what: "An enzyme that comes from both the liver and the bones.", matters: "High can point to a liver/bile issue or to bone turnover; it's always read in context.", improve: "Depends on the source — your doctor interprets it together with the other liver tests." },
  { keys: ["ggt", "gamma glut", "gamma-glut"], what: "A liver enzyme that is sensitive to alcohol and bile flow.", matters: "A high value often relates to alcohol or fatty liver.", improve: "Reducing alcohol and treating fatty liver usually brings it down." },
  { keys: ["bilirubin"], what: "A yellow pigment made when old red blood cells break down, cleared by the liver.", matters: "High can yellow the eyes or skin (jaundice) and points to the liver or red-cell breakdown; mild rises (like Gilbert's) are often harmless.", improve: "Depends on the cause — your doctor interprets it with the rest of the liver panel." },
  { keys: ["albumin"], what: "The main protein in your blood, made by the liver; it keeps fluid in place and carries other substances.", matters: "Low can reflect poor nutrition, or a liver or kidney issue; it's a useful general-health marker.", improve: "Enough protein in the diet and treating any underlying condition help." },
  { keys: ["globulin"], what: "A group of blood proteins involved in immunity and transport.", matters: "Changes can relate to infection, inflammation or immune conditions, and are read with albumin.", improve: "Interpreted with the full protein picture by your doctor." },
  { keys: ["total protein"], what: "The combined amount of albumin and globulin proteins in your blood.", matters: "An out-of-range value is a general clue, interpreted alongside albumin and globulin.", improve: "Balanced nutrition and treating the underlying cause; your doctor guides it." },
  { keys: ["urea", "bun", "blood urea"], what: "A waste product from protein breakdown that your kidneys filter out.", matters: "High can mean the kidneys are under strain or that you're dehydrated; it's read with creatinine.", improve: "Stay well hydrated; your doctor checks kidney function if it stays high." },
  { keys: ["creatinine"], what: "A waste product from your muscles that the kidneys filter out — a window on kidney function.", matters: "A higher value can signal the kidneys aren't filtering well; it's read alongside other kidney markers.", improve: "Stay hydrated and avoid unnecessary painkillers; a doctor should interpret a high value in context." },
  { keys: ["uric acid"], what: "A waste product from breaking down certain foods, cleared by the kidneys.", matters: "High levels can crystallise in joints and cause gout, and are linked to kidney stones.", improve: "Drink more water; cut back on red meat, organ meat, alcohol and sugary drinks." },
  { keys: ["egfr", "gfr"], what: "An estimate of how well your kidneys are filtering your blood.", matters: "A lower eGFR means reduced kidney filtering — it's the key number for kidney health.", improve: "Control blood pressure and sugar, stay hydrated, and avoid unnecessary painkillers." },
  { keys: ["sodium"], what: "A key salt that balances body fluid and helps nerves and muscles work.", matters: "Out-of-range sodium affects hydration and, at extremes, can cause confusion or cramps.", improve: "It usually tracks hydration and other conditions; your doctor interprets it." },
  { keys: ["potassium"], what: "A mineral that is vital for your heartbeat and muscle function.", matters: "Both high and low potassium can affect heart rhythm, so it's watched closely.", improve: "Diet and some medicines affect it — don't self-supplement; follow your doctor." },
  { keys: ["chloride"], what: "A salt that works with sodium to balance your body fluids.", matters: "It usually shifts along with sodium and hydration, and is read as part of the electrolyte panel.", improve: "Interpreted together with the other electrolytes." },
  { keys: ["calcium"], what: "The mineral behind strong bones and teeth, and also vital for nerves and muscles.", matters: "An out-of-range value can affect bones, muscles and heart rhythm, and is read with vitamin D.", improve: "Dairy, ragi, sesame and leafy greens supply calcium; vitamin D helps you absorb it." },
  { keys: ["phosphor", "phosphate"], what: "A mineral that partners with calcium for strong bones and for energy.", matters: "Out-of-range levels relate to bone, kidney or vitamin D balance.", improve: "Read together with calcium and vitamin D; your doctor guides any change." },
  { keys: ["magnesium"], what: "A mineral behind 300+ reactions in the body, including muscles, nerves and sleep.", matters: "Low magnesium can cause cramps, fatigue and poor sleep, and is easy to miss.", improve: "Nuts, seeds, whole grains and leafy greens are rich sources." },
  { keys: ["tsh"], what: "The brain's signal to your thyroid gland, which sets your whole body's pace.", matters: "High TSH usually means an underactive thyroid (fatigue, weight gain, feeling cold); low can mean an overactive one (anxiety, weight loss).", improve: "Thyroid issues need a doctor's guidance — don't self-treat. Enough iodine and selenium support normal function." },
  { keys: ["triiodothyronine", "free t3", "ft3", "t3"], what: "An active thyroid hormone that helps set your energy and metabolism.", matters: "It's read with TSH and T4 to tell an under- or over-active thyroid apart.", improve: "Thyroid problems are managed by a doctor — avoid self-treating." },
  { keys: ["thyroxine", "free t4", "ft4", "t4"], what: "The main thyroid hormone, converted into the active form your body uses.", matters: "It's read with TSH to assess how your thyroid is working.", improve: "Managed by a doctor if thyroid function is off." },
  { keys: ["fasting glucose", "glucose fasting", "fasting blood sugar", "fbs"], what: "Your blood sugar after an overnight fast — a core diabetes screen.", matters: "Consistently high suggests pre-diabetes or diabetes; low can cause shakiness and dizziness.", improve: "Balance meals with protein and fibre, stay active, and fast properly before the test so the reading is accurate." },
  { keys: ["postprandial", "post prandial", "post-prandial", "pp glucose", "ppbs"], what: "Your blood sugar about 2 hours after a meal.", matters: "A high value shows how your body handles sugar after eating — an early clue to diabetes.", improve: "Smaller portions of refined carbs, more fibre, and a short walk after meals all help." },
  { keys: ["glucose", "blood sugar", "random sugar"], what: "The sugar your body uses for energy, measured in your blood.", matters: "Consistently high points to diabetes risk; very low causes dizziness and shakiness.", improve: "Balanced meals, regular activity and weight control keep it steady." },
  { keys: ["insulin"], what: "The hormone that moves sugar out of your blood and into your cells for energy.", matters: "High fasting insulin can signal insulin resistance — an early step toward diabetes.", improve: "Weight loss, exercise, fewer refined carbs and good sleep all improve insulin sensitivity." },
]

function getBiomarkerInfo(name) {
  const n = (name || "").toLowerCase()
  for (const e of BIOMARKER_INFO) {
    if (e.keys.some(k => n.includes(k))) return e
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
              <div className="label">What it can mean</div>
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
