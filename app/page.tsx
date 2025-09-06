'use client';
import { useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import BubbleChart from '@/components/BubbleChart';

type Coll = {
  name: string;
  floorEth: number;
  change24hPct: number;
  image: string;
  link?: string;
};

export default function Page() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const [data, setData] = useState<Coll[]>([]);
  useEffect(() => { if (!isFrameReady) setFrameReady(); }, [isFrameReady, setFrameReady]);
  useEffect(() => {
    fetch('/api/collections')
      .then(res => res.json())
      .then(setData)
      .catch(() => setData([]));
  }, []);
  return (
    <main style={{ minHeight: '100svh', background: '#0b0b0c', color: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.2 }}>Base NFT — 24h Change (Bubbles)</h1>
        <p style={{ opacity: 0.7, marginTop: 6, marginBottom: 20 }}>
          Size represents |Δ%| over 24h; color: green for rise, red for drop; label shows name and floor (ETH).
        </p>
        <BubbleChart data={data} />
        <footer style={{ opacity: 0.6, marginTop: 16, fontSize: 12 }}>Warning: mock data</footer>
      </div>
    </main>
  );
}
