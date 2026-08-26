import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def extract_biomarkers(file_path: str, mime_type: str):
    uploaded_file = client.files.upload(file=file_path)
    prompt = """
    You are analyzing a blood test report. Extract every biomarker you can find.
    For each one, return: marker_name, value, unit, normal_range_min, normal_range_max.
    Respond ONLY with a valid JSON array, no extra text. Example format:
    [{"marker_name": "Vitamin B12", "value": 180, "unit": "pg/mL", "normal_range_min": 200, "normal_range_max": 900}]
    """
    response = client.models.generate_content(model="gemini-3.6-flash", contents=[uploaded_file, prompt])
    return response.text


def generate_diet_plan(biomarkers, age=None, height=None, weight=None, name=None):
    deficiencies = [b for b in biomarkers if b.get("status") == "red"]

    if not deficiencies:
        deficiency_text = "No significant deficiencies detected — all markers are within normal range."
    else:
        lines = [f"- {d.get('marker_name')}: {d.get('value')} {d.get('unit')} (normal: {d.get('normal_range_min')}-{d.get('normal_range_max')})" for d in deficiencies]
        deficiency_text = "\n".join(lines)

    profile_text = f"Name: {name or 'there'}, Age: {age or 'unknown'}, Height: {height or 'unknown'} cm, Weight: {weight or 'unknown'} kg"

    prompt = f"""
    You are a nutrition expert speaking directly and warmly to your client. A person has this profile and blood deficiencies.

    Profile: {profile_text}
    Deficiencies:
    {deficiency_text}

    Return ONLY valid JSON, no markdown fences, no extra text, in exactly this shape:
    {{
      "summary": "A short, warm, personal 2-3 sentence summary addressing the person by name, naming their key deficiencies in plain language and reassuring them this is fixable.",
      "vegetarian": [
        {{"deficiency": "Vitamin B12", "foods": ["food 1 with quantity/frequency", "food 2 ..."], "tip": "one practical absorption or timing tip"}}
      ],
      "non_vegetarian": [
        {{"deficiency": "Vitamin B12", "foods": ["..."], "tip": "..."}}
      ],
      "vegan": [
        {{"deficiency": "Vitamin B12", "foods": ["..."], "tip": "..."}}
      ],
      "closing": "A short, encouraging closing sentence."
    }}

    Include one object per deficiency in EACH of the three diet-type arrays (vegetarian, non_vegetarian, vegan), adapted appropriately
    (e.g. vegan B12 sources are fortified foods, not fish). If there are no deficiencies, return empty arrays and an encouraging summary/closing only.
    """

    response = client.models.generate_content(model="gemini-3.6-flash", contents=prompt)
    return response.text
