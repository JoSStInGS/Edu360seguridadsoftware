import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import React from "react";

export const metadata: Metadata = {
  title: "Edu360",
};

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500", "700"] });


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
          className={lexend.className}
      >
        {children}
      </body>
    </html>
  );
}
