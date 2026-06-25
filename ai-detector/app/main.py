from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.payment import router as payment_router

app = FastAPI(
    title="AI Payment Detector"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://jujurlycanteens-2c7cnrhjx-ashids-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    payment_router,
    prefix="/api"
)


@app.get("/")
def root():
    return {
        "status":"running"
    }