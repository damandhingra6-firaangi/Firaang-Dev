import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Poppins } from "next/font/google";
import AccountSessionBootstrap from "@/components/AccountSessionBootstrap";
import ToastViewport from "@/components/ToastViewport";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  style: "normal",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-playfair",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Firaangi",
  description: "Luxury Clothing & Jewellery",
  icons: {
    icon: "/icon_v001.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AccountSessionBootstrap />
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}