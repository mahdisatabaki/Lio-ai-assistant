import type { Metadata } from "next";
import { Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";

// Persian UI font. Latin subset is kept so mixed Persian/English prose stays readable.
const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
});

// Monospace font for commands, logs, and code, which always render LTR.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "لیو، دستیار لیارا",
  description: "لیو، هم‌تیمی فارسی‌زبان تو برای رفع خطا و آنلاین‌کردن پروژه روی لیارا",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
