import type { Metadata } from "next";
import { Playfair_Display, Inter, IBM_Plex_Mono } from "next/font/google";

// The back-office console is a separate surface from the consumer app. It uses
// the founder's brand palette (maroon / crimson / bright-red / amber-gold on
// warm ivory) with serif display + mono labels — scoped here as CSS variables
// so it never affects the consumer app's cream/orange theme. Not indexed.
export const metadata: Metadata = {
  title: { default: "Radiues Console", template: "%s · Radiues Console" },
  robots: { index: false, follow: false },
};

// Brand fonts, exposed as CSS variables for use across console components.
const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans-c" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono-c" });

export default function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`console-theme ${serif.variable} ${sans.variable} ${mono.variable} min-h-dvh`}
    >
      {children}
    </div>
  );
}
