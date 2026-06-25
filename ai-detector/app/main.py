import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.payment import router as payment_router

app = FastAPI(title="Payment Detector API")

# ============================================================
# CORS
# Set ALLOWED_ORIGINS di .env.local, pisahkan dengan koma.
# Contoh: ALLOWED_ORIGINS=http://localhost:3000,https://jujurly.com
# Jika tidak diset → fallback ke localhost:3000 saja (bukan wildcard).
# ============================================================
_raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

app.include_router(payment_router)
