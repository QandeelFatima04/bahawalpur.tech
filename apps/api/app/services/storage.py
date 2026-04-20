from __future__ import annotations

import io
import logging
import os
import pathlib
from uuid import uuid4

import boto3

from ..config import get_settings

settings = get_settings()
logger = logging.getLogger("careerbridge.storage")

LOCAL_DIR = pathlib.Path(os.getenv("LOCAL_UPLOAD_DIR", "/tmp/careerbridge-uploads"))


def _write_local(contents: bytes, key: str) -> str:
    target = LOCAL_DIR / key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(contents)
    return key


def upload_resume(contents: bytes, filename: str, content_type: str) -> str:
    key = f"resumes/{uuid4()}-{filename}"

    # In dev, always write to local disk — no AWS credentials needed.
    if settings.env == "dev":
        _write_local(contents, key)
        return key

    # In non-dev, try S3. If boto3 can't find credentials or the upload fails,
    # fall back to local storage so the app still works (e.g. self-hosted).
    try:
        client = boto3.client("s3", region_name=settings.aws_region)
        client.upload_fileobj(
            io.BytesIO(contents),
            settings.s3_bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return key
    except Exception as exc:  # noqa: BLE001
        logger.warning("S3 upload failed (%s); falling back to local disk.", exc)
        _write_local(contents, key)
        return key
