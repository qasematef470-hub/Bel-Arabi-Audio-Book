"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardBody } from "@nextui-org/react";
import Link from "next/link";

export default function HomePage() {
  const [lang, setLang] = useState<"ar" | "en">("en");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dynamic document title based on language
  useEffect(() => {
    if (mounted) {
      document.title = lang === "ar" ? "منصة استماع الدروس - بالعربي" : "BelArabi - Lesson Listening Platform";
    }
  }, [lang, mounted]);

  if (!mounted) return null;

  const isRtl = lang === "ar";

  const data = {
    ar: {
      leftTitle: "منصة استماع الدروس",
      leftSub: "تعلم أينما كنت.. متى شئت",
      cardHeader: "مرحباً بك في منصة استماع الدروس",
      checklist: [
        "استمع للدروس بجودة عالية",
        "تحميل المحتوى للاستماع لاحقاً",
        "واجهة سهلة وسريعة الاستخدام",
        "تجربة آمنة ومحتوى موثوق",
      ],
      cta: "Go to Admin Dashboard",
    },
    en: {
      leftTitle: "Lesson Listening Platform",
      leftSub: "Learn wherever you are.. whenever you want",
      cardHeader: "Welcome to the Lesson Listening Platform",
      checklist: [
        "Listen to lessons in high quality",
        "Download content to listen later",
        "Easy and fast to use interface",
        "Safe experience and trusted content",
      ],
      cta: "Go to Admin Dashboard",
    },
  };

  const t = data[lang];

  // Floating background copies configuration (fish-like ocean drift)
  const fishLogos = [
    { id: 1, className: "animate-fish-1 top-[12%] w-16 h-16", delay: "0s" },
    { id: 2, className: "animate-fish-2 top-[32%] w-20 h-20", delay: "4s" },
    { id: 3, className: "animate-fish-3 top-[52%] w-12 h-12", delay: "8s" },
    { id: 4, className: "animate-fish-4 top-[72%] w-16 h-16", delay: "2s" },
    { id: 5, className: "animate-fish-1 top-[22%] w-14 h-14", delay: "12s" },
    { id: 6, className: "animate-fish-2 top-[62%] w-18 h-18", delay: "6s" },
  ];

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`min-h-screen relative overflow-hidden transition-colors duration-500 font-sans flex flex-col justify-between ${
        theme === "dark"
          ? "bg-[#0F172A] text-[#F1F5F9] dark"
          : "bg-gradient-to-tr from-[#E2F1F8] via-[#F8FAFC] to-[#E8F5E9]/50 text-[#1E293B]"
      }`}
    >
      {/* Floating Interactive Controls Header */}
      <header className={`absolute top-4 left-4 right-4 flex justify-between items-center z-50 px-4 ${
        isRtl ? "flex-row" : "flex-row"
      }`}>
        {/* Sleek Logo Indicator */}
        <div className="flex items-center gap-2">
          <img src="/images/logo.png" alt="Mini Logo" className="w-8 h-8 object-contain" />
          <span className={`font-bold tracking-wider text-xs md:text-sm transition-colors duration-300 ${
            theme === "dark" ? "text-[#38BDF8]" : "text-[#0B355F]"
          }`}>
            BelArabi
          </span>
        </div>

        {/* Dynamic Theme & Language Switches */}
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
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

          {/* Theme Toggle */}
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
      <div className="absolute inset-0 pointer-events-none z-0">
        {fishLogos.map((fish) => (
          <img
            key={fish.id}
            src="/images/logo.png"
            alt=""
            className={`absolute pointer-events-none opacity-[0.06] dark:opacity-[0.04] object-contain ${fish.className}`}
            style={{ animationDelay: fish.delay }}
          />
        ))}
      </div>

      {/* Main Split-Screen Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 z-10 relative">
        
        {/* Left Side: Brand Logo with Glowing Aura & Slogan over waves */}
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 lg:space-y-8 select-none">
          {/* Logo with interactive drop-shadow and pulsing backing blur */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-[#00B4D8] opacity-25 blur-3xl rounded-full animate-pulse transition-all duration-1000 group-hover:opacity-40 z-0"></div>
            <img
              src="/images/logo.png"
              alt="BelArabi Premium Logo"
              className="relative z-10 w-56 h-56 md:w-72 md:h-72 object-contain drop-shadow-[0_0_30px_rgba(0,180,216,0.55)] transition-all duration-700 hover:drop-shadow-[0_0_45px_rgba(0,180,216,0.75)] hover:scale-[1.03]"
            />
          </div>

          {/* Slogan Text Elements */}
          <div className="space-y-3 z-10 max-w-md">
            <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight transition-colors duration-300 leading-normal ${
              theme === "dark" ? "text-white" : "text-[#0B355F]"
            }`}>
              {t.leftTitle}
            </h1>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className={`w-8 h-[2px] transition-colors ${theme === "dark" ? "bg-[#38BDF8]" : "bg-[#00B4D8]"}`}></span>
              <span className={`font-semibold tracking-wider text-xs md:text-sm uppercase ${
                theme === "dark" ? "text-[#38BDF8]" : "text-[#00B4D8]"
              }`}>
                {t.leftSub}
              </span>
              <span className={`w-8 h-[2px] transition-colors ${theme === "dark" ? "bg-[#38BDF8]" : "bg-[#00B4D8]"}`}></span>
            </div>
          </div>
        </div>

        {/* Right Side: Elegant Glassmorphic Card */}
        <div className="flex-1 w-full max-w-lg flex items-center justify-center">
          <Card
            className={`w-full border shadow-2xl transition-all duration-500 rounded-[32px] ${
              theme === "dark"
                ? "bg-[#1E293B]/80 border-slate-700/50 shadow-[#000000]/40"
                : "bg-white/85 border-white/50 shadow-sky-900/5 backdrop-blur-lg"
            }`}
          >
            <CardBody className="p-8 md:p-10 flex flex-col justify-between h-full space-y-8">
              
              {/* Card Header & Description */}
              <div className="space-y-4 text-center">
                <h2 className={`text-xl md:text-2xl font-extrabold leading-normal transition-colors duration-300 ${
                  theme === "dark" ? "text-[#38BDF8]" : "text-[#0B355F]"
                }`}>
                  {t.cardHeader}
                </h2>
                <div className={`h-[1px] w-1/4 mx-auto ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"}`}></div>
              </div>

              {/* Core Benefits List */}
              <div className="space-y-4">
                {t.checklist.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group hover:-translate-y-0.5 ${
                      theme === "dark" ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Teal round indicator with Check icon */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-105 ${
                      theme === "dark" ? "bg-[#38BDF8]/10 text-[#38BDF8]" : "bg-[#00B4D8]/10 text-[#00B4D8]"
                    }`}>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className={`font-semibold text-sm md:text-base leading-relaxed transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    }`}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Call-to-Action Button */}
              <div className="pt-4">
                <Button
                  as={Link}
                  href="/login"
                  className={`w-full font-extrabold text-white text-sm md:text-base h-12 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl transform active:scale-95 ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] hover:opacity-90"
                      : "bg-gradient-to-r from-[#00B4D8] to-[#0B355F] hover:shadow-lg hover:shadow-cyan-500/20"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span>🔐</span>
                    <span>{t.cta}</span>
                  </span>
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>

      {/* Spacer to push wave properly on tall screens */}
      <div className="h-20 lg:h-32"></div>

      {/* 3D Animated Wave Overlay Graphic */}
      <div className="absolute bottom-0 left-0 w-full h-[150px] md:h-[190px] overflow-hidden leading-[0] z-20 pointer-events-none select-none">
        {/* Wave Layer 1 (Back - Teal/Cyan) */}
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

        {/* Wave Layer 2 (Front - Deep Navy) */}
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

      {/* Dedicated Static Copyright Footer Layer */}
      <footer className="absolute bottom-4 left-0 w-full text-center z-30 pointer-events-auto">
        <p className="text-[10px] md:text-xs text-white/70 font-semibold tracking-wider">
          © {new Date().getFullYear()} BelArabi. All rights reserved.
        </p>
      </footer>
    </div>
  );
}