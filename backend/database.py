import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

if os.getenv("AWS_ENV") == "true":
    from aws_config import get_secret
    secret = get_secret(os.getenv("RDS_SECRET_ID", "fittwins/rds"))
    DATABASE_URL = (
        f"postgresql://{secret['username']}:{secret['password']}"
        f"@{secret['host']}:{secret['port']}/{secret['dbname']}"
    )
else:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://fittwins_user:fittwins_pass123@localhost/fittwins"
    )

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
