"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Progress } from "@nextui-org/react";

interface Track {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  created_at: string;
  ratings?: { rating_value: number }[];
  play_count?: number;
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

  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [modalIsPlaying, setModalIsPlaying] = useState(false);
  const [modalCurrentTime, setModalCurrentTime] = useState(0);
  const [modalDuration, setModalDuration] = useState(0);
  const modalAudioRef = useRef<HTMLAudioElement | null>(null);

  const [videoIsPlaying, setVideoIsPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoPortrait, setIsVideoPortrait] = useState(false);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

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
          <TableColumn className="text-right">المشاهدات/الاستماع</TableColumn>
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
                      setActiveTrack(track);
                      setActiveVideoUrl(track.audio_url);
                      setActiveVideoTitle(track.title);
                      setVideoIsPlaying(true);
                      setIsVideoPortrait(false);
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
                      setActiveTrack(track);
                      setActiveAudioUrl(track.audio_url);
                      setActiveAudioTitle(track.title);
                      setModalIsPlaying(true);
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

              {/* عمود عدد الاستماع/المشاهدة */}
              <TableCell className="text-right text-sm text-gray-600 font-semibold">
                {track.play_count || 0} استماع
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

      {/* 3️⃣ مودال تشغيل الفيديو الأنيق والمنبثق (تصميم سينمائي مع واجهة معتمة وعناصر تحكم مخصصة) */}
      <Modal 
        isOpen={!!activeVideoUrl} 
        onClose={() => {
          setActiveVideoUrl(null);
          setVideoIsPlaying(false);
        }} 
        placement="center" 
        size="2xl" 
        dir="rtl"
        classNames={{
          backdrop: "bg-black/80 backdrop-blur-md",
          base: "bg-slate-950 border border-slate-800 shadow-2xl text-white rounded-[32px] overflow-hidden"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-slate-200 font-bold text-base px-6 py-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                <span>📺 {activeVideoTitle}</span>
                <span className="text-[10px] text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/10 font-black">CINEMA MODE</span>
              </ModalHeader>

              <ModalBody className="p-4 bg-black flex flex-col items-center justify-center relative group min-h-[300px]">
                {/* Dynamic Aspect-Ratio Viewport */}
                <div className={`relative overflow-hidden bg-black border border-slate-900 shadow-xl flex items-center justify-center transition-all duration-300 w-full ${
                  isVideoPortrait 
                    ? "max-w-[280px] aspect-[9/16] shadow-lg rounded-2xl mx-auto" 
                    : "w-full aspect-video rounded-lg max-w-2xl"
                }`}>
                  {/* Glow */}
                  <div className={`absolute inset-0 bg-[#00B4D8]/10 blur-xl transition-opacity duration-500 opacity-60 ${videoIsPlaying ? "opacity-100" : ""}`}></div>
                  
                  {activeVideoUrl && (
                    <video 
                      ref={modalVideoRef}
                      src={activeVideoUrl} 
                      autoPlay
                      onTimeUpdate={() => {
                        if (modalVideoRef.current) setVideoCurrentTime(modalVideoRef.current.currentTime);
                      }}
                      onLoadedMetadata={() => {
                        if (modalVideoRef.current) {
                          setVideoDuration(modalVideoRef.current.duration);
                          setIsVideoPortrait(modalVideoRef.current.videoHeight > modalVideoRef.current.videoWidth);
                        }
                      }}
                      onEnded={() => setVideoIsPlaying(false)}
                      className="w-full h-full object-cover relative z-10"
                    />
                  )}
                </div>

                {/* Sleek Custom Controller Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2 z-20">
                  {/* Scrubber */}
                  <Progress
                    size="sm"
                    value={videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0}
                    color="secondary"
                    className="h-1 cursor-pointer rounded-full"
                    onClick={(e) => {
                      if (modalVideoRef.current && videoDuration > 0) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = clickX / rect.width;
                        modalVideoRef.current.currentTime = percentage * videoDuration;
                      }
                    }}
                  />

                  {/* Timings and Playback controls */}
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-4">
                      {/* Play/Pause Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (modalVideoRef.current) {
                            if (videoIsPlaying) {
                              modalVideoRef.current.pause();
                              setVideoIsPlaying(false);
                            } else {
                              modalVideoRef.current.play().then(() => setVideoIsPlaying(true));
                            }
                          }
                        }}
                        className="text-white hover:text-[#00B4D8] transition-colors"
                      >
                        {videoIsPlaying ? (
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>

                      {/* Timings */}
                      <span className="text-[10px] text-slate-300">
                        {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                      </span>
                    </div>

                    {/* Mute/Fullscreen controls */}
                    <button
                      type="button"
                      onClick={() => {
                        if (modalVideoRef.current) {
                          modalVideoRef.current.muted = !modalVideoRef.current.muted;
                        }
                      }}
                      className="text-white hover:text-[#00B4D8] transition-colors"
                    >
                      🔊
                    </button>
                  </div>
                </div>
              </ModalBody>
              
              <ModalFooter className="bg-slate-900/50 border-t border-white/5 px-6 py-4 flex justify-between items-center">
                <span className="text-[10px] text-slate-500">BelArabi Cinema Viewport v1.0</span>
                <Button color="danger" variant="flat" onClick={onClose} className="rounded-xl font-bold">
                  إغلاق السينما
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 4️⃣ مودال تشغيل الصوت الأنيق والمنبثق (تصميم بريميوم مع Equalizer واسطوانة دوارة) */}
      <Modal 
        isOpen={!!activeAudioUrl} 
        onClose={() => {
          setActiveAudioUrl(null);
          setModalIsPlaying(false);
        }} 
        placement="center" 
        size="md"
        dir="rtl"
        classNames={{
          backdrop: "bg-black/60 backdrop-blur-sm",
          base: "bg-gradient-to-b from-[#0F172A] to-[#1E293B] border border-slate-800 shadow-2xl text-white rounded-[32px] p-6 relative overflow-hidden"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              {/* Glass backing pulse */}
              <div className="absolute inset-0 bg-[#00B4D8]/10 blur-3xl opacity-30 rounded-full pointer-events-none animate-pulse"></div>

              <ModalHeader className="text-[#00B4D8] font-bold text-sm tracking-widest uppercase border-b border-white/10 pb-3 flex justify-between items-center relative z-10">
                <span>🔊 {activeAudioTitle}</span>
                <span className="text-[10px] text-slate-400">🔒 Secure Preview</span>
              </ModalHeader>

              <ModalBody className="flex flex-col items-center justify-center py-6 relative z-10 space-y-6">
                {activeAudioUrl && (
                  <audio 
                    ref={modalAudioRef}
                    src={activeAudioUrl} 
                    autoPlay
                    onTimeUpdate={() => {
                      if (modalAudioRef.current) setModalCurrentTime(modalAudioRef.current.currentTime);
                    }}
                    onLoadedMetadata={() => {
                      if (modalAudioRef.current) setModalDuration(modalAudioRef.current.duration);
                    }}
                    onEnded={() => setModalIsPlaying(false)}
                  />
                )}

                {/* Rotating Vinyl */}
                <div className="relative group my-2">
                  <div className={`absolute -inset-4 bg-[#00B4D8] opacity-20 blur-2xl rounded-full ${modalIsPlaying ? "animate-pulse" : ""}`}></div>
                  <div className={`w-32 h-32 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center shadow-lg relative ${
                    modalIsPlaying ? "animate-spin [animation-duration:8s]" : ""
                  }`}>
                    {/* Vinyl grooves */}
                    <svg className="w-28 h-28 text-slate-800 absolute opacity-50" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                      <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    {/* Large music note in background */}
                    <svg className="w-20 h-20 text-[#00B4D8]/30 absolute z-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 10l12-3" />
                      <circle cx="6" cy="19" r="3" fill="currentColor" />
                      <circle cx="18" cy="16" r="3" fill="currentColor" />
                    </svg>
                    {/* Core Brand Logo */}
                    <img 
                      src="/images/logo.png" 
                      alt="Brand Logo" 
                      className="w-12 h-12 object-contain rounded-full border-2 border-slate-900 relative z-20"
                    />
                  </div>
                </div>

                {/* Pulsing CSS Equalizer wave visualizer */}
                <div className="h-10 flex items-end justify-center gap-1.5 w-full px-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((bar) => {
                    const baseHeights = [12, 24, 16, 32, 8, 28, 20, 32, 12, 24, 8, 20, 28, 16, 24];
                    return (
                      <div
                        key={bar}
                        className="w-1 rounded-full bg-[#00B4D8] transition-all duration-300"
                        style={{
                          height: modalIsPlaying ? `${baseHeights[bar - 1]}px` : "4px",
                          transformOrigin: "bottom",
                          animation: modalIsPlaying
                            ? `eq-bar ${[0.6, 0.8, 0.5, 0.9, 0.4, 0.7, 0.5, 0.8, 0.6, 0.9, 0.4, 0.7, 0.8, 0.5, 0.6][bar - 1]}s ease-in-out infinite alternate`
                            : "none"
                        }}
                      />
                    );
                  })}
                </div>

