"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Button, Input, Textarea, Card, CardBody } from "@nextui-org/react";
import TrackList from "./components/TrackList"; // 👈 استيراد مكون جدول الصوتيات الجديد

export default function AdminDashboard() {
  const router = useRouter();
  
  // حالة التحقق من تسجيل الدخول لحماية الصفحة
  const [loadingAuth, setLoadingAuth] = useState(true);

  // حالة لتحديث قائمة الصوتيات تلقائياً فور الرفع بنجاح
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // حالات رفع الملفات الصوتية
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // حالات تحديث السوشيال ميديا
  const [facebook, setFacebook] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");

  // التحقق من هوية المستخدم وجلب البيانات
  useEffect(() => {
    async function checkAuthAndFetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setLoadingAuth(false);

      const { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (settingsData && !settingsError) {
        setFacebook(settingsData.facebook_url || "");
        setWhatsapp(settingsData.whatsapp_number || "");
        setInstagram(settingsData.instagram_url || "");
      }
    }

    checkAuthAndFetchData();
  }, [router]);

  // دالة ضغط الصوت في المتصفح قبل الرفع (Resampling to Mono 16kHz)
  async function compressAudioClientSide(audioFile: File): Promise<Blob> {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const targetSampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(
      1,
      audioBuffer.duration * targetSampleRate,
      targetSampleRate
    );

    const bufferSource = offlineCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineCtx.destination);
    bufferSource.start();

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = bufferToWav(renderedBuffer);
    return wavBlob;
  }

  // دالة تحويل الـ AudioBuffer إلى WAV Blob
  function bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels,
      length = buffer.length * numOfChan * 2 + 44,
      bufferArr = new ArrayBuffer(length),
      view = new DataView(bufferArr),
      channels = [],
      sampleRate = buffer.sampleRate;
    let i, sample, offset = 0, pos = 0;

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(sampleRate); setUint32(sampleRate * 2 * numOfChan); 
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);                
    setUint32(length - pos - 4);          

    for (i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferArr], { type: "audio/wav" });

    function setUint16(data: number) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data: number) { view.setUint32(pos, data, true); pos += 4; }
  }

  // دالة الرفع المباشر دون أي تعديل على الملف للحفاظ على حجمه الصغير
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) {
      setUploadStatus("يرجى إدخال العنوان واختيار ملف صوتي أولاً.");
      return;
    }

    try {
      setUploading(true);
      setUploadStatus("جاري رفع الملف الصوتي الأصلي...");

      // استخراج امتداد الملف الأصلي (mp3, wav, etc.) لرفعه بنفس الصيغة
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(fileName, file, { // الرفع المباشر للملف الأصلي
          cacheControl: "3600"
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("audio-files")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("audio_tracks")
        .insert([{ title, description, audio_url: publicUrl }]);

      if (dbError) throw dbError;

      setUploadStatus("تم الرفع والحفظ بنجاح تام وبنفس المساحة الأصلية!");
      setTitle("");
      setDescription("");
      setFile(null);
      setRefreshTrigger(prev => !prev); // تحديث القائمة بالأسفل تلقائياً
    } catch (error: any) {
      console.error(error);
      setUploadStatus(`حدث خطأ أثناء الرفع: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  // دالة حفظ الإعدادات
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsStatus("");

      const { error } = await supabase
        .from("settings")
        .upsert({
          id: 1,
          facebook_url: facebook,
          whatsapp_number: whatsapp,
          instagram_url: instagram,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      setSettingsStatus("تم تحديث روابط التواصل بنجاح!");
    } catch (error: any) {
      setSettingsStatus(`خطأ في الحفظ: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <div className="text-center space-y-2">
          <p className="text-primary font-semibold text-lg animate-pulse">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* الهيدر الرئيسي */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">لوحة تحكم بالعربي 🎛️</h1>
          <p className="text-gray-500">مرحباً بك يا باشا، تحكم في ملفات كتابك وروابط تواصلك من هنا</p>
        </div>

        {/* شبكة النماذج */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* كارت الرفع */}
          <Card className="shadow-md">
            <CardBody className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-primary border-b pb-2">🎙️ رفع مقطع صوتي جديد</h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <Input
                  label="عنوان المقطع "
                  placeholder="مثال: قراءة الفصل الأول"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  isRequired
                />
                <Textarea
                  label="وصف اختياري"
                  placeholder="وصف بسيط يظهر للطالب تحت الصوت"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">الملف الصوتي أو المرئي (MP3, MP4, WAV, etc.)</span>
                  <input
                    type="file"
                    accept="audio/*,video/*" 
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    className="file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-secondary/10 file:text-secondary hover:file:bg-secondary/20 cursor-pointer text-sm text-gray-500 border rounded-md p-2"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  color="primary"
                  className="w-full font-semibold"
                  isLoading={uploading}
                >
                  {uploading ? "جاري المعالجة..." : "ضغط ورفع الملف الصوتي"}
                </Button>
                {uploadStatus && (
                  <p className={`text-sm text-center font-medium ${uploadStatus.includes("نجاح") ? "text-green-600" : "text-blue-600"}`}>
                    {uploadStatus}
                  </p>
                )}
              </form>
            </CardBody>
          </Card>

          {/* كارت التواصل */}
          <Card className="shadow-md">
            <CardBody className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-primary border-b pb-2">🔗 روابط التواصل والدعم</h2>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <Input
                  label="رقم الواتساب (بالصيغة الدولية الكاملة)"
                  placeholder="مثال: 201234567890"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
                <Input
                  label="رابط صفحة فيسبوك"
                  placeholder="https://facebook.com/yourpage"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                />
                <Input
                  label="رابط صفحة إنستجرام"
                  placeholder="https://instagram.com/yourprofile"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
                <Button
                  type="submit"
                  color="secondary"
                  className="w-full font-semibold"
                  isLoading={savingSettings}
                >
                  حفظ روابط التواصل
                </Button>
                {settingsStatus && (
                  <p className="text-sm text-center font-medium text-green-600">
                    {settingsStatus}
                  </p>
                )}
              </form>
            </CardBody>
          </Card>

        </div>

        {/* 📂 شاشة عرض الصوتيات المرفوعة وتعديلها وحذفها */}
        <Card className="shadow-md">
          <CardBody className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-primary border-b pb-2">📂 المقاطع الصوتية المرفوعة ومراقبتها</h2>
            <TrackList refreshTrigger={refreshTrigger} />
          </CardBody>
        </Card>

      </div>
    </div>
  );
}