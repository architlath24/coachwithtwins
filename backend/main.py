from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import shutil
import os

from database import SessionLocal
from models import User, Report, Biomarker
from schemas import UserCreate
from gemini_service import extract_biomarkers
from biomarker_utils import calculate_status, parse_gemini_json, calculate_biological_age

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "FitTwins backend is alive"}

@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = pwd_context.hash(user.password)
    new_user = User(
        name=user.name, email=user.email, password=hashed_password,
        height=user.height, weight=user.weight, age=user.age,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "user_id": new_user.id}

@app.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"message": "Login successful", "user_id": user.id, "name": user.name}

@app.post("/upload-report")
def upload_report(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    raw_result = extract_biomarkers(file_path, file.content_type)
    biomarker_list = parse_gemini_json(raw_result)

    saved_biomarkers = []
    for item in biomarker_list:
        status = calculate_status(item.get("value"), item.get("normal_range_min"), item.get("normal_range_max"))
        item["status"] = status
        saved_biomarkers.append(item)

    age_result = calculate_biological_age(user.age, saved_biomarkers)

    new_report = Report(
        user_id=user_id,
        raw_file_path=file_path,
        biological_age_score=age_result["biological_age"],
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    for item in saved_biomarkers:
        bio = Biomarker(
            report_id=new_report.id,
            marker_name=item.get("marker_name"),
            value=item.get("value"),
            unit=item.get("unit"),
            normal_range_min=item.get("normal_range_min"),
            normal_range_max=item.get("normal_range_max"),
            status=item.get("status"),
        )
        db.add(bio)
    db.commit()

    return {
        "report_id": new_report.id,
        "user_id": user_id,
        "chronological_age": user.age,
        "biological_age": age_result["biological_age"],
        "method": age_result["method"],
        "biomarkers": saved_biomarkers,
    }

from gemini_service import generate_diet_plan
from supplement_guide import get_supplement_info

@app.get("/diet-plan/{report_id}")
def get_diet_plan(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    user = db.query(User).filter(User.id == report.user_id).first()
    biomarkers = db.query(Biomarker).filter(Biomarker.report_id == report_id).all()

    biomarker_list = [
        {
            "marker_name": b.marker_name,
            "value": b.value,
            "unit": b.unit,
            "normal_range_min": b.normal_range_min,
            "normal_range_max": b.normal_range_max,
            "status": b.status,
        }
        for b in biomarkers
    ]

    diet_plan_raw = generate_diet_plan(biomarker_list, age=user.age, height=user.height, weight=user.weight, name=user.name)
    diet_plan = parse_gemini_json(diet_plan_raw)

    return {
        "report_id": report_id,
        "biological_age": report.biological_age_score,
        "diet_plan": diet_plan,
    }


@app.get("/biomarker-info/{marker_name}")
def biomarker_info(marker_name: str):
    info = get_supplement_info(marker_name)
    return {"marker_name": marker_name, **info}
