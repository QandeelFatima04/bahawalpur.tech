import logging
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import Base, engine
from .routers import admin, auth, companies, matches, students

settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("careerbridge")
_rate_windows: dict[str, deque] = defaultdict(deque)
RATE_LIMIT = 120
WINDOW_SECONDS = 60

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("database-initialized")
    except Exception as exc:
        # Don't kill the process — log loudly so the app still serves traffic and
        # we can see the schema problem in `docker logs`.
        logger.exception("database-init-failed: %s", exc)


# Note on schema: production deployments should run `alembic upgrade head`
# before starting uvicorn. The create_all() above is an idempotent safety net
# so local SQLite dev and tests work without running migrations by hand.


@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start = perf_counter()
    ip = request.client.host if request.client else "unknown"
    now = datetime.utcnow()
    window = _rate_windows[ip]
    threshold = now - timedelta(seconds=WINDOW_SECONDS)
    while window and window[0] < threshold:
        window.popleft()
    if len(window) >= RATE_LIMIT:
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
    window.append(now)

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    latency_ms = (perf_counter() - start) * 1000
    logger.info("request_id=%s method=%s path=%s status=%s latency_ms=%.2f", request_id, request.method, request.url.path, response.status_code, latency_ms)
    return response


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}


app.include_router(auth.router)
app.include_router(students.router)
app.include_router(companies.router)
app.include_router(matches.router)
app.include_router(admin.router)
