import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Endod Admin",
  description: "Endod super admin: hospital verifications, organisations and the audit log.",
  robots: { index: false, follow: false },
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
