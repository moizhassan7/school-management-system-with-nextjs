import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/layout-wrapper";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { auth } from "@/auth"; 
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Harvard School Sargodha",
  description: "School Management System",
};
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth(); 
  
  // Safe fallback if session is null
  const user = session?.user || { name: 'Guest', role: 'GUEST', email: '' };

  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider session={session}>
          <SidebarProvider>
            <LayoutWrapper user={user}>
              {children}
            </LayoutWrapper>
            <Toaster richColors position="top-right" />
          </SidebarProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
