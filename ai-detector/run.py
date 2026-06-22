import os
from dotenv import load_dotenv

# Load .env sebelum modul lain diimport agar env vars tersedia
# saat supabase_service.py dieksekusi di production lokal
load_dotenv()

import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting FastAPI on 0.0.0.0:{port} ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
