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
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day');
  useEffect(() => { if (!isFrameReady) setFrameReady(); }, [isFrameReady, setFrameReady]);
  useEffect(() => {
    fetch('/api/collections')
      .then(res => res.json())
      .then(setData)
      .catch(() => setData([]));
  }, [range]);

  const headingLabel = range === 'day' ? '24h' : range === 'week' ? '7d' : '30d';
  return (
    <main style={{ minHeight: '100svh', background: '#0b0b0c', color: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['day', 'week', 'month'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '4px 10px',
                border: '1px solid #0bd65e',
                borderRadius: 6,
                background: range === r ? '#0bd65e' : 'transparent',
                color: range === r ? '#000' : '#0bd65e',
                fontWeight: 700,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.2, marginTop: 12 }}>
          Top Base NFTs — {headingLabel} Change (Bubbles)
        </h1>
        <BubbleChart key={range} data={data} />
        <footer style={{ opacity: 0.6, marginTop: 16, fontSize: 12 }}>Warning: mock data</footer>
      </div>
    </main>
  );
}
