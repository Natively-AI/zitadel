import "@/styles/natively.css";

import { LanguageProvider } from "@/components/language-provider";
import { THEME_INIT_SCRIPT } from "@/components/natively/theme-toggle";
import { ToastProvider } from "@/components/natively/toast";
import type { Metadata, Viewport } from "next";
import { getTranslations } from "next-intl/server";
import localFont from "next/font/local";
import React from "react";

// NativelyAI fork: root layout for the email-code login screens. Separate from the stock
// (login) layout so those screens keep their own theme.

// Fonts are committed (SIL Open Font License, latin subset, variable weight) instead of
// next/font/google, so builds don't depend on reaching Google Fonts.
const manrope = localFont({
  src: "./fonts/Manrope-latin.woff2",
  weight: "400 700",
  variable: "--font-manrope",
  display: "swap",
});
const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-latin.woff2",
  weight: "500 700",
  variable: "--font-space-grotesk",
  display: "swap",
});
const jetBrainsMono = localFont({
  src: "./fonts/JetBrainsMono-latin.woff2",
  weight: "400 600",
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("natively");
  return { title: t("pageTitle") };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // colours the browser bar (incl. in-app browsers) to match the page in each theme
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
  colorScheme: "light dark",
};

export default function NativelyLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT may set data-theme on <html> before React hydrates
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
