# app/services/supabase_service.py

import os
import time
import mimetypes
from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()


SUPABASE_URL = ( os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL"))

SUPABASE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase env belum dikonfigurasi")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

_BUCKET = "bukti-transfer"


def _public_url(storage_path: str) -> str:
    """Buat public URL dari Supabase Storage."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{_BUCKET}/{storage_path}"


# ============================================================
# MAIN FUNCTION
# ============================================================

def upload_and_insert_db(file_path: str, file_name: str) -> dict:
    MAX_RETRIES = 3
    RETRY_DELAY = 1

    storage_path = file_name
    print(f"[SUPABASE] Upload → {storage_path}")

    # ====================================================
    # 1. DELETE FILE (ANTI DUPLICATE) — best-effort
    # ====================================================
    try:
        supabase.storage.from_(_BUCKET).remove([storage_path])
        print("[SUPABASE] Old file removed (if existed)")
    except Exception as e:
        print(f"[SUPABASE] Remove skip: {e}")

    # ====================================================
    # 2. UPLOAD FILE — dengan retry
    # ====================================================
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with open(file_path, "rb") as f:
                supabase.storage.from_(_BUCKET).upload(
                    storage_path,
                    f,
                    {"content-type": "image/jpeg"}
                )
            print(f"[SUPABASE] Upload success (attempt {attempt})")
            break
        except Exception as e:
            if attempt < MAX_RETRIES:
                print(f"[SUPABASE RETRY] Upload attempt {attempt}/{MAX_RETRIES}: {e}")
                time.sleep(RETRY_DELAY)
            else:
                print(f"[SUPABASE ERROR] Upload gagal setelah {MAX_RETRIES}x: {e}")
                return {"success": False, "file_path": None, "data": None,
                        "public_url": None, "error": str(e)}

    # ====================================================
    # 3. INSERT DATABASE — dengan retry
    # ====================================================
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            db_res = supabase.table("bukti_pembayaran").insert({
                "file_gambar": storage_path,
                "status": "invalid"
            }).execute()

            data = db_res.data if hasattr(db_res, "data") else None
            print(f"[SUPABASE] Insert success (attempt {attempt}) → {data}")

            return {
                "success": True,
                "file_path": storage_path,
                "public_url": _public_url(storage_path),
                "data": data,
                "error": None,
            }
        except Exception as e:
            if attempt < MAX_RETRIES:
                print(f"[SUPABASE RETRY] Insert attempt {attempt}/{MAX_RETRIES}: {e}")
                time.sleep(RETRY_DELAY)
            else:
                print(f"[SUPABASE ERROR] Insert gagal setelah {MAX_RETRIES}x: {e}")
                return {"success": False, "file_path": None, "data": None,
                        "public_url": None, "error": str(e)}
