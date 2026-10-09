import os

from google import genai
from pypdf import PdfReader


if os.getenv("AWS_ENV") == "true":
    from aws_config import get_secret

    GEMINI_API_KEY = get_secret(
        os.getenv("GEMINI_SECRET_ID", "fittwins/gemini")
    )["GEMINI_API_KEY"]
else:
    from dotenv import load_dotenv

    load_dotenv()
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


client = genai.Client(api_key=GEMINI_API_KEY)


def extract_pdf_text(file_path: str) -> str:
    """Extract the text layer from a PDF."""
    reader = PdfReader(file_path)

    pages = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
            if text.strip():
                pages.append(text.strip())
        except Exception:
            continue

    return "\n\n".join(pages)


def extract_biomarkers(file_path: str, mime_type: str):
    """
    Extract biomarkers from a blood-report PDF.

    Prefer local PDF text extraction because complex laboratory PDFs
    can be difficult for multimodal parsing. Fall back to Gemini's
    native PDF processing if the extracted text is insufficient.
    """

    extracted_text = ""

    if mime_type == "application/pdf" or file_path.lower().endswith(".pdf"):
        extracted_text = extract_pdf_text(file_path)

    # Primary path: local PDF text -> Gemini
    if len(extracted_text.strip()) >= 500:
        prompt = f"""
You are analyzing the text extracted from a blood laboratory report.

Extract EVERY actual laboratory biomarker/result present in the report.

For each biomarker return:
- marker_name
- value
- unit
- normal_range_min
- normal_range_max

Rules:
1. Extract actual test results only.
2. Do not invent values.
3. Preserve the laboratory's marker names where possible.
4. Convert numeric values to JSON numbers.
5. If a reference range has only one boundary, use null for the missing boundary.
6. Ignore clinical-significance/explanation paragraphs that are not test results.
7. Return ONLY a valid JSON array.
8. Do not use markdown fences.

Example:
[
  {{
    "marker_name": "Vitamin B12",
    "value": 208,
    "unit": "pg/mL",
    "normal_range_min": 187,
    "normal_range_max": 883
  }}
]

REPORT TEXT:
{extracted_text}
"""

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
        )

        return response.text

    # Fallback: let Gemini process the original PDF directly
    uploaded_file = client.files.upload(file=file_path)

    prompt = """
You are analyzing a blood test report.

Extract EVERY actual laboratory biomarker/result you can find.

For each biomarker return:
marker_name, value, unit, normal_range_min, normal_range_max.

Rules:
- Do not invent values.
- Extract actual laboratory results only.
- Ignore explanatory clinical-significance text.
- Return ONLY a valid JSON array.
- No markdown fences.
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[uploaded_file, prompt],
    )

    return response.text


def generate_diet_plan(
    biomarkers,
    age=None,
    height=None,
    weight=None,
    name=None,
):
    deficiencies = [b for b in biomarkers if b.get("status") == "red"]

    if not deficiencies:
        deficiency_text = (
            "No significant deficiencies detected — all markers are within normal range."
        )
    else:
        lines = [
            f"- {d.get('marker_name')}: {d.get('value')} {d.get('unit')} "
            f"(normal: {d.get('normal_range_min')}-{d.get('normal_range_max')})"
            for d in deficiencies
        ]
        deficiency_text = "\n".join(lines)

    profile_text = (
        f"Name: {name or 'there'}, Age: {age or 'unknown'}, "
        f"Height: {height or 'unknown'} cm, Weight: {weight or 'unknown'} kg"
    )

    prompt = f"""
You are a nutrition expert speaking directly and warmly to your client.

Profile:
{profile_text}

Deficiencies:
{deficiency_text}

Return ONLY valid JSON in exactly this shape:

{{
  "summary": "A short, warm, personal 2-3 sentence summary.",
  "vegetarian": [
    {{"deficiency": "Vitamin B12", "foods": ["food 1"], "tip": "tip"}}
  ],
  "non_vegetarian": [
    {{"deficiency": "Vitamin B12", "foods": ["food 1"], "tip": "tip"}}
  ],
  "vegan": [
    {{"deficiency": "Vitamin B12", "foods": ["food 1"], "tip": "tip"}}
  ],
  "closing": "A short, encouraging closing sentence."
}}
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
    )

    return response.text
