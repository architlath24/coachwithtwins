const CATEGORIES = [
  { name: "Iron Studies", keywords: ["iron", "ferritin", "tibc", "transferrin"] },
  { name: "Lipid Profile", keywords: ["cholesterol", "hdl", "ldl", "triglyceride", "lipoprotein"] },
  { name: "Liver Function", keywords: ["bilirubin", "alt", "ast", "alkaline phosphatase", "ggt", "albumin", "globulin", "aminotransferase", "transferase"] },
  { name: "Kidney Function", keywords: ["creatinine", "bun", "urea", "egfr", "glomerular"] },
  { name: "Blood Count (CBC)", keywords: ["hemoglobin", "hematocrit", "rbc", "wbc", "platelet", "mch", "mcv", "rdw", "white blood", "red cell", "neutrophil", "lymphocyte", "monocyte", "eosinophil", "basophil"] },
  { name: "Thyroid", keywords: ["tsh", "t3", "t4", "thyroid", "thyroxine", "triiodothyronine"] },
  { name: "Vitamins & Minerals", keywords: ["vitamin", "calcium", "b12", "folate"] },
  { name: "Glucose & Metabolic", keywords: ["glucose", "hba1c", "glycated", "amylase", "insulin"] },
]

export function categorize(biomarkers) {
  const groups = {}
  const other = []
  for (const b of biomarkers) {
    const name = (b.marker_name || "").toLowerCase()
    const match = CATEGORIES.find(c => c.keywords.some(k => name.includes(k)))
    if (match) {
      if (!groups[match.name]) groups[match.name] = []
      groups[match.name].push(b)
    } else {
      other.push(b)
    }
  }
  const ordered = CATEGORIES.map(c => c.name).filter(n => groups[n]).map(n => ({ name: n, items: groups[n] }))
  if (other.length) ordered.push({ name: "Other", items: other })
  return ordered
}
