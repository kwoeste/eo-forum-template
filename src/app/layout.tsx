import { siteConfig, isEmail } from "@/site.config";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
  title: `${siteConfig.forumName}`,
  description: `Private ${siteConfig.chapterName} forum site. Members only.`,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

const clerkLocalization = {
  signIn: {
    start: {
      title: `Sign in to ${siteConfig.forumName}`,
      subtitle: "Welcome back! Please sign in to continue",
    },
  },
  signUp: {
    start: {
      title: "Create your account",
      subtitle: `Welcome to ${siteConfig.forumName}`,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        options: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
      localization={clerkLocalization}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-slate-50">{children}</body>
      </html>
    </ClerkProvider>
  );
}
