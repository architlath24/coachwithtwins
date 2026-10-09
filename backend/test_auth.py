"""
Auth / authorization tests for the FitTwins backend.

These prove the two security fixes:
  1. The report routes require a valid JWT (no anonymous access).
  2. A user cannot read another user's report (IDOR is closed).

They use an in-memory SQLite DB via a dependency override, so no AWS,
no Postgres, and no Gemini network calls are needed.
"""
import os

os.environ["JWT_SECRET"] = "test-secret-do-not-use-in-prod"
os.environ["GEMINI_API_KEY"] = "dummy"
os.environ.pop("AWS_ENV", None)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import main
import models
from database import Base
from auth import create_access_token, get_current_user_id
from fastapi import HTTPException

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def _override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


main.app.dependency_overrides[main.get_db] = _override_get_db
client = TestClient(main.app)


def _signup(email, name="T", password="pw123456"):
    r = client.post("/signup", json={"name": name, "email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def test_token_roundtrip():
    tok = create_access_token(42)
    assert get_current_user_id(f"Bearer {tok}") == 42


def test_bad_token_rejected():
    for bad in [None, "", "garbage", "Bearer not.a.jwt"]:
        try:
            get_current_user_id(bad)
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 401


def test_signup_returns_token_and_login_works():
    data = _signup("alice@example.com")
    assert data["access_token"]
    r = client.post("/login", json={"email": "alice@example.com", "password": "pw123456"})
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_wrong_password_401():
    _signup("bob@example.com")
    r = client.post("/login", json={"email": "bob@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_biomarker_info_requires_auth():
    assert client.get("/biomarker-info/vitamin%20d").status_code == 401
    tok = _signup("carol@example.com")["access_token"]
    r = client.get("/biomarker-info/vitamin%20d", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200


def test_upload_requires_auth():
    # No token -> rejected before any file/Gemini processing.
    r = client.post("/upload-report", files={"file": ("x.pdf", b"%PDF-", "application/pdf")})
    assert r.status_code == 401


def test_diet_plan_idor_blocked():
    owner = _signup("owner@example.com")
    attacker = _signup("attacker@example.com")

    # Insert a report owned by `owner` directly.
    db = TestingSession()
    rep = models.Report(user_id=owner["user_id"], raw_file_path="x", biological_age_score=30.0)
    db.add(rep)
    db.commit()
    db.refresh(rep)
    report_id = rep.id
    db.close()

    # Attacker is authenticated but does NOT own the report -> 403.
    r = client.get(
        f"/diet-plan/{report_id}",
        headers={"Authorization": f"Bearer {attacker['access_token']}"},
    )
    assert r.status_code == 403

    # No token at all -> 401.
    assert client.get(f"/diet-plan/{report_id}").status_code == 401


def test_diet_plan_owner_allowed(monkeypatch):
    owner = _signup("owner2@example.com")
    db = TestingSession()
    rep = models.Report(user_id=owner["user_id"], raw_file_path="x", biological_age_score=30.0)
    db.add(rep)
    db.commit()
    db.refresh(rep)
    report_id = rep.id
    db.close()

    # Avoid a real Gemini call for the owner's success path.
    monkeypatch.setattr(
        main,
        "generate_diet_plan",
        lambda *a, **k: '{"summary":"ok","vegetarian":[],"non_vegetarian":[],"vegan":[],"closing":"bye"}',
    )

    r = client.get(
        f"/diet-plan/{report_id}",
        headers={"Authorization": f"Bearer {owner['access_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["report_id"] == report_id
