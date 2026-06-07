import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IDRL ImageGen",
  description: "AI Image Generation Service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="flex h-screen flex-col bg-background antialiased">
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
