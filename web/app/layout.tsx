import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthContext";
import { I18nProvider } from "@/components/i18n/I18nContext";
import { ThemeProvider, themeInitScript } from "@/components/theme/ThemeContext";
import { NavHistoryTracker } from "@/components/layout/NavHistoryTracker";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Flouna. Stop Searching, Start Deciding",
    template: "%s · Flouna",
  },
  description:
    "Flouna is your AI decision engine that finds the single best option across food, rides and more, all in one place.",
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
  // The theme script below sets data-theme before React hydrates, so the
  // server markup and the client DOM differ by that one attribute on purpose.
  // Suppressing is the documented pattern for theme scripts, and it applies
  // only to this element rather than the tree beneath it.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Sets the theme before first paint so dark-mode users never see a
            white flash while React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <NavHistoryTracker />
              {children}
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
