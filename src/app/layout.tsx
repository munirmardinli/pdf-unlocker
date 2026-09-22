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

const t = "../../tailwind.config.ts"

export const metadata: Metadata = {
  metadataBase: new URL("https://pdf.mardinli.dev"),
  alternates: {
    canonical: "https://pdf.mardinli.dev",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", rel: "icon" },
    ],
    apple: "/icon.svg",
  },
  title: {
    default: "PDF Unlocker | Entsperre PDF-Dateien direkt im Browser",
    template: "%s | PDF Unlocker",
  },
  description:
    "Entferne PDF-Bearbeitungssperren und Einschränkungen zu 100% lokal im Browser. Keine Server-Uploads, schnell, kostenlos und datenschutzkonform.",
  keywords: [
    "PDF entsperren",
    "PDF unlocker",
    "PDF Passwort entfernen",
    "PDF Bearbeitungssperre aufheben",
    "Client-side PDF unlock",
    "Datenschutz PDF Tool",
  ],
  authors: [{ name: "Munir Mardinli", url: "https://munir.mardinli.dev" }],
  creator: "Munir Mardinli",
  publisher: "Munir Mardinli",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "PDF Unlocker | Entsperre PDFs lokal im Browser",
    description:
      "Entferne PDF-Bearbeitungssperren ohne Upload auf fremde Server. Schnell, sicher und kostenlos.",
    type: "website",
    locale: "de_DE",
    siteName: "PDF Unlocker Studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Unlocker | Lokale PDF-Entschlüsselung",
    description:
      "Bearbeitungssperren aus PDF-Dateien direkt im Browser entfernen.",
    creator: "@munirmardinli",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
