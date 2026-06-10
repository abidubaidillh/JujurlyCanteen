// src/app/api/read-image/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  // Mengambil nama file dari parameter URL (contoh: ?file=gambar.jpg)
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('file');

  if (!filename) {
    return NextResponse.json({ error: 'Nama file tidak diberikan' }, { status: 400 });
  }

  // Path ke folder output AI Detector kamu
  // Catatan: Gunakan double backslash (\\) untuk path Windows di JavaScript
  const folderPath = 'C:\\Users\\wiraj\\Downloads\\Project-Capstone\\ai-detector\\output';
  const filePath = path.join(folderPath, filename);

  try {
    // Membaca file gambar sebagai buffer
    const imageBuffer = fs.readFileSync(filePath);
    
    // Menentukan MIME type dasar
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';

    // Mengirimkan gambar ke frontend
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': mimeType,
      },
    });
  } catch (error) {
    console.error("Gagal membaca file lokal:", error);
    return NextResponse.json({ error: 'File tidak ditemukan atau tidak bisa dibaca' }, { status: 404 });
  }
}