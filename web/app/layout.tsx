import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Radiues — Stop Searching, Start Deciding",
    template: "%s · Radiues",
  },
  description:
    "Radiues is your AI decision engine that finds the single best option across food, rides and more — all in one place.",
  appleWebApp: { capable: true, title: "Radiues", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#fff9f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
