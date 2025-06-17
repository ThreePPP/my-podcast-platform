// src/app/api/generate-podcast/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises"; // ใช้ fs.promises สำหรับการทำงานแบบ async/await
import { randomUUID } from "crypto"; // สำหรับสร้างชื่อไฟล์ที่ไม่ซ้ำกัน

// ฟังก์ชัน POST สำหรับจัดการคำขอสร้าง Podcast ทั้งหมด
export async function POST(req: Request) {
  // ดึงหัวข้อ (topic) และผู้พูด (speaker) จาก body ของคำขอ
  const { topic, speaker } = await req.json();

  try {
    // STEP 1: สร้างสคริปต์จาก Gemini API
    const llmRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY, // ดึง Gemini API Key จาก Environment Variables
      {
        method: "POST", // ใช้วิธีการ POST
        headers: { "Content-Type": "application/json" }, // กำหนด Content-Type เป็น JSON
        body: JSON.stringify({ // แปลงข้อมูลเป็น JSON string
          contents: [
            {
              parts: [
                {
                  // Prompt ให้ Gemini เขียนสคริปต์ Podcast ภาษาไทย
                  text: `ช่วยเขียนสคริปต์ podcast ภาษาไทย หัวข้อ "${topic}" ความยาวประมาณ 1 นาที โดยเริ่มด้วยเนื้อหาหลักทันที ใช้ภาษาที่เป็นกันเอง เข้าใจง่าย เหมือนคุยกับเพื่อนสนิท ห้ามใส่การแนะนำตัว บทนำ การชักชวน คำสั่ง หรือคำสรุปที่ชวนให้ทำตาม ห้ามใส่ซาวด์เอฟเฟกต์ การกระทำ เช่น เสียงหายใจ เสียงหัวเราะ หรือคำบรรยายที่ไม่ใช่บทพูด ห้ามใส่หัวข้อสคริปต์หรือคำว่า "สคริปต์" ในผลลัพธ์ สคริปต์ต้องมีเฉพาะบทพูดที่เป็นเนื้อหาหลักเท่านั้น`,
                },
              ],
            },
          ],
        }),
      }
    );

    // ตรวจสอบสถานะการตอบกลับจาก Gemini API หากไม่สำเร็จ
    if (!llmRes.ok) {
      let errorData;
      try {
        // พยายามอ่าน response เป็น JSON เพื่อดึงข้อความผิดพลาด
        errorData = await llmRes.json();
      } catch (jsonError) {
        // หาก response ไม่ใช่ JSON ให้บันทึก raw text
        const rawErrorText = await llmRes.text();
        console.error("Gemini API: Non-JSON error response body:", rawErrorText);
        return NextResponse.json({ message: 'ไม่สามารถสร้างสคริปต์จาก LLM ได้: การตอบกลับไม่ใช่ JSON' }, { status: llmRes.status });
      }
      console.error("Gemini API Error:", errorData);
      return NextResponse.json({ message: errorData.error?.message || 'ไม่สามารถสร้างสคริปต์จาก LLM ได้' }, { status: llmRes.status });
    }

    const llmData = await llmRes.json(); // แปลงข้อมูลที่ได้จากการตอบกลับเป็น JSON
    // ดึงข้อความสคริปต์จากผลลัพธ์ หรือใช้ค่าเริ่มต้นหากไม่พบ
    const script = llmData.candidates?.[0]?.content?.parts?.[0]?.text || "ไม่สามารถสร้างสคริปต์ได้";

    // STEP 2: ส่งสคริปต์ไป Botnoi Voice API เพื่อแปลงเป็นเสียง
    const botnoiRes = await fetch(
      "https://api-voice.botnoi.ai/openapi/v1/generate_audio",
      {
        method: "POST", // ใช้วิธีการ POST
        headers: {
          "Content-Type": "application/json", // กำหนด Content-Type เป็น JSON
          "Botnoi-Token": process.env.BOTNOI_API_KEY!, // ดึง Botnoi API Key จาก Environment Variables
        },
        body: JSON.stringify({ // แปลงข้อมูลเป็น JSON string
          text: script, // สคริปต์ที่ได้จาก Gemini
          speaker: speaker || "1", // รหัสผู้พูด
          volume: "1", // ระดับเสียง
          speed: 1.25, // ความเร็ว
          type_media: "mp3", // รูปแบบไฟล์ MP3
          save_file: "true", // บันทึกไฟล์บนเซิร์ฟเวอร์ Botnoi
          language: "th", // ภาษาไทย
        }),
      }
    );

    let audioUrl: string;
    let audioBuffer: ArrayBuffer;

    // ดึง Content-Type จาก header ของการตอบกลับ Botnoi
    const contentType = botnoiRes.headers.get('content-type');
    console.log("Botnoi Response Content-Type:", contentType);

    // จัดการกรณีที่ Botnoi คืนค่าสถานะไม่สำเร็จ (เช่น 4xx, 5xx) หรือข้อความผิดพลาด JSON
    if (!botnoiRes.ok) {
      let errorData;
      try {
        // พยายามอ่าน response เป็น JSON เพื่อดึงข้อความผิดพลาด
        errorData = await botnoiRes.json();
      } catch (jsonError) {
        // หาก response ไม่ใช่ JSON (เช่น ไฟล์ RIFF ที่คุณเจอ)
        // ให้อ่านเป็น text เพื่อบันทึกและส่งข้อความผิดพลาดที่พอจะเข้าใจได้
        const errorText = await botnoiRes.text();
        console.error("Botnoi Voice API: Non-JSON error response body:", errorText);
        return NextResponse.json({ message: `ข้อผิดพลาดจาก Botnoi API: ${errorText.substring(0, 100)}... (ไม่ใช่ JSON)` }, { status: botnoiRes.status });
      }
      console.error("Botnoi Voice API Error:", errorData);
      return NextResponse.json({ message: errorData.message || 'ไม่สามารถสร้างเสียงจาก Botnoi API ได้' }, { status: botnoiRes.status });
    }

    // หาก response สถานะ OK ให้ตรวจสอบ Content-Type เพื่อประมวลผล
    if (contentType && contentType.includes('application/json')) {
      // หากเป็น JSON ให้คาดหวังว่าจะมี audio_url
      const voiceData = await botnoiRes.json();
      audioUrl = voiceData.audio_url;

      if (!audioUrl) {
        console.error("Botnoi API ไม่ได้คืนค่า audio_url แม้สถานะจะสำเร็จ:", voiceData);
        return NextResponse.json({ message: 'Botnoi API ไม่ได้คืนค่า audio URL แม้สถานะจะสำเร็จ' }, { status: 500 });
      }

      // STEP 3: ดาวน์โหลด mp3 จาก audioUrl ที่ Botnoi ให้มา
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
          console.error("ไม่สามารถดาวน์โหลดไฟล์เสียงจาก Botnoi URL ได้:", audioUrl, audioResponse.statusText);
          return NextResponse.json({ message: 'ไม่สามารถดาวน์โหลดไฟล์เสียงจาก URL ที่ Botnoi ให้มา' }, { status: audioResponse.status });
      }
      audioBuffer = await audioResponse.arrayBuffer();
    } else if (contentType && (contentType.includes('audio/mpeg') || contentType.includes('audio/wav'))) {
      // หาก Botnoi ส่งข้อมูลเสียงดิบมาโดยตรง
      console.log("Botnoi API คืนค่าข้อมูลเสียงดิบโดยตรง");
      audioBuffer = await botnoiRes.arrayBuffer(); // อ่านข้อมูลเสียงเป็น ArrayBuffer

      // STEP 4: สร้างชื่อไฟล์ที่ไม่ซ้ำกัน และกำหนดพาธสำหรับบันทึก
      const filename = `podcast-${randomUUID()}.mp3`; // สันนิษฐานว่าเป็น MP3 ตามที่เราร้องขอ
      const savePath = path.join(process.cwd(), "public", "audio", filename);

      // สร้างโฟลเดอร์ public/audio ถ้ายังไม่มี
      await fs.mkdir(path.dirname(savePath), { recursive: true });

      // STEP 5: บันทึกไฟล์ลง public/audio/
      await fs.writeFile(savePath, Buffer.from(audioBuffer));
      audioUrl = `/audio/${filename}`; // กำหนด URL ที่จะเข้าถึงได้จาก Public Directory ของเรา
    } else {
      // กรณี Content-Type ไม่เป็นที่รู้จักหรือไม่คาดคิด
      const unknownResponseText = await botnoiRes.text();
      console.error("Botnoi API คืนค่า Content-Type ที่ไม่คาดคิด:", contentType, "ข้อมูล Response:", unknownResponseText.substring(0, 200));
      return NextResponse.json({ message: `Botnoi API คืนค่า Content-Type ที่ไม่คาดคิด: ${contentType}` }, { status: 500 });
    }

    // STEP 6: ตอบกลับ frontend ด้วยสคริปต์และ URL ของไฟล์เสียง
    return NextResponse.json({
      script, // สคริปต์ที่สร้างขึ้น
      audio_url: audioUrl, // URL ของไฟล์เสียงที่บันทึกหรือได้รับ
    });
  } catch (error) {
    console.error("Error in /api/generate-podcast:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}
