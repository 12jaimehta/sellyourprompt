import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "SellYourPrompt — buy and sell AI prompts",
  description: "See what a prompt creates, then buy it in one click. Or sell your own.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <Navbar />
        <main className="mx-auto max-w-6xl px-5 pb-24">{children}</main>
        <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-500">
          SellYourPrompt · Payments secured by Stripe
        </footer>
      </body>
    </html>
  );
}
