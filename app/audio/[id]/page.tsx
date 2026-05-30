"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Card, CardBody, Button, Spinner, Progress } from "@nextui-org/react";

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
  const [playCountIncremented, setPlayCountIncremented] = useState(false);

  // Theme and language configurations
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Audio elements
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Video elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoIsPlaying, setVideoIsPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoPortrait, setIsVideoPortrait] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dynamic document title based on language
  useEffect(() => {
    if (mounted && track) {
      document.title = lang === "ar" ? `${track.title} - بالعربي` : `${track.title} - BelArabi`;
    }
  }, [lang, mounted, track]);

  // Fetch track and settings from database
  useEffect(() => {
    if (!trackId) return;

    async function fetchData() {
      try {
        setLoading(true);

        const { data: trackData, error: trackError } = await supabase
          .from("audio_tracks")
          .select("*")
          .eq("id", trackId)
          .single();

        if (trackError) throw new Error("المقطع غير موجود أو تم حذفه.");
        setTrack(trackData);

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

  // Check if media url is a video
  const isVideoFile = (url: string) => {
    const cleanUrl = url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".mov") || cleanUrl.endsWith(".mkv");
  };

  // Increment play count (student side only)
  async function handlePlay() {
    if (playCountIncremented || !track) return;
    setPlayCountIncremented(true);
    try {
      const { data: latestTrack, error: fetchError } = await supabase
        .from("audio_tracks")
        .select("play_count")
        .eq("id", track.id)
        .single();

      if (!fetchError) {
        const currentCount = latestTrack?.play_count || 0;
        await supabase
          .from("audio_tracks")
          .update({ play_count: currentCount + 1 })
          .eq("id", track.id);
      }
    } catch (err) {
      console.error("Error incrementing play count:", err);
    }
  }

  // Submit star rating
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

  // Audio specific handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        handlePlay();
      }).catch(err => console.error("Audio playback error:", err));
    }
  };

  const seek = (amount: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + amount));
    }
  };

  // Video specific handlers
  const seekVideo = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoDuration, videoRef.current.currentTime + amount));
    }
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoIsPlaying) {
      videoRef.current.pause();
      setVideoIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setVideoIsPlaying(true);
        handlePlay();
      }).catch(err => console.error("Video playback error:", err));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const isRtl = lang === "ar";

  const t = {
    ar: {
      title: "مستودع الميديا التفاعلي",
      subtitle: "كتاب بالعربي التفاعلي",
      ratingText: "قيم مستوى هذا المقطع الصوتي 👇",
      thankYou: "شكراً لك على تقييمك اللطيف! ❤️",
      listenNow: "استماع متاح الآن",
      socialHeading: "تواصل معنا عبر منصاتنا الرسمية 👇",
      loadingText: "جاري جلب الملف الصوتي...",
      errorTitle: "عذراً، المقطع غير متاح",
      errorMsg: "تأكد من صحة الرابط الممسوح من الـ QR Code.",
    },
    en: {
      title: "Interactive Media Hub",
      subtitle: "BelArabi Interactive Textbook",
      ratingText: "Rate this audio lesson 👇",
      thankYou: "Thank you for your kind rating! ❤️",
      listenNow: "Available for Playback",
      socialHeading: "Get in touch with us 👇",
      loadingText: "Fetching media file...",
      errorTitle: "Sorry, media unavailable",
      errorMsg: "Please verify the QR Code link scanned.",
    }
  }[lang];

  // Floating background copy mini-logos
  const fishLogos = [
    { id: 1, className: "animate-fish-1 top-[12%] w-16 h-16", delay: "0s" },
    { id: 2, className: "animate-fish-2 top-[32%] w-20 h-20", delay: "4s" },
    { id: 3, className: "animate-fish-3 top-[52%] w-12 h-12", delay: "8s" },
    { id: 4, className: "animate-fish-4 top-[72%] w-16 h-16", delay: "2s" },
    { id: 5, className: "animate-fish-1 top-[22%] w-14 h-14", delay: "12s" },
    { id: 6, className: "animate-fish-2 top-[62%] w-18 h-18", delay: "6s" },
  ];

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center font-sans text-[#F1F5F9]">
        <Spinner size="lg" color="primary" />
        <p className="mt-4 text-cyan-400 font-bold animate-pulse">{t.loadingText}</p>
      </div>
    );
  }

  if (errorMsg || !track) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-sans text-[#F1F5F9]" dir={isRtl ? "rtl" : "ltr"}>
        <Card className="max-w-md w-full border border-red-500/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl text-center p-6 rounded-[24px]">
          <CardBody className="space-y-4">
            <span className="text-5xl animate-bounce">⚠️</span>
            <h1 className="text-xl font-black text-red-500">{t.errorTitle}</h1>
            <p className="text-slate-400 text-sm">{errorMsg || t.errorMsg}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`min-h-screen relative overflow-hidden transition-colors duration-500 font-sans flex flex-col justify-between ${
        theme === "dark"
          ? "bg-[#0F172A] text-[#F1F5F9] dark"
          : "bg-gradient-to-tr from-[#E2F1F8] via-[#F8FAFC] to-[#E8F5E9]/50 text-[#1E293B]"
      }`}
    >
      {/* Floating top header panel */}
      <header className="absolute top-4 left-4 right-4 flex justify-between items-center z-50 px-4">
        <div className="flex items-center gap-2 cursor-pointer group">
          <img src="/images/logo.png" alt="Mini Logo" className="w-8 h-8 object-contain transition-transform group-hover:scale-105" />
          <span className={`font-bold tracking-wider text-xs md:text-sm transition-colors duration-300 ${
            theme === "dark" ? "text-[#38BDF8]" : "text-[#0B355F]"
          }`}>
            BelArabi
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="flat"
            className={`font-extrabold rounded-full px-4 h-8 text-xs border transition-all duration-300 ${
              theme === "dark"
                ? "bg-[#1E293B] border-slate-700 text-[#38BDF8] hover:bg-slate-800"
                : "bg-white border-slate-200 text-[#0B355F] hover:bg-slate-100"
            }`}
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          >
            {lang === "ar" ? "EN" : "العربية"}
          </Button>

          <Button
            isIconOnly
            size="sm"
            variant="flat"
            className={`rounded-full h-8 w-8 min-w-8 text-sm transition-all duration-300 ${
              theme === "dark"
                ? "bg-[#1E293B] text-yellow-400 hover:bg-slate-800"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle Theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </Button>
        </div>
      </header>

      {/* Floating Logo Background (Fish Effect) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {fishLogos.map((fish) => (
          <img
            key={fish.id}
            src="/images/logo.png"
            alt=""
            className={`absolute pointer-events-none object-contain max-w-[80px] max-h-[80px] ${fish.className} ${
              theme === "dark" ? "opacity-[0.05]" : "opacity-[0.06]"
            }`}
            style={{ animationDelay: fish.delay }}
          />
        ))}
      </div>

      {/* Hidden native audio reference */}
      {!isVideoFile(track.audio_url) && (
        <audio
          ref={audioRef}
          src={track.audio_url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Main Glassmorphic Panel Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-10 pb-32 flex flex-col items-center justify-center z-10 relative">
        <div className="text-center space-y-1 mb-4 select-none">
          <h2 className={`text-3xl font-extrabold transition-colors duration-300 ${
            theme === "dark" ? "text-[#38BDF8]" : "text-[#0B355F]"
          }`}>
            {t.title}
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t.subtitle}</p>
        </div>

        <Card
          className={`w-full max-w-md border shadow-2xl transition-all duration-500 rounded-[32px] overflow-hidden backdrop-blur-xl ${
            theme === "dark"
              ? "bg-slate-900/30 border-white/20 shadow-black/40"
              : "bg-white/10 border-white/30 shadow-sky-900/5"
          }`}
        >
          <CardBody className="p-5 sm:p-6 space-y-4 text-center">
            
            <div className="space-y-2 select-none">
              <span className="text-[10px] uppercase bg-cyan-500/10 text-cyan-400 font-black px-3 py-1 rounded-full">
                {t.listenNow}
              </span>
              <h1 className={`text-2xl font-black pt-2 ${theme === "dark" ? "text-white" : "text-[#0B355F]"}`}>{track.title}</h1>
              {track.description && (
                <p className="text-slate-400 text-xs leading-relaxed">{track.description}</p>
              )}
            </div>

            {/* Premium Media Player Viewport */}
            <div className="py-2">
              {isVideoFile(track.audio_url) ? (
                // Smart Video Player Component
                <div className="space-y-3">
                  <div className="w-full max-w-sm mx-auto h-auto flex items-center justify-center bg-transparent border-none p-0 relative overflow-hidden group">
                    {/* Glowing Backing Aura */}
                    <div className={`absolute inset-0 bg-[#00B4D8]/10 blur-xl transition-opacity duration-500 opacity-60 ${videoIsPlaying ? "opacity-100" : ""}`}></div>
                    
                    <video
                      ref={videoRef}
                      src={track.audio_url}
                      className="w-full h-auto max-h-[320px] rounded-2xl outline-none shadow-md bg-black"
                      onTimeUpdate={() => {
                        if (videoRef.current) setVideoCurrentTime(videoRef.current.currentTime);
                      }}
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          setVideoDuration(videoRef.current.duration);
                          setIsVideoPortrait(videoRef.current.videoHeight > videoRef.current.videoWidth);
                        }
                      }}
                      onEnded={() => setVideoIsPlaying(false)}
                      onPlay={handlePlay}
                    />

                    {/* Custom Play/Pause overlay triggers */}
                    <div 
                      onClick={toggleVideoPlay}
                      className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-black/60 flex items-center justify-center">
                        {videoIsPlaying ? (
                          <span className="text-white text-xl">⏸️</span>
                        ) : (
                          <span className="text-white text-xl pl-0.5">▶️</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Minimal Timeline Scrubber and Controls */}
                  <div className="space-y-2 max-w-sm mx-auto">
                    <Progress
                      size="sm"
                      value={videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0}
                      color="secondary"
                      className="h-1.5 cursor-pointer rounded-full"
                      onClick={(e) => {
                        if (videoRef.current && videoDuration > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const percentage = clickX / rect.width;
                          videoRef.current.currentTime = percentage * videoDuration;
                        }
                      }}
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{formatTime(videoCurrentTime)}</span>
                      <span>{formatTime(videoDuration)}</span>
                    </div>

                    <div className="flex justify-center items-center gap-6 w-full pt-2">
                      <button 
                        type="button" 
                        className="text-slate-400 hover:text-[#00B4D8] transition-colors"
                        onClick={() => seekVideo(-10)}
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 6h2v12H6zm3.5 6L18 6v12z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={toggleVideoPlay}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md shadow-cyan-500/10 ${
                          videoIsPlaying ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-slate-900"
                        }`}
                      >
                        {videoIsPlaying ? (
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
                        className="text-slate-400 hover:text-[#00B4D8] transition-colors"
                        onClick={() => seekVideo(10)}
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 18l8.5-6L6 6zm10-12h2v12-2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // High-Fidelity Custom Audio Player Component
                <div className="space-y-3">
                  {/* Glowing circular container with brand logo */}
                  <div className="relative group flex justify-center my-2.5">
                    <div className={`absolute -inset-4 bg-[#00B4D8] opacity-20 blur-2xl rounded-full ${isPlaying ? "animate-pulse" : ""}`}></div>
                    <div className={`w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center shadow-lg relative ${
                      isPlaying ? "animate-spin [animation-duration:8s]" : ""
                    }`}>
                      <svg className="w-20 h-20 text-slate-800 absolute opacity-50" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <img 
                        src="/images/logo.png" 
                        alt="BelArabi Brand Logo" 
                        className="w-14 h-14 object-contain relative z-10 animate-pulse" 
                      />
                    </div>
                  </div>

                  {/* Soundwave equalizer visualizer (pulsing when audio is playing) */}
                  <div className="h-7 flex items-end justify-center gap-1.5 w-full px-6 mb-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((bar) => {
                      const baseHeights = [12, 24, 16, 32, 8, 28, 20, 32, 12, 24, 8, 20, 28, 16, 24];
                      return (
                        <div
                          key={bar}
                          className="w-1 rounded-full bg-[#00B4D8] transition-all duration-300"
                          style={{
                            height: isPlaying ? `${baseHeights[bar - 1]}px` : "4px",
                            transformOrigin: "bottom",
                            animation: isPlaying
                              ? `eq-bar ${[0.6, 0.8, 0.5, 0.9, 0.4, 0.7, 0.5, 0.8, 0.6, 0.9, 0.4, 0.7, 0.8, 0.5, 0.6][bar - 1]}s ease-in-out infinite alternate`
                              : "none"
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Scrubber timeline and controls */}
                  <div className="space-y-2">
                    <Progress
                      size="sm"
                      value={duration > 0 ? (currentTime / duration) * 100 : 0}
                      color="secondary"
                      className="h-1.5 cursor-pointer rounded-full"
                      onClick={(e) => {
                        if (audioRef.current && duration > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const percentage = clickX / rect.width;
                          audioRef.current.currentTime = percentage * duration;
                        }
                      }}
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>

                    <div className="flex justify-center items-center gap-6 w-full pt-2">
                      <button 
                        type="button" 
                        className="text-slate-400 hover:text-[#00B4D8] transition-colors"
                        onClick={() => seek(-10)}
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 6h2v12H6zm3.5 6L18 6v12z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={togglePlay}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md shadow-cyan-500/10 ${
                          isPlaying ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-slate-900"
                        }`}
                      >
                        {isPlaying ? (
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
                        className="text-slate-400 hover:text-[#00B4D8] transition-colors"
                        onClick={() => seek(10)}
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 18l8.5-6L6 6zm10-12h2v12h-2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Star Ratings */}
            <div className="border-t border-slate-200/10 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400">{t.ratingText}</p>
              {rated ? (
                <p className="text-emerald-400 font-bold text-sm animate-bounce">{t.thankYou}</p>
              ) : (
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      disabled={submittingRate}
                      onClick={() => handleRate(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="text-3xl focus:outline-none transition-transform hover:scale-125 duration-200"
                    >
                      <span className={(hoverRating !== null ? star <= hoverRating : rating !== null ? star <= rating : false) ? "text-amber-400" : "text-slate-600"}>
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </CardBody>
        </Card>

        {/* Official Social Feeds & Contact Panel */}
        {settings && (
          <div className="space-y-4 pt-4 w-full max-w-md select-none">
            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">{t.socialHeading}</p>
            <div className="flex flex-col gap-2.5">
              {settings.whatsapp_number && (
                <Button
                  as="a"
                  href={`https://wa.me/${settings.whatsapp_number}?text=السلام%20عليكم،%20أنا%20استمع%20إلى%20كتاب%20بالعربي%20وأريد%20الاستفسار.`}
                  target="_blank"
                  style={{ backgroundColor: "#25D366" }}
                  className="font-bold text-white shadow-sm h-11 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>{isRtl ? "تواصل معنا عبر واتساب" : "Contact us on WhatsApp"}</span>
                </Button>
              )}
              {settings.facebook_url && (
                <Button
                  as="a"
                  href={settings.facebook_url}
                  target="_blank"
                  style={{ backgroundColor: "#1877F2" }}
                  className="font-bold text-white shadow-sm h-11 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>{isRtl ? "تابعنا على فيسبوك" : "Follow us on Facebook"}</span>
                </Button>
              )}
              {settings.instagram_url && (
                <Button
                  as="a"
                  href={settings.instagram_url}
                  target="_blank"
                  style={{ backgroundColor: "#E4405F" }}
                  className="font-bold text-white shadow-sm h-11 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  <span>{isRtl ? "تابعنا على إنستجرام" : "Follow us on Instagram"}</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3D Animated Wave overlay */}
      <div className="absolute bottom-0 left-0 w-full h-[150px] md:h-[190px] overflow-hidden leading-[0] z-20 pointer-events-none select-none">
        <div className="absolute bottom-0 left-0 w-[200%] h-full opacity-45 animate-wave-back">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className={`w-full h-full transition-colors duration-500 ${
              theme === "dark" ? "fill-[#0EA5E9]" : "fill-[#00B4D8]"
            }`}
          >
            <path d="M0,70 Q150,90 300,70 T600,70 T900,70 T1200,70 L1200,120 L0,120 Z" />
          </svg>
        </div>

        <div className="absolute bottom-0 left-0 w-[200%] h-[90%] animate-wave-front">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className={`w-full h-full transition-colors duration-500 ${
              theme === "dark" ? "fill-[#0F172A]" : "fill-[#0B355F]"
            }`}
          >
            <path d="M0,60 Q150,30 300,60 T600,60 T900,60 T1200,60 L1200,120 L0,120 Z" />
          </svg>
        </div>
      </div>

      {/* Static Footer */}
      <footer className="absolute bottom-4 left-0 w-full text-center z-30 pointer-events-auto">
        <p className="text-[10px] md:text-xs text-white/70 font-semibold tracking-wider">
          © {new Date().getFullYear()} BelArabi. All rights reserved.
        </p>
      </footer>
    </div>
  );
}