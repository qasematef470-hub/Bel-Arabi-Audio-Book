"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Card, CardBody, Button, Spinner } from "@nextui-org/react";

interface TrackData {
  id: string;
  title: string;
  description: string;
  audio_url: string;
}

interface SettingsData {
  facebook_url: string;
  whatsapp_number: string;
  instagram_url: string;
}

export default function StudentAudioPage() {
  const params = useParams();
  const trackId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<TrackData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [rated, setRated] = useState(false);
  const [submittingRate, setSubmittingRate] = useState(false);

  // جلب بيانات المقطع الصوتي والإعدادات معاً من قاعدة البيانات
  useEffect(() => {
    if (!trackId) return;

    async function fetchData() {
      try {
        setLoading(true);

        // 1. جلب بيانات الملف الصوتي بالـ ID
        const { data: trackData, error: trackError } = await supabase
          .from("audio_tracks")
          .select("*")
          .eq("id", trackId)
          .single();

        if (trackError) throw new Error("المقطع الصوتي غير موجود أو تم حذفه.");
        setTrack(trackData);

        // 2. جلب روابط السوشيال ميديا
        const { data: settingsData, error: settingsError } = await supabase
          .from("settings")
          .select("*")
          .eq("id", 1)
          .single();

        if (settingsData && !settingsError) {
          setSettings(settingsData);
        }
      } catch (error: any) {
        setErrorMsg(error.message || "حدث خطأ غير متوقع.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [trackId]);

  // دالة إرسال التقييم بالنجوم لقاعدة البيانات (نسخة واحدة صحيحة ومؤمنة)
  async function handleRate(value: number) {
    if (rated || submittingRate) return;
    try {
      setSubmittingRate(true);
      const { error } = await supabase
        .from("ratings")
        .insert([{ track_id: track!.id, rating_value: value }]);

      if (error) throw error;
      setRated(true);
      setRating(value);
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setSubmittingRate(false);
    }
  }

  // واجهة التحميل أثناء جلب البيانات
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
        <Spinner size="lg" color="primary" />
        <p className="mt-4 text-primary font-medium">جاري جلب الملف الصوتي...</p>
      </div>
    );
  }

  // واجهة الخطأ في حال عدم وجود الملف
  if (errorMsg || !track) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="max-w-md w-full shadow-md text-center p-6">
          <CardBody className="space-y-4">
            <span className="text-4xl">⚠️</span>
            <h1 className="text-xl font-bold text-danger">عذراً، المقطع غير متاح</h1>
            <p className="text-gray-500 text-sm">{errorMsg || "تأكد من صحة الرابط الممسوح من الـ QR Code."}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex items-center justify-center font-sans" dir="rtl">
      <div className="max-w-md w-full space-y-6">
        
        {/* اللوجو أو اسم البراند */}
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-extrabold text-primary">بالعربي 🗣️</h2>
          <p className="text-xs text-secondary font-semibold uppercase tracking-wider">Arabic Beyond Textbooks</p>
        </div>

        {/* كارت المقطع الصوتي المشغل */}
        <Card className="shadow-lg border-t-4 border-primary">
          <CardBody className="p-8 space-y-6 text-center">
            
            <div className="space-y-2">
              <span className="text-xs bg-secondary/10 text-secondary font-bold px-3 py-1 rounded-full">
                استماع متاح الآن
              </span>
              <h1 className="text-2xl font-bold text-primary pt-2">{track.title}</h1>
              {track.description && (
                <p className="text-gray-500 text-sm leading-relaxed">{track.description}</p>
              )}
            </div>

            {/* مشغل الصوت المدمج */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-center">
              <audio 
                src={track.audio_url} 
                controls 
                className="w-full outline-none h-10"
                controlsList="nodownload" 
              />
            </div>

            {/* مكون التقييم التفاعلي بالنجوم */}
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-600">قيم مستوى هذا المقطع الصوتي 👇</p>
              {rated ? (
                <p className="text-green-600 font-semibold text-sm animate-bounce">شكراً لك على تقييمك اللطيف! ❤️</p>
              ) : (
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      disabled={submittingRate}
                      onClick={() => handleRate(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="text-3xl focus:outline-none transition-transform hover:scale-125"
                    >
                      <span className={(hoverRating !== null ? star <= hoverRating : rating !== null ? star <= rating : false) ? "text-yellow-400" : "text-gray-300"}>
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </CardBody>
        </Card>

        {/* أزرار التواصل السريع والسوشيال ميديا بالأسفل خارج الكارد */}
        {settings && (
          <div className="space-y-3 pt-2">
            <p className="text-center text-sm font-semibold text-gray-500">تواصل معنا عبر منصاتنا الرسمية 👇</p>
            <div className="flex flex-col gap-2">
              {settings.whatsapp_number && (
                <Button
                  as="a"
                  href={`https://wa.me/${settings.whatsapp_number}?text=السلام%20عليكم،%20أنا%20استمع%20إلى%20كتاب%20بالعربي%20وأريد%20الاستفسار.`}
                  target="_blank"
                  color="success"
                  className="font-bold text-white shadow-sm h-11"
                >
                  💬 تواصل معنا عبر واتساب
                </Button>
              )}
              {settings.facebook_url && (
                <Button
                  as="a"
                  href={settings.facebook_url}
                  target="_blank"
                  color="primary"
                  className="font-bold shadow-sm h-11"
                >
                  🔵 تابعنا على فيسبوك
                </Button>
              )}
              {settings.instagram_url && (
                <Button
                  as="a"
                  href={settings.instagram_url}
                  target="_blank"
                  color="secondary"
                  className="font-bold shadow-sm h-11"
                >
                  📸 تابعنا على إنستجرام
                </Button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}