import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import { ToastProvider } from '@/components/toast';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'RAMS · ISAT U', template: '%s · RAMS ISAT U' },
  description: 'Research Asset Management System of Iloilo Science and Technology University',
  icons: { icon: '/isat-logo.png' },
};

export const viewport: Viewport = { themeColor: '#14154a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
