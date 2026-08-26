SUPPLEMENT_GUIDE = {
    "vitamin b12": {"supplement": "Methylcobalamin (B12)", "typical_dose": "1000 mcg/day, short-term"},
    "vitamin d": {"supplement": "Vitamin D3", "typical_dose": "2000-4000 IU/day with a fat-containing meal"},
    "hemoglobin": {"supplement": "Iron (consult before supplementing)", "typical_dose": "Only after dietary approach + retest"},
    "ferritin": {"supplement": "Iron Bisglycinate", "typical_dose": "Only if diet + retest still shows low levels"},
    "serum iron": {"supplement": "Iron Bisglycinate", "typical_dose": "Only if diet + retest still shows low levels"},
    "hdl": {"supplement": "Omega-3 (Fish Oil)", "typical_dose": "1-2g/day, alongside diet changes"},
    "ldl": {"supplement": "Plant Sterols / Soluble Fiber supplement", "typical_dose": "Diet-first approach recommended"},
    "triglycerides": {"supplement": "Omega-3 (Fish Oil)", "typical_dose": "1-2g/day, alongside diet changes"},
    "tsh": {"supplement": "Consult a doctor", "typical_dose": "Thyroid values need clinical follow-up, not self-supplementing"},
}

def get_supplement_info(marker_name):
    if not marker_name:
        return None
    key = marker_name.lower()
    for k, v in SUPPLEMENT_GUIDE.items():
        if k in key:
            return v
    return {"supplement": "Consult a healthcare provider", "typical_dose": "No standard OTC supplement for this marker"}
