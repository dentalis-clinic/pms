import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DentalisPMS",
  description: "Dental clinic appointment booking and patient management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
