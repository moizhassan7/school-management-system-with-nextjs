import type { Metadata } from "next";
import { Geist_Mono, Open_Sans, Poppins } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/layout-wrapper";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { SchoolBrandProvider } from "@/contexts/SchoolBrandContext";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { prisma } from "@/lib/prisma";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

async function resolveSchoolTitle(): Promise<string> {
  try {
    const session = await auth();
    const schoolId = session?.user?.schoolId;
    const school = schoolId
      ? await prisma.school.findFirst({
          where: { id: schoolId, isActive: true },
          select: { name: true },
        })
      : await prisma.school.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { name: true },
        });
    return school?.name || "School Management System";
  } catch {
    return "School Management System";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = await resolveSchoolTitle();
  return {
    title,
    description: "School Management System",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const user = session?.user || { name: "Guest", role: "GUEST", email: "" };

  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${poppins.variable} ${openSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SessionProvider session={session}>
          <SchoolBrandProvider>
            <SidebarProvider>
              <LayoutWrapper user={user}>{children}</LayoutWrapper>
              <Toaster richColors position="top-right" />
            </SidebarProvider>
          </SchoolBrandProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
