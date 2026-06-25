import os
from pathlib import Path
from dotenv import load_dotenv

# ============================================================
# LOAD ENV
# Coba .env.local dari parent folder (JujurlyCanteen-main),
# fallback ke .env di folder yang sama dengan run.py
# ============================================================
_parent_env = Path(__file__).parent.parent / ".env.local"
_local_env  = Path(__file__).parent / ".env"

if _parent_env.exists():
    load_dotenv(dotenv_path=_parent_env)
    print(f"[ENV] Loaded from {_parent_env}")
elif _local_env.exists():
    load_dotenv(dotenv_path=_local_env)
    print(f"[ENV] Loaded from {_local_env}")
else:
    load_dotenv()
    print("[ENV] Loaded from default .env")

# Mapping: NEXT_PUBLIC_SUPABASE_URL → SUPABASE_URL (untuk supabase_service.py)
if not os.environ.get("SUPABASE_URL"):
    fallback = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    if fallback:
        os.environ["SUPABASE_URL"] = fallback
        print("[ENV] SUPABASE_URL mapped from NEXT_PUBLIC_SUPABASE_URL")

import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting FastAPI on 0.0.0.0:{port} ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
