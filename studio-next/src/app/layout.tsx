import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "衣秀 · 管理端",
  description: "AI 电商内容生成系统管理后台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