                {/* Scrubber and timings */}
                <div className="w-full space-y-2">
                  <Progress
                    size="sm"
                    value={modalDuration > 0 ? (modalCurrentTime / modalDuration) * 100 : 0}
                    color="secondary"
                    className="h-1.5 cursor-pointer rounded-full"
                    onClick={(e) => {
                      if (modalAudioRef.current && modalDuration > 0) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = clickX / rect.width;
                        modalAudioRef.current.currentTime = percentage * modalDuration;
                      }
                    }}
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>{formatTime(modalCurrentTime)}</span>
                    <span>{formatTime(modalDuration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex justify-center items-center gap-6 w-full">
                  <button 
                    type="button" 
                    className="text-slate-400 hover:text-white transition-colors"
                    onClick={() => {
                      if (modalAudioRef.current) modalAudioRef.current.currentTime = Math.max(0, modalCurrentTime - 10);
                    }}
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M6 6h2v12H6zm3.5 6L18 6v12z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalAudioRef.current) {
                        if (modalIsPlaying) {
                          modalAudioRef.current.pause();
                          setModalIsPlaying(false);
                        } else {
                          modalAudioRef.current.play().then(() => setModalIsPlaying(true));
                        }
                      }
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md shadow-cyan-500/10 ${
                      modalIsPlaying ? "bg-red-500 hover:bg-red-600" : "bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-slate-900"
                    }`}
                  >
                    {modalIsPlaying ? (
                      <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 fill-current text-slate-900" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="text-slate-400 hover:text-white transition-colors"
                    onClick={() => {
                      if (modalAudioRef.current) modalAudioRef.current.currentTime = Math.min(modalDuration, modalCurrentTime + 10);
                    }}
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6zm10-12h2v12h-2z"/>
                    </svg>
                  </button>
                </div>
              </ModalBody>
              
              <ModalFooter className="border-t border-white/10 pt-3">
                <Button color="danger" variant="flat" onClick={onClose} className="rounded-xl font-bold">
                  إغلاق المشغل
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}