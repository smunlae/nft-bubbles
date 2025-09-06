'use client';
import { useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import BubbleChart from '@/components/BubbleChart';

type Coll = {
  name: string;
  floorEth: number;
  change24hPct: number;
  link?: string;
};

const DATA: Coll[] = [
  { name: 'Kemonokaki', floorEth: 0.03, change24hPct: -10, link: '#' },
  { name: 'Black Mirror Experience: Smile Pass', floorEth: 0.02, change24hPct: +6.9, link: '#' },
  { name: 'BasePaint', floorEth: 0.009, change24hPct: +2.7, link: '#' },
  { name: 'Bankr Club', floorEth: 0.11, change24hPct: -11.1, link: '#' },
  { name: 'Capy Friends', floorEth: 0.11, change24hPct: -29.2, link: '#' },
  { name: 'onchain gaias', floorEth: 0.05, change24hPct: -1.8, link: '#' },
  { name: 'Farcaster Pro OG', floorEth: 0.03, change24hPct: +7.5, link: '#' },
  { name: 're:generates', floorEth: 0.02, change24hPct: +1.7, link: '#' },
  { name: 'based punks', floorEth: 0.07, change24hPct: -1.8, link: '#' },
  { name: 'OK COMPUTERS', floorEth: 0.02, change24hPct: -7.5, link: '#' },
  { name: 'Based Ape Gang', floorEth: 0.03, change24hPct: -0.7, link: '#' },
  { name: 'No-Punks', floorEth: 0.009, change24hPct: +10.4, link: '#' },
];

export default function Page() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  useEffect(() => { if (!isFrameReady) setFrameReady(); }, [isFrameReady, setFrameReady]);
  return (
    <main style={{ minHeight: '100svh', background: '#0b0b0c', color: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.2 }}>Base NFT — 24h Change (Bubbles)</h1>
        <p style={{ opacity: 0.7, marginTop: 6, marginBottom: 20 }}>
          Размер — |Δ%| за сутки; цвет: зелёный = рост, красный = падение; подпись — имя и floor (ETH).
        </p>
        <BubbleChart data={DATA} />
        <footer style={{ opacity: 0.6, marginTop: 16, fontSize: 12 }}>Mock data. Для продакшна подставьте свой источник по API.</footer>
      </div>
    </main>
  );
}
