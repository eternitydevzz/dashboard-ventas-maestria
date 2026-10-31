import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EMPRESA } from "@/lib/marca";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${EMPRESA.nombre} · Ventas`,
  description: EMPRESA.descripcion,
  icons: { icon: EMPRESA.logo },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tema = (await cookies()).get("app_tema")?.value === "claro" ? "" : "dark";
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${tema} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
