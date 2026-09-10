import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

// Sprint 07: fonte humanista e altamente legível (Plus Jakarta Sans), servida
// via next/font/google como a Geist anterior — nenhuma dependência nova.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BioBoock",
  description: "Acompanhe sua evolução, sua saúde e sua jornada de vida ativa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <UserMenu />
        {children}
      </body>
    </html>
  );
}
