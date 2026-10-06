import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

if os.getenv("AWS_ENV") == "true":
    from sqlalchemy.engine import URL
    from aws_config import get_secret

    secret = get_secret(os.getenv("RDS_SECRET_ID", "fittwins/rds"))

    DATABASE_URL = URL.create(
        "postgresql+psycopg2",
        username=secret["username"],
        password=secret["password"],
        host=secret["host"],
        port=int(secret["port"]),
        database=secret["dbname"],
    )
else:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://fittwins_user:fittwins_pass123@localhost/fittwins"
    )

engine = create_engine(
    DATABASE_URL,
    connect_args={"sslmode": "require"} if os.getenv("AWS_ENV") == "true" else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
