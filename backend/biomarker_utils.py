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
    "glucose": ["glucose", "fasting glucose"],
    "CRP": ["crp", "c-reactive protein"],
    "lymphocyte %": ["lymphocyte"],
    "MCV": ["mcv", "mean cell volume", "mean corpuscular volume"],
    "RDW": ["rdw", "red cell distribution width"],
    "alkaline phosphatase": ["alkaline phosphatase"],
    "WBC": ["wbc", "white blood cell"],
}

def find_marker_full(biomarkers, keywords):
    """Returns the full biomarker dict (value + unit), not just the value."""
    for b in biomarkers:
        name = (b.get("marker_name") or "").lower()
        if any(k in name for k in keywords):
            return b
    return None

def find_marker(biomarkers, keywords):
    b = find_marker_full(biomarkers, keywords)
    return b.get("value") if b else None

def find_missing_markers(biomarkers):
    missing = []
    for label, keywords in REQUIRED_MARKERS.items():
        if find_marker(biomarkers, keywords) is None:
            missing.append(label)
    return missing


# ============================================================================
# UNIT CONVERSION
# The published PhenoAge formula (Levine et al. 2018) requires SI units.
# Real-world lab reports (India/US) almost always use conventional units.
# Plugging conventional units directly into the formula produces wildly
# wrong results (this is a common, well-documented implementation bug).
# We convert based on the reported unit string when available, and fall
# back to assuming standard conventional units when the unit is ambiguous.
# ============================================================================

def to_albumin_gL(value, unit):
    """Formula needs g/L. Labs usually report g/dL."""
    if unit and "g/l" in unit.lower():
        return value
    return value * 10  # g/dL -> g/L

def to_creatinine_umolL(value, unit):
    """Formula needs umol/L. Labs usually report mg/dL."""
    if unit and ("umol" in unit.lower() or "µmol" in unit.lower()):
        return value
    return value * 88.4  # mg/dL -> umol/L

def to_glucose_mmolL(value, unit):
    """Formula needs mmol/L. Labs usually report mg/dL."""
    if unit and "mmol" in unit.lower():
        return value
    return value * 0.0555  # mg/dL -> mmol/L

def to_wbc_thousands(value, unit):
    """Formula needs WBC in thousands per uL (e.g. 6.8). Labs report raw
    cell counts (e.g. 6800 cells/mm3 or /uL)."""
    if value > 100:  # anything this large must be a raw count, not thousands
        return value / 1000
    return value

def to_crp_mgL(value, unit):
    """Formula needs mg/L. Occasionally reports come in mg/dL."""
    if unit and "mg/dl" in unit.lower():
        return value * 10
    return value


def calculate_real_phenoage(age, biomarkers):
    albumin_b = find_marker_full(biomarkers, REQUIRED_MARKERS["albumin"])
    creatinine_b = find_marker_full(biomarkers, REQUIRED_MARKERS["creatinine"])
    glucose_b = find_marker_full(biomarkers, REQUIRED_MARKERS["glucose"])
    crp_b = find_marker_full(biomarkers, REQUIRED_MARKERS["CRP"])
    lymph_pct = find_marker(biomarkers, REQUIRED_MARKERS["lymphocyte %"])
    mcv = find_marker(biomarkers, REQUIRED_MARKERS["MCV"])
    rdw = find_marker(biomarkers, REQUIRED_MARKERS["RDW"])
    alp = find_marker(biomarkers, REQUIRED_MARKERS["alkaline phosphatase"])
    wbc_b = find_marker_full(biomarkers, REQUIRED_MARKERS["WBC"])

    required_raw = [albumin_b, creatinine_b, glucose_b, crp_b, lymph_pct, mcv, rdw, alp, wbc_b, age]
    if any(v is None for v in required_raw):
        return None

    # Convert to the SI units the formula actually requires
    albumin = to_albumin_gL(albumin_b["value"], albumin_b.get("unit"))
    creatinine = to_creatinine_umolL(creatinine_b["value"], creatinine_b.get("unit"))
    glucose = to_glucose_mmolL(glucose_b["value"], glucose_b.get("unit"))
    crp = to_crp_mgL(crp_b["value"], crp_b.get("unit"))
    wbc = to_wbc_thousands(wbc_b["value"], wbc_b.get("unit"))

    crp_safe = max(crp, 0.01)  # avoid ln(0)

    xb = (
        -19.907
        - 0.0336 * albumin
        + 0.0095 * creatinine
        + 0.1953 * glucose
        + 0.0954 * math.log(crp_safe)
        - 0.0120 * lymph_pct
        + 0.0268 * mcv
        + 0.3306 * rdw
        + 0.00188 * alp
        + 0.0554 * wbc
        + 0.0804 * age
    )

    gamma = 0.0076927
    M = 1 - math.exp(-1.51714 * math.exp(xb) / gamma)
    M = min(max(M, 1e-9), 1 - 1e-9)

    phenoage = 141.50 + math.log(-0.00553 * math.log(1 - M)) / 0.09165

    # Sanity check: PhenoAge should be a plausible human age. If unit
    # conversion still produced a nonsensical result, fall back rather
    # than show something misleading.
    if phenoage < 0 or phenoage > 120:
        return None

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
    if len(missing) <= 2 and missing:
        note = f"Add {' and '.join(missing)} to your next panel for your precise, validated Biological Age."
    elif missing:
        note = f"This report is missing {len(missing)} markers required for the validated formula."
    else:
        note = "Could not compute the validated formula from this report's values."
    return {
        "biological_age": fallback,
        "method": f"Estimated — {note}",
        "validated": False,
        "missing_markers": missing,
    }
