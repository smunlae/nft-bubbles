'use client';
import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

type Item = {
  name: string;
  floorEth: number;
  change24hPct: number;
  image?: string;
  link?: string;
};

type Node = Item & { x: number; y: number; r: number };

export default function BubbleChart({ data }: { data: Item[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 1100, height: 560 });
  const bottomGap = 20;
  const [nodes, setNodes] = useState<Node[]>([]);

  const radii = useMemo(() => {
    const maxAbs = d3.max(data, (d: Item) => Math.abs(d.change24hPct)) || 1;
    const scale = dims.width / 1100;
    return d3
      .scaleSqrt()
      .domain([0, maxAbs])
      .range([26 * scale, 90 * scale]);
  }, [data, dims.width]);

  useEffect(() => {
    const init = data.map<Node>((d) => ({
      ...d,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      r: radii(Math.abs(d.change24hPct)),
    }));
    setNodes(init);
  }, [data]);

  useEffect(() => {
    setNodes(ns => {
      ns.forEach(n => {
        n.r = radii(Math.abs(n.change24hPct));
      });
      return [...ns];
    });
  }, [radii]);

  useEffect(() => {
    const handleResize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || window.innerWidth;
      const top = rect?.top || 0;
      const height = window.innerHeight - top - bottomGap;
      setDims({ width, height });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setNodes(ns =>
      ns.map(n => ({
        ...n,
        x: Math.max(n.r, Math.min(dims.width - n.r, n.x || 0)),
        y: Math.max(n.r, Math.min(dims.height - n.r, n.y || 0)),
      }))
    );
  }, [dims.width, dims.height]);

  useEffect(() => {
    if (!nodes.length) return;
    const sim = (d3 as any)
      .forceSimulation(nodes as any)
      .force('x', (d3 as any).forceX(dims.width / 2).strength(0.05))
      .force('y', (d3 as any).forceY(dims.height / 2).strength(0.05))
      .force('charge', (d3 as any).forceManyBody().strength(2))
      .force('collision', (d3 as any)
        .forceCollide()
        .radius((d: Node) => d.r + 4)
        .iterations(2))
      .on('tick', () => {
        nodes.forEach(n => {
          n.x = Math.max(n.r, Math.min(dims.width - n.r, n.x || 0));
          n.y = Math.max(n.r, Math.min(dims.height - n.r, n.y || 0));
        });
        setNodes([...nodes]);
      });
    return () => void sim.stop();
  }, [nodes.length, dims.width, dims.height]);

  const borderColor = (v: number) =>
    v > 0
      ? '#0bd65e'
      : v < 0
      ? '#ff4d4d'
      : '#667';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: dims.height,
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
            className="bubble"
            href={n.link || '#'}
            target="_blank"
            rel="noreferrer"
            style={{
              position: 'absolute',
              left: (n.x || 0) - n.r,
              top: (n.y || 0) - n.r,
              width: n.r * 2,
              height: n.r * 2,
              ['--bubble-color' as any]: borderColor(pct),
              background: 'radial-gradient(circle at center, #0f1115 58%, var(--bubble-color) 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px var(--bubble-color)',
              overflow: 'hidden',
            } as CSSProperties}
            title={`${n.name}\nFloor: ${n.floorEth} ETH\n24h: ${pct > 0 ? '+' : ''}${pct}%`}
          >
            {n.image && (
              <img
                src={n.image}
                alt={n.name}
                style={{
                  width: '70%',
                  height: '70%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                }}
              />
            )}
            <div
              className="bubble-content"
              style={{
                position: 'absolute',
                inset: 0,
                padding: 8,
                lineHeight: 1.1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '50%',
              }}
            >
              <strong
                style={{ fontSize: Math.max(11, Math.min(16, n.r / 4.5)), fontWeight: 700, textShadow: '0 2px 6px rgba(0,0,0,.45)' }}
              >
                {n.name}
              </strong>
              <p style={{ opacity: 0.9, fontSize: Math.max(11, n.r / 6.5) }}>
                {n.floorEth.toFixed(2)} ETH
              </p>
              <p
                style={{ marginTop: 2, fontSize: Math.max(11, n.r / 6.2), fontWeight: 700, color: pct > 0 ? '#c9ffd8' : pct < 0 ? '#ffe0e0' : '#dfe3ea' }}
              >
                {pct > 0 ? '+' : ''}{pct}%
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
