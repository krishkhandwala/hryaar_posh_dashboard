import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HRYAAR Digi-PoSH | Enterprise Compliance Operating System",
  description: "Next-generation statutory PoSH monitoring, assessment governance, and audit-ready reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
