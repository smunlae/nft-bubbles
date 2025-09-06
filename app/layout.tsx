import type { Metadata } from 'next';
import './globals.css';
import { MiniKitContextProvider } from '@/providers/MiniKitProvider';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL as string | undefined;
  const appName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Base NFT Bubbles';
  return {
    title: appName,
    description: 'Bubble-chart дневных изменений флоров NFT на Base',
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || `${URL || ''}/og.png`,
        button: {
          title: `Launch ${appName}`,
          action: {
            type: 'launch_frame',
            name: appName,
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
            splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MiniKitContextProvider>{children}</MiniKitContextProvider>
      </body>
    </html>
  );
}
