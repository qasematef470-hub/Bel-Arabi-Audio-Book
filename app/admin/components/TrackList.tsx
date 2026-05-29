"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react";

interface Track {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  created_at: string;
  ratings?: { rating_value: number }[];
}

export default function TrackList({ refreshTrigger }: { refreshTrigger: boolean }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  // حالات لتكبير الـ QR ونسخ الرابط
  const [zoomQrUrl, setZoomQrUrl] = useState<string | null>(null);
  const [zoomTrackTitle, setZoomTrackTitle] = useState<string>("");
  const [copiedTrackId, setCopiedTrackId] = useState<string | null>(null);

  // دالة نسخ رابط المقطع للحافظة تلقائياً
  const handleCopyLink = async (trackId: string) => {
    const trackUrl = `${window.location.origin}/audio/${trackId}`;
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopiedTrackId(trackId);
      setTimeout(() => setCopiedTrackId(null), 2000); // إخفاء علامة النجاح بعد ثانيتين
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };
  // حالات التعديل
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  // حالات لتشغيل الفيديو داخل مودال منبثق
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>("");
  // حالات لتشغيل الصوت داخل مودال منبثق
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeAudioTitle, setActiveAudioTitle] = useState<string>("");

  // جلب المقاطع من قاعدة البيانات
  async function fetchTracks() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("audio_tracks")
        .select("*, ratings(rating_value)") 
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTracks();
  }, [refreshTrigger]);

  // دالة فتح مودال التعديل وتعبئة البيانات الحالية
  function handleEditClick(track: Track) {
    setSelectedTrack(track);
    setEditTitle(track.title);
    setEditDescription(track.description || "");
    setEditFile(null);
    setUpdateStatus("");
    onOpen();
  }

  // دالة حذف المقطع الصوتي
  async function handleDelete(trackId: string, audioUrl: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المقطع الصوتي نهائياً؟")) return;

    try {
      // 1. حذف السجل من قاعدة البيانات
      const { error: dbError } = await supabase
        .from("audio_tracks")
        .delete()
        .eq("id", trackId);

      if (dbError) throw dbError;

      // 2. محاولة حذف الملف الفعلي من الـ Storage
      const fileName = audioUrl.split("/").pop();
      if (fileName) {
        await supabase.storage.from("audio-files").remove([fileName]);
      }

      alert("تم حذف المقطع بنجاح.");
      fetchTracks();
    } catch (error: any) {
      alert(`حدث خطأ أثناء الحذف: ${error.message}`);
    }
  }

  // نفس دالة ضغط الصوت الذكية لضغط الملف الجديد عند التعديل
  async function compressAudioClientSide(audioFile: File): Promise<Blob> {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const targetSampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);

    const bufferSource = offlineCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineCtx.destination);
    bufferSource.start();

    const renderedBuffer = await offlineCtx.startRendering();
    return bufferToWav(renderedBuffer);
  }

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

  // دالة مساعدة للتحقق هل الرابط لملف فيديو أم صوتي
