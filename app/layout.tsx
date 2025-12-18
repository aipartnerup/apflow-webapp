import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';
import { AppShellWrapper } from '@/components/layout/AppShell';
import { I18nProvider } from '@/lib/i18n/provider';
import { QueryProvider } from '@/lib/providers/QueryProvider';
import { themeConfig } from '@/lib/theme/config';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AIPartnerUpFlow - Task Management",
  description: "Web application for managing and executing tasks with aipartnerupflow",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <I18nProvider>
            <MantineProvider theme={themeConfig} defaultColorScheme="auto">
              <Notifications position="top-right" />
              <AppShellWrapper>
                {children}
              </AppShellWrapper>
            </MantineProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
