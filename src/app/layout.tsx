import type { Metadata, Viewport } from "next";
import { TenantProvider } from "@/components/TenantProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guardian Electoral 2026",
  description: "Control electoral en tiempo real - Elecciones 2026",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Guardian Electoral",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e40af",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Guardian" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <TenantProvider>{children}</TenantProvider>
      </body>
    </html>
  );
}
