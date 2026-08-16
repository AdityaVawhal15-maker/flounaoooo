import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthContext";
import { I18nProvider } from "@/components/i18n/I18nContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Flouna — Stop Searching, Start Deciding",
    template: "%s · Flouna",
  },
  description:
    "Flouna is your AI decision engine that finds the single best option across food, rides and more — all in one place.",
  appleWebApp: { capable: true, title: "Flouna", statusBarStyle: "default" },
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
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
