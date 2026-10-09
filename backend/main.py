from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import shutil
import os
import boto3

from database import SessionLocal
from models import User, Report, Biomarker
from schemas import UserCreate, LoginRequest
from gemini_service import extract_biomarkers
from biomarker_utils import calculate_status, parse_gemini_json, calculate_biological_age
from auth import create_access_token, get_current_user_id

if os.getenv("AWS_ENV") == "true":
    s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "ap-south-1"))
    S3_BUCKET = os.environ["S3_BUCKET"]
else:
    s3 = None
    S3_BUCKET = None

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
    token = create_access_token(new_user.id)
    return {
        "message": "User created",
        "user_id": new_user.id,
        "name": new_user.name,
        "access_token": token,
        "token_type": "bearer",
    }

@app.post("/login")
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or not pwd_context.verify(creds.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id)
    return {
        "message": "Login successful",
        "user_id": user.id,
        "name": user.name,
        "access_token": token,
        "token_type": "bearer",
    }

@app.post("/upload-report")
def upload_report(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if os.getenv("AWS_ENV") == "true":
        s3_key = f"reports/{user_id}/{file.filename}"
        temp_path = f"/tmp/{file.filename}"

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        s3.upload_file(
            temp_path,
            S3_BUCKET,
            s3_key,
            ExtraArgs={"ContentType": file.content_type or "application/octet-stream"}
        )

        file_path = temp_path
        stored_file_path = f"s3://{S3_BUCKET}/{s3_key}"
    else:
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        stored_file_path = file_path

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
        raw_file_path=stored_file_path,
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
def get_diet_plan(
    report_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")

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
def biomarker_info(marker_name: str, user_id: int = Depends(get_current_user_id)):
    info = get_supplement_info(marker_name)
    return {"marker_name": marker_name, **info}
