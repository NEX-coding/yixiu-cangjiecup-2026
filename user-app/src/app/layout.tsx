import type { Metadata } from "next";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND_NAME} · ${BRAND_TAGLINE}`,
  description: BRAND_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="site-body">
        <div className="site-main">{children}</div>
      </body>
    </html>
  );
}
