// src/app/api/voice/route.ts
import { NextResponse } from 'next/server';

// ฟังก์ชัน POST สำหรับจัดการคำขอสร้างเสียง
export async function POST(req: Request) {
  // ดึงข้อมูล text และ speaker จาก body ของคำขอ
  const { text, speaker } = await req.json();

  try {
    // เรียก Botnoi Voice API เพื่อสร้างไฟล์เสียง
    const res = await fetch("https://api-voice.botnoi.ai/openapi/v1/generate_audio", {
      method: 'POST', // ใช้วิธีการ POST
      headers: {
        'Content-Type': 'application/json', // กำหนด Content-Type เป็น JSON
        'Botnoi-Token': process.env.BOTNOI_API_KEY!, // ใส่ Botnoi API Key จาก Environment Variables
      },
      body: JSON.stringify({ // แปลงข้อมูลเป็น JSON string
        text, // ข้อความที่จะแปลงเป็นเสียง
        speaker: speaker || "1", // รหัสผู้พูด (ค่าเริ่มต้นคือ "1" ถ้าไม่ได้ระบุ)
        volume: "1", // ระดับเสียง
        speed: 1, // ความเร็วในการพูด
        type_media: "mp3", // รูปแบบไฟล์เสียงที่ต้องการ
        save_file: "true", // บันทึกไฟล์ที่ Botnoi
        language: "th", // ภาษาสคริปต์ (ไทย)
      }),
    });

    // ตรวจสอบสถานะการตอบกลับ
    if (!res.ok) {
      const errorData = await res.json();
      console.error("Botnoi API Error:", errorData);
      // ส่งข้อความข้อผิดพลาดกลับไปยังไคลเอนต์
      return NextResponse.json({ message: errorData.message || 'Failed to generate audio from Botnoi API' }, { status: res.status });
    }

    const data = await res.json(); // แปลงข้อมูลที่ได้จากการตอบกลับเป็น JSON
    // ส่งข้อมูลที่ได้รับจาก Botnoi กลับไปยังไคลเอนต์
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/voice:", error);
    // จัดการข้อผิดพลาดที่เกิดขึ้นในระหว่างการประมวลผล
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
