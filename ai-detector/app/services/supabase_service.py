# app/services/supabase_service.py
import os
from supabase import create_client, Client

# Ambil URL dan Key dari environment variables (atau hardcode sementara untuk testing)
SUPABASE_URL = "https://wwovpyyynxpyrvljadtk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3b3ZweXl5bnhweXJ2bGphZHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTYwNjAsImV4cCI6MjA5MTgzMjA2MH0.17vqZxZg6zjM_gVmCdSSBl30mJmHNAkHJummlQU8YOI"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_and_insert_db(file_path: str, file_name: str):
    try:
        # 1. Upload ke Storage
        with open(file_path, 'rb') as f:
            supabase.storage.from_("bukti-transfer").upload(f"public/{file_name}", f)
        
        # 2. Insert ke Database (Memicu Realtime di Next.js)
        data = supabase.table("bukti_pembayaran").insert({
            "file_gambar": f"public/{file_name}",
            "status": "pending" 
        }).execute()
        
        return True
    except Exception as e:
        print(f"Gagal upload ke Supabase: {e}")
        return False