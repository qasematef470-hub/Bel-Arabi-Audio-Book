"use client";

import { Button, Card, CardBody } from "@nextui-org/react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-center" dir="rtl">
      <div className="max-w-xl w-full space-y-8">
        
        {/* القسم العلوي: الهوية البصرية وشعار بالعربي */}
        <div className="space-y-2">
          <span className="text-4xl">🗣️</span>
          <h1 className="text-4xl font-extrabold text-primary tracking-tight">منصة بالعربي التفاعلية</h1>
          <p className="text-secondary font-bold text-sm tracking-wider uppercase">Arabic Beyond Textbooks</p>
        </div>

        {/* كارت ترحيبي وتعريفي تفاعلي */}
        <Card className="shadow-lg border-t-4 border-secondary">
          <CardBody className="p-8 space-y-6">
            <h2 className="text-xl font-bold text-primary">أهلاً بك في عالم "بالعربي" التفاعلي 📚</h2>
            
            <p className="text-gray-600 text-sm leading-relaxed">
              هذه المنصة مخصصة لمرافقة كتابك المطبوع. للاستماع إلى الشروحات الصوتية والتفاعل مع الدروس، 
              يرجى استخدام كاميرا هاتفك ومسح رموز الـ **QR Code** المطبوعة داخل صفحات الكتاب المخصصة لكل درس.
            </p>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <p className="text-xs text-primary font-semibold">
                💡 نصيحة: تأكد من تشغيل الصوت ورفع مستوى الصوت بهاتفك للحصول على أفضل تجربة استماع.
              </p>
            </div>
          </CardBody>
        </Card>

        {/* زر الانتقال لبوابة الإدارة والتحكم */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button
            as={Link}
            href="/login"
            color="primary"
            variant="flat"
            className="font-bold w-full sm:w-auto h-11"
          >
            🔐 لوحة تحكم الإدارة (الأدمن)
          </Button>
        </div>

        {/* فوتر بسيط لحقوق الملكية */}
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} بالعربي. جميع الحقوق محفوظة.</p>

      </div>
    </div>
  );
}