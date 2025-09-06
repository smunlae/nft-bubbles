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

type Node = Item & {
  x: number;
  y: number;
  r: number;
  fx?: number | null;
  fy?: number | null;
};

export default function BubbleChart({ data }: { data: Item[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const bottomGap = 20;
  const [nodes, setNodes] = useState<Node[]>([]);
  const simRef = useRef<any>(null);
  const draggingRef = useRef(false);
  const holdRef = useRef(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [hovered, setHovered] = useState<Node | null>(null);

  const radii = useMemo(() => {
    const maxAbs = d3.max(data, (d: Item) => Math.abs(d.change24hPct)) || 1;
    const scale = (dims.width || 1100) / 1100;
    const sizeMultiplier = 1.7;
    return d3
      .scaleSqrt()
      .domain([0, maxAbs])
      .range([36 * scale * sizeMultiplier, 110 * scale * sizeMultiplier]);
  }, [data, dims.width]);

  useEffect(() => {
    if (!dims.width || !dims.height) return;
    const init = data.map<Node>(d => ({
      ...d,
      x: Math.random() * dims.width,
      y: Math.random() * dims.height,
      r: radii(Math.abs(d.change24hPct)),
    }));
    setNodes(init);
  }, [data, dims.width, dims.height, radii]);

  useEffect(() => {
    setNodes(ns => {
      ns.forEach(n => {
        n.r = radii(Math.abs(n.change24hPct));
      });
      return [...ns];
    });
  }, [radii]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDims(prev => ({
        width: rect.width || prev.width,
        height: window.innerHeight - rect.top - bottomGap,
      }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
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
      .force('center', (d3 as any).forceCenter(dims.width / 2, dims.height / 2))
      .force('charge', (d3 as any).forceManyBody().strength(-20))
      .force(
        'collision',
        (d3 as any)
          .forceCollide()
          .radius((d: Node) => d.r + 6)
          .iterations(2),
      )
      .on('tick', () => {
        nodes.forEach(n => {
          n.x = Math.max(n.r, Math.min(dims.width - n.r, n.x || 0));
          n.y = Math.max(n.r, Math.min(dims.height - n.r, n.y || 0));
        });
        setNodes([...nodes]);
      });
    simRef.current = sim;
    return () => void sim.stop();
  }, [nodes.length, dims.width, dims.height]);

  const borderColor = (v: number) =>
    v > 0 ? '#0bd65e' : v < 0 ? '#ff4d4d' : '#667';

  const startDrag = (e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    dragCleanupRef.current?.();
    draggingRef.current = false;
    holdRef.current = false;
    holdTimer.current = window.setTimeout(() => {
      holdRef.current = true;
    }, 250);
    activePointerId.current = e.pointerId;
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect?.left || 0;
    const offsetY = rect?.top || 0;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== activePointerId.current) return;
      if (!ev.buttons) {
        // Pointer released; finalize the drag without event context.
        up();
        return;
      }
      draggingRef.current = true;
      setNodes(ns => {
        const n = ns[idx];
        if (!n) return ns;
        const x = Math.max(
          n.r,
          Math.min(dims.width - n.r, ev.clientX - offsetX),
        );
        const y = Math.max(
          n.r,
          Math.min(dims.height - n.r, ev.clientY - offsetY),
        );
        n.fx = x;
        n.fy = y;
        return [...ns];
      });
    };

    const up = () => {
      window.clearTimeout(holdTimer.current);
      draggingRef.current = false;
      holdRef.current = false;
      activePointerId.current = null;
      const target = e.currentTarget as HTMLElement;
      if (target.hasPointerCapture?.(e.pointerId)) {
        target.releasePointerCapture?.(e.pointerId);
      }
      setNodes(ns => {
        const n = ns[idx];
        if (n) {
          n.fx = null;
          n.fy = null;
        }
        return [...ns];
      });
      simRef.current?.alphaTarget(0);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      dragCleanupRef.current = null;
    };

    simRef.current?.alphaTarget(0.3).restart();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    dragCleanupRef.current = up;
  };

  const sparkline = useMemo(() => {
    if (!hovered) return null;
    const len = 20;
    const base = hovered.floorEth;
    const values = d3.range(len).map(() => base * (0.9 + Math.random() * 0.2));
    const w = 120;
    const h = 40;
    const x = d3.scaleLinear().domain([0, len - 1]).range([0, w]);
    const y = d3
      .scaleLinear()
      .domain([d3.min(values) || 0, d3.max(values) || 0])
      .range([h, 0]);
    const line = d3
      .line()
      .x((_: number, i: number) => x(i))
      .y((d: number) => y(d))
      .curve(d3.curveMonotoneX);
    return { d: line(values) || '', w, h };
  }, [hovered]);

  const tooltipDims = { w: 160, h: 90 };
  const tooltipPos = hovered
    ? {
        left: Math.min(
          Math.max((hovered.x || 0) - tooltipDims.w / 2, 0),
          dims.width - tooltipDims.w,
        ),
        top: Math.max(
          (hovered.y || 0) - hovered.r - tooltipDims.h - 8,
          0,
        ),
      }
    : null;

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
        touchAction: 'none',
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
            onPointerDown={e => startDrag(e, i)}
            onClick={e => {
              if (draggingRef.current || holdRef.current) {
                e.preventDefault();
              }
              draggingRef.current = false;
              holdRef.current = false;
            }}
            style={{
              position: 'absolute',
              left: (n.x || 0) - n.r,
              top: (n.y || 0) - n.r,
              width: n.r * 2,
              height: n.r * 2,
              ['--bubble-color' as any]: borderColor(pct),
              background: 'radial-gradient(circle at center, #0f1115 58%, var(--bubble-color) 100%)',
              borderRadius: '50%',
              boxShadow: '0 0 10px var(--bubble-color)',
              overflow: 'hidden',
              cursor: 'grab',
              touchAction: 'none',
            } as CSSProperties}
            onPointerEnter={() => setHovered(n)}
            onPointerLeave={() => setHovered(null)}
          >
            {n.image && (
              <img
                src={n.image}
                alt={n.name}
                style={{
                  position: 'absolute',
                  top: '5%',
                  left: '50%',
                  transform: 'translateX(-50%)',
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
                left: 0,
                right: 0,
                bottom: 0,
                top: '58%',
                padding: 8,
                lineHeight: 1.1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0), var(--bubble-color))',
              }}
            >
              <strong
                style={{
                  fontSize: Math.max(11, Math.min(16, n.r / 4.5)),
                  fontWeight: 700,
                  textShadow: '0 2px 6px rgba(0,0,0,.45)',
                }}
              >
                {n.name}
              </strong>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: Math.max(11, n.r / 6.2),
                  fontWeight: 700,
                  color: pct > 0 ? '#c9ffd8' : pct < 0 ? '#ffe0e0' : '#dfe3ea',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}
              >
                {pct > 0 ? '+' : ''}{pct}%
              </p>
              <p
                style={{
                  margin: '1px 0 0',
                  opacity: 0.9,
                  fontSize: Math.max(11, n.r / 6.5),
                  fontWeight: 700,
                  color: '#fff',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}
              >
                {n.floorEth.toFixed(2)} ETH
              </p>
            </div>
          </a>
        );
      })}
      {hovered && sparkline && tooltipPos && (
        <div
          style={{
            position: 'absolute',
            left: tooltipPos.left,
            top: tooltipPos.top,
            width: tooltipDims.w,
            padding: 8,
            background: '#0f1115',
            border: '1px solid #0bd65e',
            borderRadius: 8,
            pointerEvents: 'none',
            color: '#fff',
            fontSize: 12,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700 }}>{hovered.name}</div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 2,
            }}
          >
            <span>{hovered.floorEth.toFixed(2)} ETH</span>
            <span
              style={{
                color:
                  hovered.change24hPct > 0
                    ? '#0bd65e'
                    : hovered.change24hPct < 0
                      ? '#ff4d4d'
                      : '#dfe3ea',
              }}
            >
              {hovered.change24hPct > 0 ? '+' : ''}
              {hovered.change24hPct}%
            </span>
          </div>
          <svg
            width={sparkline.w}
            height={sparkline.h}
            style={{ marginTop: 4 }}
          >
            <path
              d={sparkline.d}
              stroke="#0bd65e"
              strokeWidth={2}
              fill="none"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
