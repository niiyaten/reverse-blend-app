import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crossfade Mix",
  description:
    "Create a private playlist from two Spotify listening profiles, focusing on tracks that are less similar between them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
