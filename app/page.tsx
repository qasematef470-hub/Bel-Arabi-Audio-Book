"use client";
import { Button } from "@nextui-org/react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-primary">بالعربي - BelArabi</h1>
        <p className="text-lg text-foreground">المشروع جاهز ومُعد بألوان الهوية البصرية بنجاح!</p>
        
        <div className="flex gap-4 justify-center">
          <Button color="primary" size="lg">
            اللون الأساسي (الكحلي)
          </Button>
          <Button color="secondary" size="lg">
            اللون الثانوي (اللبني)
          </Button>
        </div>
      </div>
    </main>
  );
}