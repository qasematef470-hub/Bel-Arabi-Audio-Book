"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Button, Input, Card, CardBody } from "@nextui-org/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // محاولة تسجيل الدخول باستخدام البريد والباسورد اللذين أنشأتهما في Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // عند النجاح، يتم توجيهك إلى لوحة التحكم
      router.push("/admin");
      router.refresh();
    } catch (error: any) {
      // إظهار رسالة خطأ واضحة في حال كانت البيانات غير صحيحة
      setErrorMsg("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans" dir="rtl">
      <Card className="w-full max-w-md shadow-lg">
        <CardBody className="p-8 space-y-6">
          
          {/* ترحيب وهيدر الكارت */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-primary">تسجيل الدخول للأدمن 🔐</h1>
            <p className="text-gray-500 text-sm">ادخل بيانات حسابك للوصول للوحة التحكم</p>
          </div>

          {/* نموذج الدخول */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              label="البريد الإلكتروني"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
            />
            <Input
              type="password"
              label="كلمة المرور"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isRequired
            />

            {errorMsg && (
              <p className="text-danger text-sm text-center font-medium">
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              color="primary"
              className="w-full font-semibold"
              isLoading={loading}
            >
              دخول للوحة التحكم
            </Button>
          </form>
          
        </CardBody>
      </Card>
    </div>
  );
}