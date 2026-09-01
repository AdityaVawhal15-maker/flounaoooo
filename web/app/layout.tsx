import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthContext";
import { CookieNotice } from "@/components/legal/CookieNotice";
import { I18nProvider } from "@/components/i18n/I18nContext";
import { ThemeProvider, themeInitScript } from "@/components/theme/ThemeContext";
import { NavHistoryTracker } from "@/components/layout/NavHistoryTracker";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "FLOUNA · The Intelligence Behind Your Next Move",
    template: "%s · FLOUNA by Algorithec",
  },
  description:
    "FLOUNA by Algorithec is an intelligent career and personal growth platform connecting path discovery, skill intelligence, mentorship, and actionable learning plans.",
  appleWebApp: { capable: true, title: "FLOUNA", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#F7F2EA",
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
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
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
              {/* Inside AuthProvider: the choice is saved against the account
                  when there is one, and remembering it for a signed-out
                  visitor would need an identifier, which is the tracking the
                  notice is asking about. */}
              <CookieNotice />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
