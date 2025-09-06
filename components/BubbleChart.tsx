'use client';
import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';

type Item = {
  name: string;
  floorEth: number;
  change24hPct: number;
  link?: string;
};

type Node = Item & { x: number; y: number; r: number };

export default function BubbleChart({ data }: { data: Item[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);

  const radii = useMemo(() => {
    const maxAbs = d3.max(data, d => Math.abs(d.change24hPct)) || 1;
    return d3.scaleSqrt().domain([0, maxAbs]).range([26, 90]);
  }, [data]);

  useEffect(() => {
    const init = data.map<Node>((d) => ({
      ...d,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      r: radii(Math.abs(d.change24hPct)),
    }));
    setNodes(init);
  }, [data, radii]);

  useEffect(() => {
    if (!nodes.length) return;
    const width = containerRef.current?.clientWidth || 900;
    const height = 540;
    const sim = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('charge', d3.forceManyBody().strength(2))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<Node>().radius(d => d.r + 4).iterations(2))
      .on('tick', () => setNodes([...nodes]));
    return () => void sim.stop();
  }, [nodes.length]);

  const width = 1100;
  const height = 560;

  const color = (v: number) =>
    v > 0
      ? `linear-gradient(135deg,#0bd65e,#2ee58b)`
      : v < 0
      ? `linear-gradient(135deg,#ff4d4d,#ff7474)`
      : `linear-gradient(135deg,#445,#667)`;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative',
          width,
          maxWidth: '100%',
          height,
          margin: '0 auto',
          borderRadius: 20,
          background: '#0f1115',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
          overflow: 'hidden',
        }}
      >
        {nodes.map((n, i) => {
          const pct = n.change24hPct;
          return (
            <a
              key={i}
              href={n.link || '#'}
              target="_blank"
              rel="noreferrer"
              style={{
                position: 'absolute',
                left: (n.x || 0) - n.r,
                top: (n.y || 0) - n.r,
                width: n.r * 2,
                height: n.r * 2,
                transform: `translate(${width / 2}px, ${height / 2}px)`,
                borderRadius: '50%',
                backgroundImage: color(pct),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 12px 40px rgba(0,0,0,.45), inset 0 0 1px rgba(255,255,255,.25)',
              }}
              title={`${n.name}\nFloor: ${n.floorEth} ETH\n24h: ${pct > 0 ? '+' : ''}${pct}%`}
            >
              <div style={{ padding: 8, lineHeight: 1.1 }}>
                <div
                  style={{ fontSize: Math.max(11, Math.min(16, n.r / 4.5)), fontWeight: 700, textShadow: '0 2px 6px rgba(0,0,0,.45)' }}
                >
                  {n.name}
                </div>
                <div style={{ opacity: 0.9, fontSize: Math.max(11, n.r / 6.5) }}>
                  {n.floorEth.toFixed(2)} ETH
                </div>
                <div
                  style={{ marginTop: 2, fontSize: Math.max(11, n.r / 6.2), fontWeight: 700, color: pct > 0 ? '#c9ffd8' : pct < 0 ? '#ffe0e0' : '#dfe3ea' }}
                >
                  {pct > 0 ? '+' : ''}{pct}%
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
