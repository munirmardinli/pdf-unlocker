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
  metadataBase: new URL("https://pdf.mardinli.dev"),
  alternates: {
    canonical: "https://pdf.mardinli.dev",
  },
  themeColor: "#2563eb",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
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
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "PDF Unlocker Icon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Unlocker | Lokale PDF-Entschlüsselung",
    description:
      "Bearbeitungssperren aus PDF-Dateien direkt im Browser entfernen.",
    creator: "@munirmardinli",
    site: "@munirmardinli",
    images: ["/icon.svg"],
  },
  other: {
    "og:cta": "PDF jetzt entsperren",
    "og:cta_color": "#2563eb",
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
        <meta property="og:image" content="https://pdf.mardinli.dev/icon.svg" />
        <meta property="og:image:secure_url" content="https://pdf.mardinli.dev/icon.svg" />
        <meta property="og:image:type" content="image/svg+xml" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:alt" content="PDF Unlocker Icon" />
        <meta property="og:cta" content="PDF jetzt entsperren" />
        <meta property="og:cta_color" content="#2563eb" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
