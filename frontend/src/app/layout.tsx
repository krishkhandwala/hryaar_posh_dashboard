import type { Metadata } from "next";
import "./globals.css";
import { RealtimeProvider } from "@/lib/realtime";

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
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </body>
    </html>
  );
}
