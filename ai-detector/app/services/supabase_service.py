# app/services/supabase_service.py

import os
import time
from supabase import create_client, Client

# ============================================================
# INIT SUPABASE CLIENT (TETAP SAMA)
# ============================================================

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ============================================================
# MAIN FUNCTION
# ============================================================

def upload_and_insert_db(file_path: str, file_name: str) -> dict:
    MAX_RETRIES = 3
    RETRY_DELAY = 1  # detik

    storage_path = file_name
    print(f"[SUPABASE] Upload → {storage_path}")

    # ====================================================
    # 1. DELETE FILE (ANTI DUPLICATE) — best-effort, no retry
    # ====================================================
    try:
        supabase.storage.from_("bukti-transfer").remove([storage_path])
        print("[SUPABASE] Old file removed (if existed)")
    except Exception as e:
        print(f"[SUPABASE] Remove skip: {e}")

    # ====================================================
    # 2. UPLOAD FILE — dengan retry
    # ====================================================
    upload_ok = False
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with open(file_path, "rb") as f:
                supabase.storage.from_("bukti-transfer").upload(
                    storage_path,
                    f,
                    {"content-type": "image/jpeg"}
                )
            print(f"[SUPABASE] Upload success (attempt {attempt})")
            upload_ok = True
            break
        except Exception as e:
            if attempt < MAX_RETRIES:
                print(f"[SUPABASE RETRY] Gagal mengunggah (attempt {attempt}/{MAX_RETRIES}), mencoba kembali dalam {RETRY_DELAY} detik... Error: {e}")
                time.sleep(RETRY_DELAY)
            else:
                print(f"[SUPABASE ERROR] Upload gagal setelah {MAX_RETRIES} percobaan: {e}")
                return {"success": False, "file_path": None, "data": None, "error": str(e)}

    if not upload_ok:
        return {"success": False, "file_path": None, "data": None, "error": "Upload gagal"}

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
                "data": data,
                "error": None
            }
        except Exception as e:
            if attempt < MAX_RETRIES:
                print(f"[SUPABASE RETRY] Gagal insert DB (attempt {attempt}/{MAX_RETRIES}), mencoba kembali dalam {RETRY_DELAY} detik... Error: {e}")
                time.sleep(RETRY_DELAY)
            else:
                print(f"[SUPABASE ERROR] Insert DB gagal setelah {MAX_RETRIES} percobaan: {e}")
                return {"success": False, "file_path": None, "data": None, "error": str(e)}