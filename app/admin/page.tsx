"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Button, Input, Textarea, Card, CardBody, Progress } from "@nextui-org/react";
import TrackList from "./components/TrackList";

export default function AdminDashboard() {
  const router = useRouter();

  // Navigation state (defaults to 'overview')
  const [activeTab, setActiveTab] = useState<"overview" | "upload" | "media" | "social" | "stats">("overview");

  // Dynamic language and theme configurations matching landing pages
  const [lang, setLang] = useState<"ar" | "en">("en");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Sidebar collapsible mobile state & play counts
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [audioPlays, setAudioPlays] = useState(0);
  const [videoPlays, setVideoPlays] = useState(0);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const [ratingsList, setRatingsList] = useState<any[]>([]);
  const [tracksList, setTracksList] = useState<any[]>([]);
  const [isVideoPortrait, setIsVideoPortrait] = useState(false);

  // Authentication and data synchronization triggers
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // Dynamic database loaded metric states
  const [totalTracks, setTotalTracks] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [averageRating, setAverageRating] = useState("0.0");
  const [starBreakdown, setStarBreakdown] = useState<number[]>([0, 0, 0, 0, 0]);
  const [recentTracks, setRecentTracks] = useState<any[]>([]);

  // File Upload states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<"audio" | "video">("audio");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Drag & drop file selection reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Track Preview playback states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Social settings states (supporting all 6 channels)
  const [facebook, setFacebook] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [website, setWebsite] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");

  // Collapse sidebar on mobile on initial load
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Authenticate user and pull ratings, settings, and track statistics dynamically
  useEffect(() => {
    async function checkAuthAndFetchData() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setLoadingAuth(false);

      // 1. Fetch Social Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (settingsData && !settingsError) {
        setFacebook(settingsData.facebook_url || "");
        setWhatsapp(settingsData.whatsapp_number || "");
        setInstagram(settingsData.instagram_url || "");

        // Parse other_links JSON column safely
        let other: any = {};
        if (settingsData.other_links) {
          if (typeof settingsData.other_links === "object") {
            other = settingsData.other_links;
          } else {
            try {
              other = JSON.parse(settingsData.other_links);
            } catch (e) {
              console.error("Failed to parse other_links", e);
            }
          }
        }
        setTiktok(other.tiktok_url || "");
        setYoutube(other.youtube_url || "");
        setWebsite(other.website_url || "");
      }

      // 2. Fetch tracks and calculate dynamic total
      const { data: tracksData, error: tracksError } = await supabase
        .from("audio_tracks")
        .select("id, title, created_at, description, audio_url, play_count");

      if (tracksData && !tracksError) {
        setTracksList(tracksData);
        setTotalTracks(tracksData.length);
        setRecentTracks(tracksData.slice(0, 3)); // Display top 3 recents
        
        let aPlays = 0;
        let vPlays = 0;
        tracksData.forEach((track: any) => {
          const plays = track.play_count || 0;
          const isVideo = track.audio_url && (
            track.audio_url.split("?")[0].toLowerCase().endsWith(".mp4") ||
            track.audio_url.split("?")[0].toLowerCase().endsWith(".webm") ||
            track.audio_url.split("?")[0].toLowerCase().endsWith(".mov") ||
            track.audio_url.split("?")[0].toLowerCase().endsWith(".mkv")
          );
          if (isVideo) {
            vPlays += plays;
          } else {
            aPlays += plays;
          }
        });
        setAudioPlays(aPlays);
        setVideoPlays(vPlays);
      }

      // 3. Fetch ratings and compute counts, averages, and star groupings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("rating_value, created_at");

      if (ratingsData && !ratingsError) {
        setRatingsList(ratingsData);
        const total = ratingsData.length;
        setTotalRatings(total);

        const sum = ratingsData.reduce((acc, r) => acc + r.rating_value, 0);
        const avg = total > 0 ? (sum / total).toFixed(1) : "0.0";
        setAverageRating(avg);

        // Group into 5, 4, 3, 2, 1 ratings
        const breakdown = [0, 0, 0, 0, 0];
        ratingsData.forEach((r) => {
          const val = Math.round(r.rating_value);
          if (val >= 1 && val <= 5) {
            breakdown[val - 1]++;
          }
        });
        setStarBreakdown(breakdown);
      }
    }

    checkAuthAndFetchData();
  }, [router, refreshTrigger]);

  // Dynamic browser tab title hook
  useEffect(() => {
    document.title = lang === "ar" ? "لوحة التحكم - بالعربي" : "Admin Dashboard - BelArabi";
  }, [lang]);

  // Hook reactive preview player URL on file attached
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      setIsVideoPortrait(false);
      
      // Delay slightly to allow the element to render and ref to bind
      setTimeout(() => {
        if (mediaType === "audio" && audioPlayerRef.current) {
          audioPlayerRef.current.load();
        } else if (mediaType === "video" && videoPlayerRef.current) {
          videoPlayerRef.current.load();
        }
      }, 50);

      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file, mediaType]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  // Live player audio timing hook
  const handleTimeUpdate = () => {
    if (mediaType === "audio" && audioPlayerRef.current) {
      setCurrentTime(audioPlayerRef.current.currentTime);
    } else if (mediaType === "video" && videoPlayerRef.current) {
      setCurrentTime(videoPlayerRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaType === "audio" && audioPlayerRef.current) {
      setDuration(audioPlayerRef.current.duration);
    } else if (mediaType === "video" && videoPlayerRef.current) {
      setDuration(videoPlayerRef.current.duration);
      if (videoPlayerRef.current) {
        setIsVideoPortrait(videoPlayerRef.current.videoHeight > videoPlayerRef.current.videoWidth);
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const togglePlayback = () => {
    if (!file) return;
    if (mediaType === "audio" && audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => console.error("Player error", err));
      }
    } else if (mediaType === "video" && videoPlayerRef.current) {
      if (isPlaying) {
        videoPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        videoPlayerRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => console.error("Video player error", err));
      }
    }
  };

  // Direct Audio/Video Original Upload Logic
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) {
      setUploadStatus("يرجى إدخال العنوان واختيار ملف صوتي أولاً.");
      return;
    }

    try {
      setUploading(true);
      setUploadStatus("جاري رفع الملف الصوتي الأصلي...");

      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(fileName, file, { cacheControl: "3600" });

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
      setRefreshTrigger(prev => !prev);
    } catch (error: any) {
      console.error(error);
      setUploadStatus(`حدث خطأ أثناء الرفع: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  // Database-Safe Social settings saving via other_links JSON column
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
          other_links: {
            tiktok_url: tiktok,
            youtube_url: youtube,
            website_url: website,
          },
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

  // Secure sign out
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center font-sans">
        <div className="text-center space-y-2 select-none">
          <p className="text-[#38BDF8] font-bold text-lg animate-pulse">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  // Floating background copies configuration (fish-like ocean drift)
  const fishLogos = [
    { id: 1, className: "animate-fish-1 top-[12%] w-16 h-16", delay: "0s" },
    { id: 2, className: "animate-fish-2 top-[32%] w-20 h-20", delay: "4s" },
    { id: 3, className: "animate-fish-3 top-[52%] w-12 h-12", delay: "8s" },
    { id: 4, className: "animate-fish-4 top-[72%] w-16 h-16", delay: "2s" },
    { id: 5, className: "animate-fish-1 top-[22%] w-14 h-14", delay: "12s" },
    { id: 6, className: "animate-fish-2 top-[62%] w-18 h-18", delay: "6s" },
  ];

  // Helper to dynamically process ratings for the SVG chart
  const getProcessedRatingsChartData = () => {
    if (!ratingsList || ratingsList.length === 0) {
      // Return beautiful fallback coordinates if no ratings yet
      return {
        points: [
          { x: 10, y: 50, label: "May 10", val: 0 },
          { x: 31.25, y: 27, label: "May 12", val: 3.5 },
          { x: 52.5, y: 36.6, label: "May 14", val: 2.8 },
          { x: 73.75, y: 15, label: "May 16", val: 4.8 },
          { x: 95, y: 20, label: "May 18", val: 4.2 }
        ],
        pathD: "M10,50 Q31.25,23.3 52.5,36.6 T73.75,15 T95,20",
        areaD: "M10,50 Q31.25,23.3 52.5,36.6 T73.75,15 T95,20 L95,50 L10,50 Z"
      };
    }

    // Group ratings by date (YYYY-MM-DD) and compute average rating
    const grouped: Record<string, { sum: number; count: number }> = {};
    ratingsList.forEach((r) => {
      if (!r.created_at) return;
      const d = r.created_at.split("T")[0]; // YYYY-MM-DD
      if (!grouped[d]) grouped[d] = { sum: 0, count: 0 };
      grouped[d].sum += r.rating_value;
      grouped[d].count += 1;
    });

    // Sort dates ascending
    const sortedDates = Object.keys(grouped).sort();
    
    // Limit to last 5 entries to fit the chart beautifully
    const displayDates = sortedDates.slice(-5);
    
    // If we only have 1 date, add an artificial starting point to make it a line
    if (displayDates.length === 1) {
      const singleDate = displayDates[0];
      const avg = grouped[singleDate].sum / grouped[singleDate].count;
      displayDates.unshift("Start");
      grouped["Start"] = { sum: avg, count: 1 };
    }

    // Map to coordinates (X: 10 to 95, Y: 50 to 10. Note: higher rating means smaller Y coordinate!)
    // Y range: 10 (rating 5) to 50 (rating 0)
    // Formula for Y: Y = 50 - ((avg / 5) * 40)
    const points = displayDates.map((date, idx) => {
      const avg = grouped[date].sum / grouped[date].count;
      const x = 10 + (idx * (85 / (displayDates.length - 1)));
      const y = 50 - ((avg / 5) * 40);
      
      // format date label: e.g. "05/30"
      let label = date;
      if (date !== "Start") {
        const parts = date.split("-");
        if (parts.length >= 3) {
          label = `${parts[1]}/${parts[2]}`; // MM/DD
        }
      } else {
        label = "";
      }
      return { x, y, label, val: avg };
    });

    // Construct curve paths (quadratic/bezier curves or straight line segments)
    let pathD = "";
    let areaD = "";
    if (points.length > 1) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }
      areaD = `${pathD} L ${points[points.length - 1].x} 50 L ${points[0].x} 50 Z`;
    }

    return { points, pathD, areaD };
  };

  // Helper to dynamically process plays timeline for the SVG chart
  const getProcessedPlaysTimelineData = () => {
    if (!tracksList || tracksList.length === 0) {
      return {
        points: [
          { x: 10, y: 50, label: "May 10", val: 0 },
          { x: 31.25, y: 40, label: "May 12", val: 5 },
          { x: 52.5, y: 30, label: "May 14", val: 12 },
          { x: 73.75, y: 22, label: "May 16", val: 20 },
          { x: 95, y: 15, label: "May 18", val: 35 }
        ],
        pathD: "M10,50 L31.25,40 L52.5,30 L73.75,22 L95,15",
        areaD: "M10,50 L31.25,40 L52.5,30 L73.75,22 L95,15 L95,50 L10,50 Z",
        maxVal: 35
      };
    }

    // Group plays by track creation date (YYYY-MM-DD)
    const grouped: Record<string, number> = {};
    tracksList.forEach((t) => {
      if (!t.created_at) return;
      const d = t.created_at.split("T")[0]; // YYYY-MM-DD
      grouped[d] = (grouped[d] || 0) + (t.play_count || 0);
    });

    // Sort dates ascending
    const sortedDates = Object.keys(grouped).sort();
    
    // Cumulative play counts over time
    let cumulativeSum = 0;
    const timeline = sortedDates.map((date) => {
      cumulativeSum += grouped[date];
      return { date, val: cumulativeSum };
    });

    // Limit to last 5 entries
    const displayTimeline = timeline.slice(-5);

    if (displayTimeline.length === 1) {
      displayTimeline.unshift({ date: "Start", val: 0 });
    }

    const maxVal = Math.max(...displayTimeline.map(t => t.val), 10);

    // Map to coordinates (X: 10 to 95, Y: 50 to 10)
    // Formula for Y: Y = 50 - ((val / maxVal) * 40)
    const points = displayTimeline.map((item, idx) => {
      const x = 10 + (idx * (85 / (displayTimeline.length - 1)));
      const y = 50 - ((item.val / maxVal) * 40);
      
      let label = item.date;
      if (item.date !== "Start") {
        const parts = item.date.split("-");
        if (parts.length >= 3) {
          label = `${parts[1]}/${parts[2]}`; // MM/DD
        }
      } else {
        label = "";
      }
      return { x, y, label, val: item.val };
    });

    // Curve paths
    let pathD = "";
    let areaD = "";
    if (points.length > 1) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }
      areaD = `${pathD} L ${points[points.length - 1].x} 50 L ${points[0].x} 50 Z`;
    }

    return { points, pathD, areaD, maxVal };
  };

  const isVideoFile = (url: string) => {
    const cleanUrl = url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".mov") || cleanUrl.endsWith(".mkv");
  };

  const isRtl = lang === "ar";

  return (
    <div
      dir="rtl"
      className={`w-full h-screen overflow-hidden relative flex flex-col md:flex-row transition-colors duration-500 font-sans ${
        theme === "dark"
          ? "bg-[#0F172A] text-[#F1F5F9] dark"
          : "bg-gradient-to-tr from-[#E2F1F8] via-[#F8FAFC] to-[#E8F5E9]/50 text-[#1E293B]"
      }`}
    >
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

      {/* Hidden live preview player reference */}
      {previewUrl && mediaType === "audio" && (
        <audio
          ref={audioPlayerRef}
          src={previewUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Sidebar Overlay on mobile */}
      {isSidebarOpen && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`absolute md:relative top-0 right-0 h-full z-50 md:z-30 flex flex-col justify-between transition-all duration-300 border-l ${
          theme === "dark"
            ? "bg-[#1E293B]/80 md:bg-[#1E293B]/40 border-white/10 text-white"
            : "bg-white/80 md:bg-white/40 border-slate-200/50 text-slate-800"
        } backdrop-blur-xl ${
          isSidebarOpen
            ? "w-64 p-6 translate-x-0 shadow-2xl md:shadow-none"
            : "w-64 md:w-0 p-0 md:p-0 overflow-hidden border-none translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top brand */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 dark:border-white/5 pb-4">
            <img src="/images/logo.png" alt="BelArabi Logo" className="w-10 h-10 object-contain" />
            <span className={`text-xl font-black tracking-wider ${theme === "dark" ? "text-white" : "text-slate-900"}`}>BelArabi</span>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {[
              { id: "overview", nameAr: "لوحة التحكم", nameEn: "Dashboard Overview", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                </svg>
              )},
              { id: "upload", nameAr: "رفع محتوى", nameEn: "Upload Section", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )},
              { id: "media", nameAr: "إدارة الوسائط", nameEn: "Manage Media", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              )},
              { id: "social", nameAr: "إعدادات التواصل", nameEn: "Social Settings", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )},
              { id: "stats", nameAr: "الإحصائيات", nameEn: "Statistics", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm9-1v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              )},
            ].map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    active
                      ? theme === "dark"
                        ? "bg-white/15 text-white shadow-inner"
                        : "bg-slate-900/10 text-slate-900 shadow-sm"
                      : theme === "dark"
                      ? "text-white/70 hover:text-white hover:bg-white/5"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/5"
                  }`}
                >
                  {item.icon}
                  <span>{isRtl ? item.nameAr : item.nameEn}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom logout */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
            theme === "dark"
              ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
              : "text-red-600 hover:text-red-700 hover:bg-red-500/5 border-red-500/10"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
        </button>
      </aside>

      {/* --- CONTENT CONTAINER --- */}
      <div className="flex-1 h-full flex flex-col overflow-hidden z-10 relative">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between p-4 border-b border-white/10 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger toggle button */}
            <Button
              isIconOnly
              variant="light"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-[#00B4D8] dark:text-[#38BDF8] hover:bg-[#00B4D8]/10 rounded-xl"
              aria-label="Toggle Menu"
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z" clipRule="evenodd" />
              </svg>
            </Button>
            {!isSidebarOpen && (
              <div className="flex items-center gap-2 select-none">
                <img src="/images/logo.png" alt="BelArabi Logo" className="w-6 h-6 object-contain" />
                <span className="font-black text-sm tracking-wide">BelArabi</span>
              </div>
            )}
          </div>

          {/* Theme & Language Toggles */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <Button
              size="sm"
              variant="flat"
              onClick={() => setLang(prev => prev === "ar" ? "en" : "ar")}
              className={`font-black text-xs h-9 min-w-9 px-0 rounded-xl bg-opacity-20 ${
                theme === "dark" ? "bg-slate-700 text-[#38BDF8]" : "bg-slate-300 text-[#00B4D8]"
              }`}
            >
              {lang === "ar" ? "EN" : "عربي"}
            </Button>

            {/* Theme Toggle */}
            <Button
              size="sm"
              variant="flat"
              onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
              className={`font-black text-xs h-9 min-w-9 px-0 rounded-xl bg-opacity-20 ${
                theme === "dark" ? "bg-slate-700 text-[#38BDF8]" : "bg-slate-300 text-[#00B4D8]"
              }`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </Button>
          </div>
        </header>

        {/* --- MAIN PANEL AREA --- */}
        <main className="flex-grow overflow-y-auto p-6 md:p-8 pb-40 md:pb-52 z-10 relative max-w-7xl mx-auto w-full">
          
          {/* --- OVERVIEW TAB PANEL --- */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header Slogan */}
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h1 className={`text-2xl md:text-3xl font-black ${theme === "dark" ? "text-white" : "text-[#0B355F]"}`}>
                    {isRtl ? "لوحة التحكم الرئيسية" : "Dashboard Overview"}
                  </h1>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">
                    {isRtl ? "مرحباً بك يا باشا، راقب مقاطعك وإحصائيات كتابك التفاعلي" : "Welcome back, manage your interactive textbook media and feeds."}
                  </p>
                </div>
              </div>

              {/* Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  {
                    title: isRtl ? "إجمالي الصوتيات" : "Total Tracks",
                    value: totalTracks,
                    sub: "+3 this month",
                    color: "from-blue-600/10 to-cyan-500/10 border-blue-500/20 text-blue-500 dark:text-cyan-400",
                  },
                  {
                    title: isRtl ? "إجمالي التقييمات" : "Total Ratings",
                    value: totalRatings,
                    sub: "+45 this month",
                    color: "from-green-600/10 to-teal-500/10 border-green-500/20 text-green-500 dark:text-emerald-400",
                  },
                  {
                    title: isRtl ? "متوسط التقييم" : "Average Rating",
                    value: `${averageRating} / 5`,
                    sub: "+0.2 this month",
                    color: "from-amber-600/10 to-orange-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400",
                  },
                ].map((m, idx) => (
                  <Card
                    key={idx}
                    className={`border bg-gradient-to-tr ${m.color} shadow-sm rounded-3xl transition-all duration-300 hover:-translate-y-1`}
                  >
                    <CardBody className="p-6 flex flex-row items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold opacity-85">{m.title}</span>
                        <h3 className="text-2xl font-black">{m.value}</h3>
                        <span className="text-[10px] opacity-70 block">{m.sub}</span>
                      </div>
                      {/* Tiny decorative SVG sparkline graph */}
                      <svg className="w-14 h-8 opacity-65" viewBox="0 0 50 20">
                        <path
                          d="M0,15 Q10,5 20,12 T40,6 T50,14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {/* Quick Access Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Recent Audio list */}
                <div className="lg:col-span-8">
                  <Card className={`rounded-3xl border ${theme === "dark" ? "bg-[#1E293B]/80 border-slate-700/50" : "bg-white border-slate-200/60"}`}>
                    <CardBody className="p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200/10 pb-3">
                        <h3 className={`font-black text-base ${theme === "dark" ? "text-white" : "text-primary"}`}>
                          {isRtl ? "📂 آخر المقاطع المرفوعة" : "Recent Uploads"}
                        </h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() => setActiveTab("media")}
                          className="text-xs font-bold text-secondary bg-secondary/10"
                        >
                          {isRtl ? "عرض الكل" : "View All"}
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {recentTracks.map((track) => (
                          <div
                            key={track.id}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${
                              theme === "dark"
                                ? "bg-slate-800/50 border-slate-700/40 hover:bg-slate-800"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <div className="text-right">
                              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">{track.title}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">{track.description || "—"}</p>
                            </div>
                            <span className="text-xs bg-cyan-500/10 text-[#00B4D8] font-extrabold px-3 py-1 rounded-full">
                              {isRtl ? "متاح" : "Active"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                </div>

                {/* Quick ratings overview SVG Chart */}
                <div className="lg:col-span-4">
                  <Card className={`rounded-3xl border ${theme === "dark" ? "bg-[#1E293B]/80 border-slate-700/50" : "bg-white border-slate-200/60"}`}>
                    <CardBody className="p-6 space-y-4">
                      <h3 className={`font-black text-base border-b border-slate-200/10 pb-3 ${theme === "dark" ? "text-white" : "text-primary"}`}>
                        {isRtl ? "📈 نظرة عامة على التقييمات" : "Ratings Overview"}
                      </h3>
                      <div className="flex flex-col h-48 relative w-full mt-2">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 60">
                          {/* Area Gradient Under Curve */}
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#00B4D8" stopOpacity="0.0" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="1.5" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>
                          
                          {/* Grid Lines */}
                          <line x1="10" y1="10" x2="95" y2="10" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                          <line x1="10" y1="23.3" x2="95" y2="23.3" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                          <line x1="10" y1="36.6" x2="95" y2="36.6" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                          <line x1="10" y1="50" x2="95" y2="50" stroke="currentColor" strokeOpacity="0.15" />
                          
                          <line x1="10" y1="10" x2="10" y2="50" stroke="currentColor" strokeOpacity="0.15" />
                          <line x1="31.25" y1="10" x2="31.25" y2="50" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                          <line x1="52.5" y1="10" x2="52.5" y2="50" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                          <line x1="73.75" y1="10" x2="73.75" y2="50" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                          <line x1="95" y1="10" x2="95" y2="50" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />

                          {/* Y-Axis Ticks */}
                          <text x="6" y="12" className="fill-slate-400 font-bold text-[5px]" textAnchor="end">5.0</text>
                          <text x="6" y="25" className="fill-slate-400 font-bold text-[5px]" textAnchor="end">3.5</text>
                          <text x="6" y="38" className="fill-slate-400 font-bold text-[5px]" textAnchor="end">2.0</text>
                          <text x="6" y="52" className="fill-slate-400 font-bold text-[5px]" textAnchor="end">0.0</text>

                          {/* Curve Path Area */}
                          {getProcessedRatingsChartData().areaD && (
                            <path d={getProcessedRatingsChartData().areaD} fill="url(#chartGrad)" />
                          )}
                          
                          {/* Glowing Line Curve */}
                          {getProcessedRatingsChartData().pathD && (
                            <path
                              d={getProcessedRatingsChartData().pathD}
                              fill="none"
                              stroke="#00B4D8"
                              strokeWidth="2"
                              strokeLinecap="round"
                              filter="url(#glow)"
                            />
                          )}
                          
                          {/* Dots */}
                          {getProcessedRatingsChartData().points.map((pt, index) => (
                            <g key={index}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="2"
                                fill="#00B4D8"
                                stroke={theme === "dark" ? "#0F172A" : "#FFFFFF"}
                                strokeWidth="0.5"
                                className="transition-all duration-200 hover:r-3 cursor-pointer"
                              />
                              <title>{`${pt.label || 'Rating'}: ${pt.val.toFixed(1)}`}</title>
                            </g>
                          ))}

                          {/* Dynamic Date Labels inside SVG */}
                          {getProcessedRatingsChartData().points.map((pt, index) => (
                            <text
                              key={index}
                              x={pt.x}
                              y="56"
                              className="fill-slate-400 font-bold text-[4px]"
                              textAnchor="middle"
                            >
                              {pt.label}
                            </text>
                          ))}
                        </svg>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* --- UPLOAD TAB PANEL --- */}
          {activeTab === "upload" && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h1 className={`text-2xl md:text-3xl font-black ${theme === "dark" ? "text-white" : "text-[#0B355F]"}`}>
                  {isRtl ? "رفع محتوى صوتي أو مرئي جديد" : "Upload Section"}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  {isRtl ? "قم بسحب ملفك وإدخال عنوانه لتوليد الـ QR Code الخاص به فوراً" : "Drag and drop your file to generate its respective QR Code immediately."}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Form Input Panel */}
                <div className="lg:col-span-7">
                  <Card className={`rounded-3xl border ${theme === "dark" ? "bg-[#1E293B]/80 border-slate-700/50" : "bg-white border-slate-200/60"}`}>
                    <CardBody className="p-8 space-y-6">
                      <form onSubmit={handleUpload} className="space-y-5">
                        {/* Title */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold">{isRtl ? "عنوان الدرس / المقطع" : "Track Title"}</label>
                          <Input
                            placeholder={isRtl ? "مثال: الدرس الأول - حروف الهجاء" : "Lesson 1: Greetings"}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            isRequired
                            classNames={{
                              inputWrapper: `h-11 rounded-xl border ${
                                theme === "dark" ? "bg-slate-800/80 border-slate-700/60 focus-within:border-[#38BDF8]" : "bg-slate-50 border-slate-200 focus-within:border-[#00B4D8]"
                              }`
                            }}
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold">{isRtl ? "وصف الدرس" : "Description"}</label>
                          <Textarea
                            placeholder={isRtl ? "اكتب وصفاً أو ملاحظات تظهر للطلاب تحت المقطع..." : "Write a short summary or vocabulary lists..."}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            classNames={{
                              inputWrapper: `rounded-xl border ${
                                theme === "dark" ? "bg-slate-800/80 border-slate-700/60 focus-within:border-[#38BDF8]" : "bg-slate-50 border-slate-200 focus-within:border-[#00B4D8]"
                              }`
                            }}
                          />
                        </div>

                        {/* Media selector buttons */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold block">{isRtl ? "نوع الملف" : "Media Type"}</label>
                          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit border border-slate-200/10">
                            <button
                              type="button"
                              onClick={() => {
                                setMediaType("audio");
                                setFile(null);
                              }}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                mediaType === "audio"
                                  ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-[#38BDF8]"
                                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                              }`}
                            >
                              🔊 {isRtl ? "ملف صوتي" : "Audio File"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMediaType("video");
                                setFile(null);
                              }}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                mediaType === "video"
                                  ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-[#38BDF8]"
                                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                              }`}
                            >
                              📺 {isRtl ? "ملف مرئي" : "Video File"}
                            </button>
                          </div>
                        </div>

                        {/* Drag & Drop File Container */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold block">{isRtl ? "ملف الميديا" : "Media File"}</label>
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 select-none ${
                              isDragging
                                ? "border-[#00B4D8] bg-[#00B4D8]/5"
                                : theme === "dark"
                                ? "border-slate-700 hover:border-slate-500 bg-slate-800/30"
                                : "border-slate-300 hover:border-slate-400 bg-slate-50"
                            }`}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept={mediaType === "audio" ? "audio/*" : "video/*"}
                              className="hidden"
                              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                            />
                            <svg className="w-10 h-10 text-[#00B4D8] animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-xs font-bold">
                              {isRtl ? "قم بسحب وإلقاء ملفك هنا أو اضغط للتصفح" : "Drag and drop your file here, or click to browse"}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              {mediaType === "audio" ? "MP3, WAV, M4A up to 50MB" : "MP4, WEBM up to 100MB"}
                            </span>
                          </div>
                        </div>

                        {/* Attached File Stats Indicator */}
                        {file && (
                          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-cyan-600 dark:text-cyan-400 truncate max-w-[200px]">{file.name}</span>
                              <span className="text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            <Progress
                              size="sm"
                              value={100}
                              color="success"
                              className="h-1.5"
                            />
                            <span className="text-[10px] text-emerald-600 font-extrabold text-left">Upload ready 100%</span>
                          </div>
                        )}

                        {/* Process/Submit CTA */}
                        <Button
                          type="submit"
                          color="primary"
                          className={`w-full font-extrabold h-11 rounded-xl shadow-md ${
                            theme === "dark"
                              ? "bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8]"
                              : "bg-gradient-to-r from-[#00B4D8] to-[#0B355F]"
                          }`}
                          isLoading={uploading}
                        >
                          {uploading ? (isRtl ? "جاري الرفع والمعالجة..." : "Processing...") : (isRtl ? "ضغط وحفظ مقطع الميديا" : "Compress & Upload Track")}
                        </Button>

                        {uploadStatus && (
                          <p className={`text-xs text-center font-bold mt-2 ${uploadStatus.includes("نجاح") ? "text-green-600" : "text-blue-500"}`}>
                            {uploadStatus}
                          </p>
                        )}
                      </form>
                    </CardBody>
                  </Card>
                </div>

                {/* Right Interactive Player Preview Panel */}
                <div className="lg:col-span-5">
                  <Card className="rounded-[32px] overflow-hidden bg-gradient-to-b from-[#0F172A] to-[#1E293B] border border-slate-800 shadow-2xl text-white select-none relative min-h-[420px] flex flex-col justify-between p-6">
                    {/* Glass backing pulse */}
                    <div className="absolute inset-0 bg-[#00B4D8]/10 blur-3xl opacity-30 rounded-full pointer-events-none animate-pulse"></div>

                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-[10px] tracking-widest font-black uppercase text-[#00B4D8]">
                        {isRtl ? "شاشة المعاينة التفاعلية" : "Interactive Preview"}
                      </span>
                      <span className="text-xs">🔒 Secure</span>
                    </div>

                    {/* Uploader Preview Content */}
                    {mediaType === "video" ? (
                      // Video Viewport with backing glow
                      <div className="flex flex-col items-center justify-center my-4 relative z-10 space-y-4 flex-grow w-full">
                        <div className={`relative overflow-hidden bg-black border border-slate-800 shadow-lg flex items-center justify-center group transition-all duration-300 ${
                          isVideoPortrait 
                            ? "max-w-[280px] aspect-[9/16] shadow-lg rounded-2xl mx-auto w-full" 
                            : "w-full aspect-video rounded-lg max-w-sm"
                        }`}>
                          {/* Glow */}
                          <div className={`absolute inset-0 bg-[#00B4D8]/10 blur-xl transition-opacity duration-500 opacity-60 ${isPlaying ? "opacity-100" : ""}`}></div>
                          
                          {previewUrl ? (
                            <video
                              ref={videoPlayerRef}
                              src={previewUrl}
                              className="w-full h-full object-cover relative z-10"
                              onTimeUpdate={handleTimeUpdate}
                              onLoadedMetadata={handleLoadedMetadata}
                              onEnded={() => setIsPlaying(false)}
                            />
                          ) : (
                            <div className="flex flex-col items-center text-slate-500 gap-2 relative z-10">
                              <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9a2.25 2.25 0 00-2.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                              </svg>
                              <span className="text-xs font-bold">{isRtl ? "لم يتم اختيار فيديو بعد" : "No video selected"}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-center space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-100 max-w-[260px] truncate">
                            {title || (isRtl ? "مقطع مرئي تجريبي قيد الرفع" : "Untitled Video")}
                          </h4>
                          <p className="text-[10px] text-slate-400 max-w-[280px] truncate">
                            {description || (isRtl ? "لا يوجد تفاصيل حالياً" : "No summary attached yet")}
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Audio Rotating Vinyl & Equalizer
                      <>
                        {/* Rotating Vinyl Glowing Aura */}
                        <div className="flex flex-col items-center justify-center my-6 relative z-10 space-y-4 flex-grow">
                          <div className="relative group">
                            <div className={`absolute -inset-4 bg-[#00B4D8] opacity-20 blur-2xl rounded-full ${isPlaying ? "animate-pulse" : ""}`}></div>
                            <div className={`w-28 h-28 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center shadow-lg relative ${
                              isPlaying ? "animate-spin [animation-duration:8s]" : ""
                            }`}>
                              {/* Vinyl grooves */}
                              <svg className="w-24 h-24 text-slate-800 absolute opacity-50" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                                <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                                <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
                              </svg>
                              
                              {/* Large music note in background */}
                              <svg className="w-18 h-18 text-[#00B4D8]/30 absolute z-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 10l12-3" />
                                <circle cx="6" cy="19" r="3" fill="currentColor" />
                                <circle cx="18" cy="16" r="3" fill="currentColor" />
                              </svg>
                              
                              {/* Center core logo */}
                              <img 
                                src="/images/logo.png" 
                                alt="Logo" 
                                className="w-10 h-10 rounded-full bg-slate-900 border-2 border-[#00B4D8] absolute z-10 p-0.5 object-contain" 
                              />
                            </div>
                          </div>

                          <div className="text-center space-y-1">
                            <h4 className="font-extrabold text-sm text-[#00B4D8] max-w-[200px] truncate">
                              {title || (isRtl ? "مقطع تجريبي قيد الرفع" : "Untitled Track")}
                            </h4>
                            <p className="text-[10px] text-slate-400 max-w-[220px] truncate">
                              {description || (isRtl ? "لا يوجد تفاصيل حالياً" : "No summary attached yet")}
                            </p>
                          </div>
                        </div>

                        {/* Pulsing CSS Equalizer wave visualizer */}
                        <div className="h-10 flex items-end justify-center gap-1.5 relative z-10 px-6 mb-4">
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
                      </>
                    )}

                    {/* Scrubber and timings */}
                    <div className="space-y-2 relative z-10">
                      <Progress
                        size="sm"
                        value={duration > 0 ? (currentTime / duration) * 100 : 0}
                        color="secondary"
                        className="h-1.5 cursor-pointer rounded-full"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Playback Button Actions */}
                    <div className="flex justify-center items-center gap-6 relative z-10">
                      <button type="button" className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 6h2v12H6zm3.5 6L18 6v12z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={togglePlayback}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md shadow-cyan-500/10 ${
                          isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-slate-900"
                        }`}
                        disabled={!file}
                        title={!file ? "يرجى اختيار ملف لتشغيله" : "تشغيل / إيقاف المعاينة"}
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
                      <button type="button" className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 18l8.5-6L6 6zm10-12h2v12h-2z"/>
                        </svg>
                      </button>
                    </div>
                  </Card>
                </div>

              </div>
            </div>
          )}

          {/* --- MANAGE MEDIA TAB PANEL --- */}
          {activeTab === "media" && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h1 className={`text-2xl md:text-3xl font-black ${theme === "dark" ? "text-white" : "text-[#0B355F]"}`}>
                  {isRtl ? "إدارة ومراقبة مقاطع الوسائط المرفوعة" : "Manage Media"}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  {isRtl ? "تحكم في تعديل عناوين دروسك، وتنزيل كروت الـ QR Code لطباعتها" : "Manage your uploaded textbook lessons, download printable QR Codes, or modify details."}
                </p>
              </div>

              <Card className={`rounded-3xl border overflow-hidden ${
                theme === "dark" ? "bg-[#1E293B]/80 border-slate-700/50" : "bg-white border-slate-200/60"
              }`}>
                <CardBody className="p-6">
                  <TrackList refreshTrigger={refreshTrigger} />
                </CardBody>
              </Card>
            </div>
          )}

          {/* --- SOCIAL SETTINGS TAB PANEL --- */}
          {activeTab === "social" && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h1 className={`text-2xl md:text-3xl font-black ${theme === "dark" ? "text-white" : "text-[#0B355F]"}`}>
                  {isRtl ? "روابط تواصل وإعدادات الدعم للطلاب" : "Social Settings"}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  {isRtl ? "روابط التواصل الرسمية التي تظهر للطلاب تحت مشغل الصوتيات" : "Configure quick-access feeds that students see inside their media dashboard."}
                </p>
              </div>

              <div className="max-w-xl">
                <Card className={`rounded-3xl border ${theme === "dark" ? "bg-[#1E293B]/80 border-slate-700/50" : "bg-white border-slate-200/60"}`}>
                  <CardBody className="p-8 space-y-6">
                    <form onSubmit={handleSaveSettings} className="space-y-5">
                      
                      {/* WhatsApp */}
                      <div className="space-y-1.5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0 text-green-500">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </div>
                        <div className="flex-grow space-y-1">
                          <label className="text-xs font-bold">{isRtl ? "رقم الواتساب (صيغة 201xxxxxxxxx)" : "WhatsApp Number"}</label>
                          <Input
                            placeholder="201100588901"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            classNames={{
                              inputWrapper: `h-10 rounded-xl border focus-within:border-[#25D366] ${
                                theme === "dark" ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-50 border-slate-200"
                              }`
                            }}
                          />
                        </div>
                      </div>

                      {/* Facebook */}
                      <div className="space-y-1.5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center flex-shrink-0 text-[#1877F2]">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        </div>
                        <div className="flex-grow space-y-1">
                          <label className="text-xs font-bold">{isRtl ? "رابط صفحة فيسبوك" : "Facebook Feed Link"}</label>
                          <Input
                            placeholder="https://facebook.com/belarabi"
                            value={facebook}
                            onChange={(e) => setFacebook(e.target.value)}
                            classNames={{
                              inputWrapper: `h-10 rounded-xl border focus-within:border-[#1877F2] ${
                                theme === "dark" ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-50 border-slate-200"
                              }`
                            }}
                          />
                        </div>
                      </div>

                      {/* Instagram */}
                      <div className="space-y-1.5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#E4405F]/10 flex items-center justify-center flex-shrink-0 text-[#E4405F]">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                          </svg>
                        </div>
                        <div className="flex-grow space-y-1">
                          <label className="text-xs font-bold">{isRtl ? "رابط صفحة إنستجرام" : "Instagram Profile Link"}</label>
                          <Input
                            placeholder="https://instagram.com/belarabi"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            classNames={{
                              inputWrapper: `h-10 rounded-xl border focus-within:border-[#E4405F] ${
                                theme === "dark" ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-50 border-slate-200"
                              }`
                            }}
                          />
                        </div>
                      </div>

                      {/* TikTok */}
                      <div className="space-y-1.5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-900/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0 text-slate-800 dark:text-white">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.99-1.72-.08-.07-.17-.17-.25-.25v6.56c.02 3.12-1.34 6.11-4.05 7.57-2.9 1.57-6.68 1.14-9.1-1.04-2.58-2.33-3.26-6.26-1.58-9.35C5.16 8.3 8.87 6.64 12 7.82c.1.04.19.1.28.15v4.11c-2.17-.67-4.66.42-5.26 2.65-.67 2.45 1.02 5.03 3.52 5.25 2.15.2 4.29-1.25 4.67-3.37.05-.28.08-.57.08-.86V.02z"/>
                          </svg>
                        </div>
                        <div className="flex-grow space-y-1">
                          <label className="text-xs font-bold">{isRtl ? "رابط صفحة تيك توك" : "TikTok Feed Link"}</label>
                          <Input
                            placeholder="https://tiktok.com/@belarabi"
                            value={tiktok}
                            onChange={(e) => setTiktok(e.target.value)}
                            classNames={{
                              inputWrapper: `h-10 rounded-xl border focus-within:border-slate-500 ${
                                theme === "dark" ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-50 border-slate-200"
                              }`
                            }}
                          />
                        </div>
                      </div>

                      {/* YouTube */}
                      <div className="space-y-1.5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#FF0000]/10 flex items-center justify-center flex-shrink-0 text-[#FF0000]">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </div>
                        <div className="flex-grow space-y-1">
                          <label className="text-xs font-bold">{isRtl ? "رابط قناة يوتيوب" : "YouTube Channel Link"}</label>
                          <Input
                            placeholder="https://youtube.com/@belarabi"
                            value={youtube}
                            onChange={(e) => setYoutube(e.target.value)}
                            classNames={{
                              inputWrapper: `h-10 rounded-xl border focus-within:border-[#FF0000] ${
                                theme === "dark" ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-50 border-slate-200"
                              }`
                            }}
                          />
                        </div>
                      </div>

                      {/* Website */}
                      <div className="space-y-1.5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#1E293B]/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0 text-slate-800 dark:text-slate-300">
                          <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10zM2 12h20"/>
                          </svg>
                        </div>
                        <div className="flex-grow space-y-1">
                          <label className="text-xs font-bold">{isRtl ? "رابط الموقع الإلكتروني الرسمي" : "Official Website Link"}</label>
                          <Input
                            placeholder="https://belarabi.com"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            classNames={{
                              inputWrapper: `h-10 rounded-xl border focus-within:border-slate-400 ${
                                theme === "dark" ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-50 border-slate-200"
                              }`
                            }}
                          />
                        </div>
                      </div>

                      {/* Submit settings save */}
                      <div className="pt-4 border-t border-slate-200/10">
                        <Button
                          type="submit"
                          color="secondary"
                          className="w-full font-extrabold h-11 rounded-xl shadow-md bg-gradient-to-r from-secondary to-primary text-white hover:opacity-90"
                          isLoading={savingSettings}
                        >
                          {isRtl ? "حفظ وتحديث روابط التواصل" : "Save Changes"}
                        </Button>
                        {settingsStatus && (
                          <p className="text-xs text-center font-bold text-green-600 mt-2">
                            {settingsStatus}
                          </p>
                        )}
                      </div>
                    </form>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}

          {/* --- STATISTICS TAB PANEL --- */}
          {activeTab === "stats" && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h1 className={`text-2xl md:text-3xl font-black ${theme === "dark" ? "text-white" : "text-[#0B355F]"}`}>
                  {isRtl ? "إحصائيات تقييم الدروس والوسائط" : "Ratings Analytics"}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  {isRtl ? "تحليل تقييمات الطلاب المدخلة عبر كروت الـ QR Code مباشرة" : "Review real-time dynamic ratings summary calculated from student scans."}
                </p>
              </div>

              {/* Play Counts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <Card className={`border bg-gradient-to-tr from-blue-600/10 to-indigo-500/10 border-blue-500/20 text-blue-500 dark:text-cyan-400 rounded-2xl transition-all duration-300 hover:-translate-y-1`}>
                  <CardBody className="p-3 sm:p-4 flex flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold opacity-85">{isRtl ? "إجمالي استماعات الصوت" : "Total Audio Plays"}</span>
                      <h3 className="text-xl font-black text-blue-600 dark:text-cyan-400">{audioPlays}</h3>
                      <span className="text-[9px] opacity-70 block">{isRtl ? "تحديث تلقائي فوري" : "Real-time updates"}</span>
                    </div>
                    <svg className="w-7 h-7 text-blue-500/30 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  </CardBody>
                </Card>

                <Card className={`border bg-gradient-to-tr from-purple-600/10 to-pink-500/10 border-purple-500/20 text-purple-500 dark:text-purple-400 rounded-2xl transition-all duration-300 hover:-translate-y-1`}>
                  <CardBody className="p-3 sm:p-4 flex flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold opacity-85">{isRtl ? "إجمالي مشاهدات الفيديو" : "Total Video Plays"}</span>
                      <h3 className="text-xl font-black text-purple-600 dark:text-purple-400">{videoPlays}</h3>
                      <span className="text-[9px] opacity-70 block">{isRtl ? "تحديث تلقائي فوري" : "Real-time updates"}</span>
                    </div>
                    <svg className="w-7 h-7 text-purple-500/30 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l5 2.5-5 2.5v-5z" />
                    </svg>
                  </CardBody>
                </Card>
              </div>

              {/* Views Timeline Chart */}
              <Card className={`rounded-3xl border ${theme === "dark" ? "bg-[#1E293B]/80 border-slate-700/50" : "bg-white border-slate-200/60"}`}>
                <CardBody className="p-6 space-y-4">
                  <h3 className={`font-black text-base border-b border-slate-200/10 pb-3 ${theme === "dark" ? "text-white" : "text-primary"}`}>
                    {isRtl ? "📈 منحنى نمو المشاهدات والاستماع" : "Views & Plays Growth Timeline"}
                  </h3>
                  <div className="flex flex-col h-56 relative w-full mt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 60">
                      <defs>
                        <linearGradient id="playsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#00B4D8" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="playsGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="1.5" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="10" y1="10" x2="95" y2="10" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                      <line x1="10" y1="23.3" x2="95" y2="23.3" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                      <line x1="10" y1="36.6" x2="95" y2="36.6" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                      <line x1="10" y1="50" x2="95" y2="50" stroke="currentColor" strokeOpacity="0.15" />

                      <line x1="10" y1="10" x2="10" y2="50" stroke="currentColor" strokeOpacity="0.15" />
                      <line x1="31.25" y1="10" x2="31.25" y2="50" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                      <line x1="52.5" y1="10" x2="52.5" y2="50" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                      <line x1="73.75" y1="10" x2="73.75" y2="50" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />
                      <line x1="95" y1="10" x2="95" y2="50" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 2" />

                      {/* Y-Axis Labels based on dynamic maxVal */}
                      <text x="6" y="12" className="fill-slate-400 font-bold text-[5px]" textAnchor="end">
                        {Math.round(getProcessedPlaysTimelineData().maxVal)}
                      </text>
                      <text x="6" y="25" className="fill-slate-400 font-bold text-[5px]" textAnchor="end">
                        {Math.round(getProcessedPlaysTimelineData().maxVal * 0.66)}
                      </text>
                      <text x="6" y="38" className="fill-slate-400 font-bold text-[5px]" textAnchor="end">
                        {Math.round(getProcessedPlaysTimelineData().maxVal * 0.33)}
                      </text>
                      <text x="6" y="52" className="fill-slate-400 font-bold text-[5px]" textAnchor="end">0</text>

                      {/* Path Area */}
                      {getProcessedPlaysTimelineData().areaD && (
                        <path d={getProcessedPlaysTimelineData().areaD} fill="url(#playsGrad)" />
                      )}

                      {/* Glowing Line */}
                      {getProcessedPlaysTimelineData().pathD && (
                        <path
                          d={getProcessedPlaysTimelineData().pathD}
                          fill="none"
                          stroke="#00B4D8"
                          strokeWidth="2"
                          strokeLinecap="round"
                          filter="url(#playsGlow)"
                        />
                      )}

                      {/* Dots */}
                      {getProcessedPlaysTimelineData().points.map((pt, idx) => (
                        <g key={idx}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="2"
                            fill="#00B4D8"
                            stroke={theme === "dark" ? "#0F172A" : "#FFFFFF"}
                            strokeWidth="0.5"
                            className="transition-all duration-200 hover:r-3 cursor-pointer"
                          />
                          <title>{`${pt.label || 'Start'}: ${pt.val} views`}</title>
                        </g>
                      ))}

                      {/* Dynamic Date Labels inside SVG */}
                      {getProcessedPlaysTimelineData().points.map((pt, idx) => (
                        <text
                          key={idx}
                          x={pt.x}
                          y="56"
                          className="fill-slate-400 font-bold text-[4px]"
                          textAnchor="middle"
                        >
                          {pt.label}
                        </text>
                      ))}
                    </svg>
                  </div>
                </CardBody>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                
                {/* Ratings progress breakdown */}
                <Card className={`rounded-3xl border ${theme === "dark" ? "bg-[#1E293B]/80 border-slate-700/50" : "bg-white border-slate-200/60"}`}>
                  <CardBody className="p-8 space-y-6">
                    <h3 className={`font-black text-base border-b border-slate-200/10 pb-3 ${theme === "dark" ? "text-white" : "text-primary"}`}>
                      {isRtl ? "📊 توزيع تقييمات النجوم" : "Star Ratings Breakdown"}
                    </h3>
                    <div className="space-y-4">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = starBreakdown[stars - 1] || 0;
                        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                        return (
                          <div key={stars} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-yellow-500">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
                              <span className="text-slate-400">{count} ({percentage.toFixed(0)}%)</span>
                            </div>
                            <Progress
                              size="sm"
                              value={percentage}
                              color="warning"
                              className="h-2 rounded-full"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardBody>
                </Card>

                {/* General Score Metrics */}
                <Card className={`rounded-3xl border ${theme === "dark" ? "bg-[#1E293B]/80 border-slate-700/50" : "bg-white border-slate-200/60"}`}>
                  <CardBody className="p-8 space-y-6 flex flex-col justify-between min-h-[300px]">
                    <div>
                      <h3 className={`font-black text-base border-b border-slate-200/10 pb-3 ${theme === "dark" ? "text-white" : "text-primary"}`}>
                        {isRtl ? "⭐ النتيجة الإجمالية" : "Global Score Card"}
                      </h3>
                    </div>

                    <div className="text-center py-6 space-y-2">
                      <span className="text-5xl font-black text-yellow-500 block">{averageRating}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {isRtl ? "المعدل العام للتقييم" : "Average Textbook Rating"}
                      </span>
                      <div className="flex gap-1 justify-center text-2xl text-yellow-400">
                        {"★".repeat(Math.round(parseFloat(averageRating)))}
                        {"☆".repeat(5 - Math.round(parseFloat(averageRating)))}
                      </div>
                    </div>

                    <div className="border-t border-slate-200/10 pt-4 text-center">
                      <p className="text-xs text-slate-400">
                        {isRtl
                          ? `تم احتساب هذه النتيجة من أصل ${totalRatings} تقييم مسجل.`
                          : `Calculated from a total of ${totalRatings} dynamic student submissions.`}
                      </p>
                    </div>
                  </CardBody>
                </Card>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* 3D Animated Wave overlay */}
      <div className="absolute bottom-0 left-0 w-full h-[150px] md:h-[190px] overflow-hidden leading-[0] z-0 pointer-events-none select-none">
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