# Product Requirements Document (PRD) - BelArabi

## 1. Project Overview & Tech Stack
- **Project Name:** BelArabi (Arabic Beyond Textbooks)
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS (v3) + NextUI (v2)
- **Backend & Storage:** Supabase

## 2. Global Design System (Brand Identity)
- **Primary Color (Deep Navy):** `#0B355F` (Use for headings, primary buttons, footers)
- **Secondary Color (Teal/Cyan):** `#00B4D8` (Use for highlight elements, plays, badges)
- **Neutral Dark (Text):** `#1E293B`
- **Neutral Light (Background):** `#F8FAFC`

## 3. UI/UX Redesign Scope - Phase 1

### A. Landing Page (app/page.tsx)
- **Layout:** Split-screen layout (RTL optimized).
- **Right Side (50% width):** Displays the official brand logo located at `/images/logo.png`, styled with clean margins.
- **Left Side (50% width):** Displays a highly polished white card containing:
  - Heading: "BelArabi: Arabic Beyond Textbooks"
  - Subheading: "Interactive. Engaging. Inspiring."
  - An elegant list of core benefits (with custom colored bullet icons).
  - A prominent Primary CTA Button: "🔐 Go to Admin Dashboard", styled with custom hover animations and directing to `/login`.
- **Background Decor:** A wave-like SVG graphic styled in Primary and Secondary colors stretching smoothly at the bottom.

### B. Login Page (app/login/page.tsx)
- **Layout:** Centered modal-like auth card on a beautifully styled background.
- **Left Panel (Inside Card):** Displays the official brand logo located at `/images/logo.png` scaled beautifully, centered over a clean, professional, soft kahl/teal background.
- **Right Panel (Inside Card):**
  - Header: "Welcome Back / Please sign in to continue"
  - Input Fields: Sleek floating-label inputs for Email and Password (using NextUI) with official line icons inside.
  - Controls: "Remember me" checkbox on the right, and "Forgot password?" link on the left (RTL aligned).
  - Button: A gorgeous Cyan/Teal flat-button "Sign In" with a lock icon.
  - Error Banner: A soft red warning banner with a close icon showing the dynamic error message when the login fails.

### C. Social & Platform Icons (Global Requirement)
- **CRITICAL:** All social media buttons and links (such as WhatsApp, Facebook, Instagram, TikTok, YouTube, and Website) must use the **official, authentic high-quality SVG brand icons** with their exact respective official hex brand colors [1.1, 1.2]:
  - **WhatsApp:** Green (`#25D366`)
  - **Facebook:** Royal Blue (`#1877F2`)
  - **Instagram:** Gradient / Pink-Orange (`#E4405F`)
  - **TikTok:** Black (`#000000`)
  - **YouTube:** Red (`#FF0000`)
  - **Website:** Dark Slate (`#1E293B`)

## 4. Coding Constraints
- **CRITICAL:** Do not rewrite, modify, or delete the Supabase integration logic, state handlers (`useState`), routers (`useRouter`), or `supabase.auth` APIs. ONLY refactor the visual layer (Tailwind CSS classes, JSX structure, and NextUI component configurations) to match the approved visual mockups.
## 5. Global Bilingual (AR/EN) & Theme Mode Requirements (CRITICAL)

### A. Bilingual Support (i18n)
- Every page (Landing, Login, Admin Dashboard, Student Media Page) must support bilingual toggle (Arabic <-> English).
- When Language is "ar" (Arabic):
  - Enforce `dir="rtl"` on the layout/components.
  - Render all copy and titles in Arabic.
- When Language is "en" (English):
  - Enforce `dir="ltr"` on the layout/components.
  - Render all copy and titles in English.
- Implement a sleek floating Language Toggle button (e.g., "AR / EN") in the header of every page.

### B. Theme Support (Light / Dark Mode)
- Every page must support Light/Dark theme toggling using NextUI themes.
- **Light Theme Colors:**
  - Background: `#F8FAFC`, Foreground: `#1E293B`, Primary: `#0B355F`, Secondary: `#00B4D8`.
- **Dark Theme Colors:**
  - Background: `#0F172A` (Slate-900), Foreground: `#F1F5F9`, Primary: `#38BDF8` (Lighter cyan), Secondary: `#0EA5E9`.
- Implement a sleek floating Theme Toggle button (e.g., "☀️ / 🌙") in the header next to the language button.