import json
import logging
import logging.handlers
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
_LOG_DIR.mkdir(parents=True, exist_ok=True)
_LOG_PATH = _LOG_DIR / "openai.log"

_logger = logging.getLogger("careerbridge.openai")
if not any(isinstance(h, logging.handlers.RotatingFileHandler) and getattr(h, "baseFilename", None) == str(_LOG_PATH)
           for h in _logger.handlers):
    handler = logging.handlers.RotatingFileHandler(
        _LOG_PATH, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(handler)
    _logger.setLevel(logging.INFO)
    _logger.propagate = False


def _safe(obj: Any) -> Any:
    try:
        json.dumps(obj)
        return obj
    except Exception:
        return repr(obj)


def log_openai_call(
    call_type: str,
    request: dict,
    response: Any = None,
    error: str | None = None,
    tokens: int | None = None,
) -> None:
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "call_type": call_type,
        "request": _safe(request),
        "response": _safe(response),
        "tokens": tokens,
        "error": error,
    }
    _logger.info(json.dumps(entry, ensure_ascii=False))