function isVideoFile(url: string) {
  const cleanUrl = url.split("?")[0].toLowerCase();
  return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".mov") || cleanUrl.endsWith(".mkv");
}
  async function handleUpdate(onClose: () => void) {
    if (!selectedTrack) return;

    try {
      setUpdating(true);
      setUpdateStatus("جاري التحديث والحفظ...");

      let finalAudioUrl = selectedTrack.audio_url;

      if (editFile) {
        setUpdateStatus("جاري رفع ملف الصوت الجديد...");
        const fileExtension = editFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        
        const { error: uploadError } = await supabase.storage
          .from("audio-files")
          .upload(fileName, editFile, { contentType: editFile.type });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("audio-files")
          .getPublicUrl(fileName);

        finalAudioUrl = publicUrl;

        const oldFileName = selectedTrack.audio_url.split("/").pop();
        if (oldFileName) {
          await supabase.storage.from("audio-files").remove([oldFileName]);
        }
      }

      const { error: dbError } = await supabase
        .from("audio_tracks")
        .update({
          title: editTitle,
          description: editDescription,
          audio_url: finalAudioUrl
        })
        .eq("id", selectedTrack.id);

      if (dbError) throw dbError;

      setUpdateStatus("تم التحديث بنجاح!");
      fetchTracks();
      setTimeout(() => onClose(), 800);
    } catch (error: any) {
      setUpdateStatus(`خطأ أثناء التحديث: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  }

  // دالة توليد وتحميل الـ QR Code مباشرة بجودة عالية وباسم الدرس
  async function downloadQRCode(trackId: string, trackTitle: string) {
    const trackUrl = `${window.location.origin}/audio/${trackId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&transparent=true&data=${encodeURIComponent(trackUrl)}`;
    
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${trackTitle}.png`; // التنزيل التلقائي باسم الدرس
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  }
  
  if (loading) return <p className="text-center text-gray-500 py-4">جاري تحميل المقاطع الصوتيّة المرفوعة...</p>;
  if (tracks.length === 0) return <p className="text-center text-gray-400 py-4">لا توجد مقاطع صوتية مرفوعة حالياً.</p>;

  return (
    <div className="space-y-4">
      <Table aria-label="جدول عرض وإدارة المقاطع الصوتية" className="shadow-sm">
        <TableHeader>
          <TableColumn className="text-right">عنوان المقطع</TableColumn>
          <TableColumn className="text-right">الوصف</TableColumn>
          <TableColumn className="text-right">الاستماع</TableColumn>
          <TableColumn className="text-center">الـ QR Code</TableColumn>
          <TableColumn className="text-right">عدد التقييمات</TableColumn>
          <TableColumn className="text-right">متوسط التقييم</TableColumn>
          <TableColumn className="text-right">تاريخ الرفع</TableColumn>
          <TableColumn className="text-center">التحكم والعمليات</TableColumn>
        </TableHeader>
        <TableBody>
          {tracks.map((track) => (
            <TableRow key={track.id}>
              <TableCell className="font-medium text-primary">{track.title}</TableCell>
              <TableCell className="text-gray-500 max-w-xs truncate">{track.description || "—"}</TableCell>
              
              {/* التبديل التلقائي بين زري الصوت والفيديو لفتح المودال المخصص */}
              <TableCell>
                {isVideoFile(track.audio_url) ? (
                  <Button 
                    size="sm"
                    color="primary"
                    variant="flat"
                    onClick={() => {
                      setActiveVideoUrl(track.audio_url);
                      setActiveVideoTitle(track.title);
                    }}
                    className="font-semibold text-xs h-8 px-3"
                  >
                    📺 تشغيل الفيديو
                  </Button>
                ) : (
                  <Button 
                    size="sm"
                    color="secondary"
                    variant="flat"
                    onClick={() => {
                      setActiveAudioUrl(track.audio_url);
                      setActiveAudioTitle(track.title);
                    }}
                    className="font-semibold text-xs h-8 px-3"
                  >
                    🔊 تشغيل الصوت
                  </Button>
                )}
              </TableCell>

              {/* خلية الـ QR تدعم التكبير والنسخ والتنزيل */}
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1.5 justify-center">
                  <button 
                    onClick={() => {
                      const trackUrl = `${window.location.origin}/audio/${track.id}`;
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(trackUrl)}`;
                      setZoomQrUrl(qrUrl);
                      setZoomTrackTitle(track.title);
                    }}
                    className="focus:outline-none hover:scale-105 transition-transform"
                    title="اضغط لتكبير الكود"
                  >
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}/audio/${track.id}`)}`} 
                      alt="QR Code" 
                      className="w-11 h-11 border rounded p-0.5 bg-white shadow-sm cursor-pointer"
                    />
                  </button>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      color="secondary" 
                      variant="flat" 
                      onClick={() => downloadQRCode(track.id, track.title)}
                      className="text-[10px] h-6 px-1.5 min-w-0"
                    >
                      ⬇️ تنزيل
                    </Button>
                    <Button 
                      size="sm" 
                      color={copiedTrackId === track.id ? "success" : "default"} 
                      variant="flat" 
                      onClick={() => handleCopyLink(track.id)}
                      className="text-[10px] h-6 px-1.5 min-w-0"
                    >
                      {copiedTrackId === track.id ? "✔️ تم" : "🔗 نسخ"}
                    </Button>
                  </div>
                </div>
              </TableCell>

              {/* عمود عدد التقييمات */}
              <TableCell className="text-right text-sm text-gray-600 font-semibold">
                {track.ratings?.length || 0} تقييم
              </TableCell>

              {/* عمود متوسط التقييم بالنجوم */}
              <TableCell className="text-right text-sm font-bold text-yellow-500">
                ⭐ {track.ratings && track.ratings.length > 0 
                  ? (track.ratings.reduce((acc, r) => acc + r.rating_value, 0) / track.ratings.length).toFixed(1) 
                  : "—"}
              </TableCell>

              <TableCell className="text-xs text-gray-400">
                {new Date(track.created_at).toLocaleDateString("ar-EG")}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex gap-2 justify-center">
                  <Button size="sm" color="primary" variant="flat" onClick={() => handleEditClick(track)}>
                    تعديل
                  </Button>
                  <Button size="sm" color="danger" variant="flat" onClick={() => handleDelete(track.id, track.audio_url)}>
                    حذف
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 1️⃣ مودال التعديل الأنيق من NextUI (منفصل ومستقل) */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" dir="rtl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-primary font-bold">🛠️ تعديل المقطع الصوتي</ModalHeader>
              <ModalBody className="space-y-4">
                <Input
                  label="العنوان الجديد"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  isRequired
                />
                <Textarea
                  label="الوصف الجديد"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">تغيير ملف الصوت (اختياري - اتركه فارغاً للحفاظ على الصوت الحالي)</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setEditFile(e.target.files ? e.target.files[0] : null)}
                    className="file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-secondary/10 file:text-secondary hover:file:bg-secondary/20 cursor-pointer text-xs text-gray-500 border rounded-md p-2"
                  />
                </div>
                {updateStatus && (
                  <p className={`text-xs text-center font-medium ${updateStatus.includes("نجاح") ? "text-green-600" : "text-blue-600"}`}>
                    {updateStatus}
                  </p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onClick={onClose} isDisabled={updating}>
                  إلغاء
                </Button>
                <Button color="primary" onClick={() => handleUpdate(onClose)} isLoading={updating}>
                  تحديث البيانات
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 2️⃣ مودال تكبير الـ QR بدقة وشفافية متوافق تماماً مع NextUI */}
      <Modal isOpen={!!zoomQrUrl} onClose={() => setZoomQrUrl(null)} placement="center" dir="rtl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-primary font-bold">🔍 تكبير الـ QR Code - {zoomTrackTitle}</ModalHeader>
              <ModalBody className="flex flex-col items-center justify-center py-6">
                {zoomQrUrl && (
                  <img 
                    src={zoomQrUrl} 
                    alt="Zoomed QR" 
                    className="w-64 h-64 border rounded-lg p-2 bg-white shadow-md"
                  />
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onClick={onClose}>
                  إغلاق
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 3️⃣ مودال تشغيل الفيديو الأنيق والمنبثق متوافق تماماً مع NextUI */}
      <Modal 
        isOpen={!!activeVideoUrl} 
        onClose={() => setActiveVideoUrl(null)} 
        placement="center" 
        size="2xl" 
        dir="rtl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-primary font-bold">📺 تشغيل الفيديو - {activeVideoTitle}</ModalHeader>
              <ModalBody className="flex flex-col items-center justify-center p-2 bg-black rounded-lg">
                {activeVideoUrl && (
                  <video 
                    src={activeVideoUrl} 
                    controls 
                    autoPlay 
                    className="w-full rounded-lg outline-none max-h-[60vh]"
                  />
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onClick={onClose}>
                  إغلاق
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {/* 4️⃣ مودال تشغيل الصوت الأنيق والمنبثق متوافق تماماً مع NextUI */}
      <Modal 
        isOpen={!!activeAudioUrl} 
        onClose={() => setActiveAudioUrl(null)} 
        placement="center" 
        size="md" // حجم متوسط مناسب لتشغيل الصوت
        dir="rtl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-primary font-bold">🔊 تشغيل الصوت - {activeAudioTitle}</ModalHeader>
              <ModalBody className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-100">
                {activeAudioUrl && (
                  <audio 
                    src={activeAudioUrl} 
                    controls 
                    autoPlay // تشغيل تلقائي لراحة المستخدم عند الفتح
                    className="w-full outline-none h-10"
                  />
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onClick={onClose}>
                  إغلاق
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}