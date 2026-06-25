import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.payment import router as payment_router

app = FastAPI(title="Payment Detector API")

# ============================================================
# CORS
# Set ALLOWED_ORIGINS di environment variable, pisahkan dengan koma.
# Contoh: ALLOWED_ORIGINS=http://localhost:3000,https://jujurly-canteen.vercel.app
# Jika tidak diset → fallback ke wildcard "*" agar tidak memblokir apapun.
# ============================================================
origins_env = os.environ.get("ALLOWED_ORIGINS", "")
origins_list = [origin.strip() for origin in origins_env.split(",") if origin.strip()] if origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payment_router)
