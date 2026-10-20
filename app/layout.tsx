import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Endod Health | Super Admin Infrastructure Dashboard",
  description: "Super admin dashboard for the Endod Health MedOS network — infrastructure, facilities, and network monitoring.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased bg-white text-slate-900">
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
