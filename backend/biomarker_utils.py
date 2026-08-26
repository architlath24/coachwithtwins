import json
import math

def calculate_status(value, min_range, max_range):
    if value is None:
        return "unknown"
    if min_range is not None and value < min_range:
        return "red"
    if max_range is not None and value > max_range:
        return "red"
    return "green"

def parse_gemini_json(raw_text):
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return json.loads(cleaned)


REQUIRED_MARKERS = {
    "albumin": ["albumin"],
    "creatinine": ["creatinine"],
    "glucose": ["glucose"],
    "CRP": ["crp", "c-reactive protein"],
    "lymphocyte %": ["lymphocyte"],
    "MCV": ["mcv", "mean cell volume", "mean corpuscular volume"],
    "RDW": ["rdw", "red cell distribution width"],
    "alkaline phosphatase": ["alkaline phosphatase"],
    "WBC": ["wbc", "white blood cell"],
}

def find_marker(biomarkers, keywords):
    for b in biomarkers:
        name = (b.get("marker_name") or "").lower()
        if any(k in name for k in keywords):
            return b.get("value")
    return None

def find_missing_markers(biomarkers):
    missing = []
    for label, keywords in REQUIRED_MARKERS.items():
        if find_marker(biomarkers, keywords) is None:
            missing.append(label)
    return missing

def calculate_real_phenoage(age, biomarkers):
    albumin = find_marker(biomarkers, REQUIRED_MARKERS["albumin"])
    creatinine = find_marker(biomarkers, REQUIRED_MARKERS["creatinine"])
    glucose = find_marker(biomarkers, REQUIRED_MARKERS["glucose"])
    crp = find_marker(biomarkers, REQUIRED_MARKERS["CRP"])
    lymph_pct = find_marker(biomarkers, REQUIRED_MARKERS["lymphocyte %"])
    mcv = find_marker(biomarkers, REQUIRED_MARKERS["MCV"])
    rdw = find_marker(biomarkers, REQUIRED_MARKERS["RDW"])
    alp = find_marker(biomarkers, REQUIRED_MARKERS["alkaline phosphatase"])
    wbc = find_marker(biomarkers, REQUIRED_MARKERS["WBC"])

    required = [albumin, creatinine, glucose, crp, lymph_pct, mcv, rdw, alp, wbc, age]
    if any(v is None for v in required):
        return None

    crp_safe = max(crp, 0.01)
    xb = (
        -19.907 - 0.0336 * albumin + 0.0095 * creatinine + 0.1953 * glucose
        + 0.0954 * math.log(crp_safe) - 0.0120 * lymph_pct + 0.0268 * mcv
        + 0.3306 * rdw + 0.00188 * alp + 0.0554 * wbc + 0.0804 * age
    )
    gamma = 0.0076927
    M = 1 - math.exp(-1.51714 * math.exp(xb) / gamma)
    M = min(max(M, 1e-9), 1 - 1e-9)
    phenoage = 141.50 + math.log(-0.00553 * math.log(1 - M)) / 0.09165
    return round(phenoage, 1)


def calculate_simple_estimate(age, biomarkers):
    if age is None:
        age = 30
    red_count = sum(1 for b in biomarkers if b.get("status") == "red")
    total_count = len(biomarkers) if biomarkers else 1
    red_ratio = red_count / total_count
    age_penalty = red_ratio * 15
    return round(age + age_penalty, 1)


def calculate_biological_age(age, biomarkers):
    real_result = calculate_real_phenoage(age, biomarkers)
    if real_result is not None:
        return {
            "biological_age": real_result,
            "method": "PhenoAge (Levine et al. 2018)",
            "validated": True,
            "missing_markers": [],
        }
    missing = find_missing_markers(biomarkers)
    fallback = calculate_simple_estimate(age, biomarkers)
    if len(missing) <= 2:
        note = f"Add {' and '.join(missing)} to your next panel for your precise, validated Biological Age."
    else:
        note = f"This report is missing {len(missing)} markers required for the validated formula."
    return {
        "biological_age": fallback,
        "method": f"Estimated — {note}",
        "validated": False,
        "missing_markers": missing,
    }
