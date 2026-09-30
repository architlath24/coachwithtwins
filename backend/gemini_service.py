import os
from google import genai

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


def extract_biomarkers(file_path: str, mime_type: str):
    uploaded_file = client.files.upload(file=file_path)
    prompt = """
    You are analyzing a blood test report. Extract every biomarker you can find.
    For each one, return: marker_name, value, unit, normal_range_min, normal_range_max.
    Respond ONLY with a valid JSON array, no extra text.
    """
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[uploaded_file, prompt]
    )
    return response.text


def generate_diet_plan(biomarkers, age=None, height=None, weight=None, name=None):
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
    Profile: {profile_text}
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
        contents=prompt
    )
    return response.text
