"""Test bootstrap: forces SQLite + fresh schema so tests never touch Postgres.

Sets DATABASE_URL before any app module is imported so the cached settings pick
up the test URL. Each test session gets a clean careerbridge_test.db file, and
tables are created via Base.metadata.create_all rather than running Alembic
migrations (fast and keeps tests independent from migration state).
"""
from __future__ import annotations

import os
import pathlib

TEST_DB = pathlib.Path(__file__).parent / "careerbridge_test.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")

from app.database import Base, engine  # noqa: E402
from app import models  # noqa: E402,F401

Base.metadata.create_all(bind=engine)
