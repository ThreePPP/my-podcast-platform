'use client'; // กำหนดให้เป็น Client Component ใน Next.js

import { useState } from 'react'; // นำเข้า hook useState สำหรับจัดการ state

// นี่คือคอมโพเนนต์หลักสำหรับสร้าง Podcast
export default function App() {
  const [topic, setTopic] = useState(''); // State สำหรับหัวข้อ Podcast
  const [speaker, setSpeaker] = useState('1'); // State สำหรับรหัสผู้พูด (เริ่มต้นที่ 1)
  const [script, setScript] = useState(''); // State สำหรับสคริปต์ที่สร้างขึ้น
  const [audioUrl, setAudioUrl] = useState(''); // State สำหรับ URL ของไฟล์เสียง
  const [loading, setLoading] = useState(false); // State สำหรับสถานะการโหลด
  const [error, setError] = useState(''); // State สำหรับข้อความผิดพลาด

  /**
   * ฟังก์ชันจัดการการสร้าง Podcast
   * จะเรียก API /api/generate-podcast เพื่อรับสคริปต์และไฟล์เสียง
   */
  const handleGenerate = async () => {
    setLoading(true); // ตั้งค่าสถานะโหลดเป็นจริง
    setError('');      // ล้างข้อผิดพลาดก่อนหน้า
    setScript('');     // ล้างสคริปต์ก่อนหน้า
    setAudioUrl('');   // ล้าง URL เสียงก่อนหน้า

    try {
      // เรียก API POST ไปยัง route /api/generate-podcast ของ Next.js
      const res = await fetch('/api/generate-podcast', {
        method: 'POST', // ใช้วิธีการ POST
        headers: { 'Content-Type': 'application/json' }, // กำหนด Content-Type เป็น JSON
        body: JSON.stringify({ topic, speaker }), // ส่งหัวข้อและผู้พูดไปยัง API
      });

      // ตรวจสอบว่าการตอบกลับสำเร็จหรือไม่ (status 2xx)
      if (!res.ok) {
        const errorData = await res.json();
        // โยนข้อผิดพลาดหากการตอบกลับไม่สำเร็จ
        throw new Error(errorData.message || 'ไม่สามารถสร้าง Podcast ได้');
      }

      const data = await res.json(); // แปลงข้อมูลที่ได้จากการตอบกลับเป็น JSON
      setScript(data.script);      // ตั้งค่าสคริปต์ที่ได้รับ
      setAudioUrl(data.audio_url); // ตั้งค่า URL ของไฟล์เสียงที่ได้รับ
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการสร้าง Podcast:", err);
      // ตั้งค่าข้อความผิดพลาดเพื่อแสดงให้ผู้ใช้เห็น
      setError((err as Error).message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด');
    } finally {
      setLoading(false); // ไม่ว่าจะเป็นอย่างไร ให้ตั้งค่าสถานะโหลดเป็นเท็จเสมอ
    }
  };

  return (
    // กำหนด Layout โดยรวมของหน้าจอ
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 font-sans">
      {/* Container หลักของ UI */}
      <div className="max-w-2xl w-full mx-auto p-6 bg-gray-800 rounded-xl shadow-lg space-y-6 border border-gray-700">
        {/* หัวข้อหลักของแอปพลิเคชัน */}
        <h1 className="text-3xl font-extrabold text-center text-green-400 mb-6">
          🎙️ เครื่องมือสร้าง Podcast ด้วย AI
        </h1>

        {/* ช่องสำหรับใส่หัวข้อ Podcast */}
        <div className="relative">
          <input
            value={topic} // ค่าปัจจุบันของหัวข้อ
            onChange={(e) => setTopic(e.target.value)} // อัปเดต state เมื่อค่าเปลี่ยน
            placeholder="ใส่หัวข้อ podcast เช่น 'AI กับชีวิตประจำวัน'" // ข้อความ placeholder
            className="w-full p-3 pr-10 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={loading} // ปิดการใช้งาน input ขณะกำลังโหลด
          />
          {/* ไอคอนสำหรับหัวข้อ (ใช้ Emoji แทน Lucide icon) */}
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
            💡
          </span>
        </div>

        {/* Dropdown สำหรับเลือกผู้พูด */}
        <div className="relative">
          <select
            value={speaker} // ค่าปัจจุบันของผู้พูด
            onChange={(e) => setSpeaker(e.target.value)} // อัปเดต state เมื่อค่าเปลี่ยน
            className="w-full p-3 pr-10 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
            disabled={loading} // ปิดการใช้งาน select ขณะกำลังโหลด
          >
            {/* สร้างตัวเลือกผู้พูด 1-30 */}
            {Array.from({ length: 30 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)} className="bg-gray-700 text-white">
                ผู้พูด {i + 1}
              </option>
            ))}
          </select>
          {/* ไอคอนสำหรับผู้พูด (ใช้ Emoji แทน Lucide icon) */}
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 pointer-events-none">
            🗣️
          </span>
        </div>

        {/* ปุ่มสร้าง Podcast */}
        <button
          onClick={handleGenerate} // เรียกฟังก์ชัน handleGenerate เมื่อคลิก
          className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-300 ease-in-out
            ${loading // ตรวจสอบสถานะโหลดเพื่อเปลี่ยนสไตล์ปุ่ม
              ? 'bg-gray-600 cursor-not-allowed' // สไตล์เมื่อกำลังโหลด
              : 'bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5' // สไตล์ปกติ
            }`}
          disabled={loading} // ปิดการใช้งานปุ่มขณะกำลังโหลด
        >
          {loading ? ( // แสดง Spin loader เมื่อกำลังโหลด
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังสร้าง Podcast...
            </>
          ) : ( // แสดงข้อความปกติเมื่อไม่ได้โหลด
            <>
              🚀 สร้าง Podcast ด้วย AI
            </>
          )}
        </button>

        {/* แสดงข้อความผิดพลาดหากมี */}
        {error && (
          <div className="bg-red-900 text-red-300 p-3 rounded-lg text-center border border-red-700">
            <p>ข้อผิดพลาด: {error}</p>
          </div>
        )}

        {/* แสดงสคริปต์ที่สร้างขึ้นหากมี */}
        {script && (
          <div className="space-y-3 p-4 bg-gray-700 rounded-lg border border-gray-600 shadow-inner">
            <h2 className="text-xl font-bold text-green-400">📜 สคริปต์:</h2>
            <p className="whitespace-pre-line text-gray-200 leading-relaxed">{script}</p>
          </div>
        )}

        {/* แสดงเครื่องเล่นเสียง Podcast หากมี URL เสียง */}
        {audioUrl && (
          <div className="space-y-3 p-4 bg-gray-700 rounded-lg border border-gray-600 shadow-inner">
            <h2 className="text-xl font-bold text-green-400">🔊 เสียง Podcast:</h2>
            <audio controls src={audioUrl} className="w-full mt-2 rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
}
