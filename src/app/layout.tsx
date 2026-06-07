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
      <body className="min-h-screen bg-background antialiased">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
            <a href="/" className="text-lg font-bold">
              IDRL ImageGen
            </a>
            <nav className="ml-auto flex gap-4">
              <a
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                生图
              </a>
              <a
                href="/history"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                历史
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
