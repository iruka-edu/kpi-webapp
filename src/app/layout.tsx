import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

// ─── Font Inter — giống hệt mockup ───────────────────────────────────────────
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// ─── JetBrains Mono — dùng cho code/cmd label như mockup ─────────────────────
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IruKa Lifestyle Workspace",
  description: "Cổng thông tin nội bộ của hệ sinh thái IruKa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-[#f8fafc] flex font-sans">
        {/* Sidebar tĩnh bên trái */}
        <Sidebar />

        {/* Main Content Area (padding 28px 32px như mockup) */}
        <main className="flex-1 text-slate-800 min-h-screen" style={{ padding: "28px 32px 60px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
