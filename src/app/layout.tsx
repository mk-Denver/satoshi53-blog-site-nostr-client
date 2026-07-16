import type { Metadata } from "next";
import { DM_Serif_Display, Fira_Sans } from "next/font/google";
import { SITE } from "@/lib/constants";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Satoshi53 Research",
  title: {
    default: "Satoshi53 Research",
    template: "%s · Satoshi53 Research",
  },
  description:
    "Latest research publications from the Satoshi53 team — exploring Bitcoin, culture, and African creativity, published on Nostr.",
  keywords: [
    "Satoshi53",
    "research",
    "publications",
    "Bitcoin",
    "Nostr",
    "African creativity",
    "culture",
  ],
  authors: [{ name: "Satoshi53" }],
  creator: "Satoshi53",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE.url,
    siteName: "Satoshi53 Research",
    title: "Satoshi53 Research",
    description:
      "Latest research publications from the Satoshi53 team — exploring Bitcoin, culture, and African creativity, published on Nostr.",
  },
  twitter: {
    card: "summary",
    title: "Satoshi53 Research",
    description:
      "Latest research publications from the Satoshi53 team — exploring Bitcoin, culture, and African creativity, published on Nostr.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${firaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
