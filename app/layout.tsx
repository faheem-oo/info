import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Imitate Labs Issue Form",
  description: "Submit your issues and complaints anonymously to Imitate Labs",
  keywords: ["Imitate Labs", "feedback", "issue reporting", "anonymous feedback"],
  authors: [{ name: "Imitate Labs" }],
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/imitate-logo.png",
    shortcut: "/imitate-logo.png",
    apple: "/imitate-logo.png",
  },
  openGraph: {
    title: "Imitate Labs Issue Form",
    description: "Submit your issues and complaints anonymously",
    type: "website",
    images: ["/imitate-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}
      >
        {children}
      </body>
    </html>
  );
}
