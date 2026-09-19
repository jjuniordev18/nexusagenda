import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { AuthProvider } from "@/lib/AuthContext";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nexus - Agenda Inteligente",
    template: "%s | Nexus Agenda",
  },
  description: "Organize suas tarefas com inteligência. Gestão de tarefas com IA, produtividade e foco.",
  keywords: ["agenda", "tarefas", "produtividade", "gestão de tarefas", "to-do", "foco", " IA"],
  authors: [{ name: "Nexus Team", url: "https://nexus-agenda.com" }],
  creator: "Nexus Team",
  publisher: "Nexus Team",
  metadataBase: new URL("https://nexus-agenda-inteligente.netlify.app"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://nexus-agenda-inteligente.netlify.app",
    siteName: "Nexus Agenda",
    title: "Nexus - Agenda Inteligente",
    description: "Organize suas tarefas com inteligência. Gestão de tarefas com IA, produtividade e foco.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Nexus - Agenda Inteligente",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus - Agenda Inteligente",
    description: "Organize suas tarefas com inteligência. Gestão de tarefas com IA, produtividade e foco.",
    images: ["/og-image.svg"],
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
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ServiceWorkerRegistrar />
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
