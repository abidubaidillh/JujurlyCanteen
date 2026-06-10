from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.payment import router as payment_router

app = FastAPI(title="Payment Detector API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payment_router)