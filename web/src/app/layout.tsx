import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, Newsreader } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import { PageTransition } from "@/components/shell/page-transition";
import { Providers } from "@/components/shell/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["300", "400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Outfitter AI",
    template: "%s · Outfitter AI",
  },
  description:
    "Outfit suggestions built from your wardrobe, the weather and your day.",
};

export const viewport: Viewport = {
  themeColor: "#f2e4d9",
  // The app is opened on a phone first thing in the morning; let it use the
  // whole screen and keep pinch-zoom available.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${familjen.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <AppShell>
            <PageTransition>{children}</PageTransition>
          </AppShell>
          <Toaster
            position="bottom-center"
            visibleToasts={1}
            duration={2200}
            toastOptions={{
              unstyled: true,
              classNames: {
                toast:
                  "flex items-center justify-center rounded-3xl bg-ink px-5 py-3 text-sm text-paper shadow-lg",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
