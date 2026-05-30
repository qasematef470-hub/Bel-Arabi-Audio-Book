"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Button, Input, Card, CardBody, Checkbox } from "@nextui-org/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [lang, setLang] = useState<"ar" | "en">("en");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dynamic document title based on language
  useEffect(() => {
    if (mounted) {
      document.title = lang === "ar" ? "تسجيل الدخول - بالعربي" : "BelArabi - Admin Login";
    }
  }, [lang, mounted]);

  if (!mounted) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/admin");
      router.refresh();
    } catch (error: any) {
      setErrorMsg(
        lang === "ar"
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
          : "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const isRtl = lang === "ar";

  const t = {
    ar: {
      title: "تسجيل الدخول",
      subtitle: "مرحباً بك مرة أخرى",
      emailLabel: "اسم المستخدم / البريد الإلكتروني",
      passwordLabel: "كلمة المرور",
      rememberMe: "تذكرني",
      forgotPassword: "نسيت كلمة المرور؟",
      signInBtn: "تسجيل الدخول",
      footerLink: "ليس لديك حساب؟ تواصل مع المدير",
      secureAccess: "دخول آمن لحسابك",
      emailPlaceholder: "admin@example.com",
    },
    en: {
      title: "Welcome Back",
      subtitle: "Please sign in to continue",
      emailLabel: "Username / Email Address",
      passwordLabel: "Password",
      rememberMe: "Remember me",
      forgotPassword: "Forgot password?",
      signInBtn: "Sign In",
      footerLink: "Don't have an account? Contact the Admin",
      secureAccess: "Secure access to your account",
      emailPlaceholder: "admin@belarabi.com",
    },
  }[lang];

  // Background drifting logos
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
      {/* Utility switches Header */}
      <header className="absolute top-4 left-4 right-4 flex justify-between items-center z-50 px-4">
        <Link href="/" className="flex items-center gap-2 cursor-pointer group">
          <img src="/images/logo.png" alt="Mini Logo" className="w-8 h-8 object-contain transition-transform group-hover:scale-105" />
          <span className={`font-bold tracking-wider text-xs md:text-sm transition-colors duration-300 ${
            theme === "dark" ? "text-[#38BDF8]" : "text-[#0B355F]"
          }`}>
            BelArabi
          </span>
        </Link>

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

      {/* Floating copies */}
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

      {/* Double Panel Card Container */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-24 flex items-center justify-center z-10 relative">
        <Card
          className={`w-full max-w-4xl border shadow-2xl transition-all duration-500 rounded-[32px] overflow-hidden ${
            theme === "dark"
              ? "bg-[#1E293B]/90 border-slate-700/50 shadow-[#000000]/40"
              : "bg-white border-white/50 shadow-sky-900/5 backdrop-blur-lg"
          }`}
        >
          {/* Grid Layout inside the Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 w-full h-full min-h-[500px]">
            
            {/* Left Panel: Glowing Brand Overlay (40% width on Desktop) */}
            <div className="md:col-span-5 relative hidden md:flex flex-col items-center justify-center p-8 text-center select-none overflow-hidden bg-gradient-to-br from-[#0B355F] to-[#082F49] text-white">
              {/* Pulsing Backing Aura */}
              <div className="absolute -inset-4 bg-[#00B4D8] opacity-25 blur-3xl rounded-full animate-pulse z-0"></div>
              
              {/* Centered Brand Logo */}
              <img
                src="/images/logo.png"
                alt="BelArabi Brand Logo"
                className="relative z-10 w-44 h-44 object-contain drop-shadow-[0_0_25px_rgba(0,180,216,0.5)] transition-transform duration-700 hover:scale-105"
              />

              <div className="mt-6 space-y-2 relative z-10">
                <h3 className="text-xl font-bold tracking-wide">BelArabi</h3>
                <p className="text-xs text-secondary font-semibold uppercase tracking-widest">Arabic Beyond Textbooks</p>
              </div>
            </div>

            {/* Right Panel: Sleek Form Area (60% width on Desktop) */}
            <div className={`md:col-span-7 p-8 md:p-12 flex flex-col justify-center space-y-6 ${
              theme === "dark" ? "bg-[#1E293B]/30" : "bg-white"
            }`}>
              
              {/* Top Miniature Branding for Responsive / Mobile */}
              <div className="flex md:hidden flex-col items-center text-center space-y-2 select-none mb-4">
                <img src="/images/logo.png" alt="Logo" className="w-16 h-16 object-contain drop-shadow-[0_0_10px_rgba(0,180,216,0.3)] animate-pulse" />
                <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-[#0B355F]"}`}>BelArabi</h3>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1 text-center md:text-start">
                <h2 className={`text-2xl md:text-3xl font-extrabold leading-normal transition-colors duration-300 ${
                  theme === "dark" ? "text-[#38BDF8]" : "text-[#0B355F]"
                }`}>
                  {t.title}
                </h2>
                <p className={`text-xs md:text-sm font-semibold tracking-wide ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  {t.subtitle}
                </p>
              </div>

              {/* Dynamic Error Warning Banner */}
              {errorMsg && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold p-4 rounded-xl relative animate-shake">
                  <span className="text-base">⚠️</span>
                  <div className="flex-grow pr-6">{errorMsg}</div>
                  <button onClick={() => setErrorMsg("")} className="absolute top-3.5 right-3 text-red-500/70 hover:text-red-500 text-sm font-bold">×</button>
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    {t.emailLabel}
                  </label>
                  <Input
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    isRequired
                    classNames={{
                      input: "text-sm",
                      inputWrapper: `h-11 rounded-xl transition-all duration-300 border ${
                        theme === "dark" 
                          ? "bg-slate-800/80 border-slate-700/60 hover:border-slate-500 focus-within:border-[#38BDF8]" 
                          : "bg-slate-50 border-slate-200 hover:border-slate-400 focus-within:border-[#00B4D8]"
                      }`
                    }}
                    startContent={
                      <span className={`text-sm select-none ${isRtl ? "ml-2" : "mr-2"} text-slate-400`}>
                        👤
                      </span>
                    }
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    {t.passwordLabel}
                  </label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    isRequired
                    classNames={{
                      input: "text-sm",
                      inputWrapper: `h-11 rounded-xl transition-all duration-300 border ${
                        theme === "dark" 
                          ? "bg-slate-800/80 border-slate-700/60 hover:border-slate-500 focus-within:border-[#38BDF8]" 
                          : "bg-slate-50 border-slate-200 hover:border-slate-400 focus-within:border-[#00B4D8]"
                      }`
                    }}
                    startContent={
                      <span className={`text-sm select-none ${isRtl ? "ml-2" : "mr-2"} text-slate-400`}>
                        🔒
                      </span>
                    }
                    endContent={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none text-sm select-none"
                      >
                        {showPassword ? "👁️" : "🙈"}
                      </button>
                    }
                  />
                </div>

                {/* Controls (Remember me & Forgot Password) */}
                <div className="flex items-center justify-between pt-1 select-none text-xs">
                  <Checkbox
                    isSelected={rememberMe}
                    onValueChange={setRememberMe}
                    size="sm"
                    classNames={{
                      label: `font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`
                    }}
                  >
                    {t.rememberMe}
                  </Checkbox>
                  
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(lang === "ar" ? "يرجى التواصل مع مسؤول النظام لتغيير كلمة المرور." : "Please contact the system administrator to reset your password.");
                    }}
                    className={`font-semibold transition-colors ${
                      theme === "dark" ? "text-[#38BDF8] hover:text-[#0EA5E9]" : "text-[#00B4D8] hover:text-[#0B355F]"
                    }`}
                  >
                    {t.forgotPassword}
                  </Link>
                </div>

                {/* Submit Action */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    isLoading={loading}
                    className={`w-full font-extrabold text-white text-sm md:text-base h-12 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl transform active:scale-95 ${
                      theme === "dark"
                        ? "bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] hover:opacity-90"
                        : "bg-gradient-to-r from-[#00B4D8] to-[#0B355F] hover:shadow-lg hover:shadow-cyan-500/20"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>🔐</span>
                      <span>{t.signInBtn}</span>
                    </span>
                  </Button>
                </div>
              </form>

              {/* Secure label and footer links */}
              <div className="pt-4 space-y-3 text-center border-t border-slate-200/20">
                <p className={`text-[10px] uppercase font-bold tracking-widest ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
                  🛡️ {t.secureAccess}
                </p>

                <p className="text-xs">
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(lang === "ar" ? "تواصل مع المدير عبر البريد: admin@belarabi.com" : "Contact the Administrator via email: admin@belarabi.com");
                    }}
                    className={`font-semibold transition-colors ${
                      theme === "dark" ? "text-slate-300 hover:text-[#38BDF8]" : "text-slate-600 hover:text-[#0B355F]"
                    }`}
                  >
                    {t.footerLink}
                  </Link>
                </p>
              </div>

            </div>
          </div>
        </Card>
      </main>

      <div className="h-20 lg:h-32"></div>

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