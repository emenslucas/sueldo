import { ThemeProvider } from "@/components/theme-provider";
import "@fontsource/ibm-plex-sans/latin.css";
import "@fontsource/lato/latin.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const lato = {
  fontFamily: "Lato, Inter, Arial, sans-serif",
};

export const metadata: Metadata = {
  title: "Gestor de Sueldo",
  description: "Administra tu sueldo y gastos de manera inteligente",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
