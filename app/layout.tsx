import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Studio",
  description: "Topic → script → image → voice → video pipeline for AI-influencer reels.",
  icons: { icon: "/contentstudio/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      </body>
    </html>
  );
}
