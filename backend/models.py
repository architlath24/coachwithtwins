from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    date_joined = Column(DateTime, default=datetime.utcnow)

from sqlalchemy import ForeignKey

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    raw_file_path = Column(String, nullable=True)
    biological_age_score = Column(Float, nullable=True)


class Biomarker(Base):
    __tablename__ = "biomarkers"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    marker_name = Column(String, nullable=False)
    value = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    normal_range_min = Column(Float, nullable=True)
    normal_range_max = Column(Float, nullable=True)
    status = Column(String, nullable=True)
