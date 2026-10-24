'use client';

import { useEffect, useRef, useState } from 'react';

const VINE_PATH =
  'M40 0 C40 60, 70 90, 60 140 C48 180, 80 210, 66 260 C54 300, 84 320, 72 370 C62 410, 88 440, 76 490 C66 530, 90 560, 80 600';

const LEAF_PATH =
  'M-12 0 C-12 -10, -2 -14, 0 -2 C2 -14, 12 -10, 12 0 C12 6, 4 10, 0 8 C-4 10, -12 6, -12 0 Z';

export function Vine() {
  const ref = useRef<SVGSVGElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const total = el.parentElement?.clientHeight ?? rect.height;
      const start = total - rect.height;
      const raw = (start - rect.top) / total;
      setProgress(Math.max(0, Math.min(1, raw)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const length = 660;
  const leaves = [
    { d: 'M62 150 l-10 -14', x: 62, y: 150, rot: -24 },
    { d: 'M52 200 l12 -16', x: 52, y: 200, rot: 18 },
    { d: 'M68 262 l-12 -16', x: 68, y: 262, rot: -30 },
    { d: 'M54 320 l12 -14', x: 54, y: 320, rot: 20 },
    { d: 'M70 372 l-12 -16', x: 70, y: 372, rot: -26 },
    { d: 'M56 432 l12 -14', x: 56, y: 432, rot: 16 },
    { d: 'M72 484 l-12 -16', x: 72, y: 484, rot: -30 },
    { d: 'M58 540 l12 -14', x: 58, y: 540, rot: 18 },
  ];

  return (
    <svg
      ref={ref}
      className="pointer-events-none absolute inset-y-0 left-0 w-[120px] opacity-70"
      viewBox="0 0 100 660"
      fill="none"
      aria-hidden="true"
    >
      <g style={{ transform: `translateX(-20px)` }}>
        <path d={VINE_PATH} stroke="var(--evergreen)" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d={VINE_PATH}
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
        {leaves.map((leaf, i) => {
          const grown = ((i + 1) / leaves.length) * length <= length * progress;
          return (
            <g
              key={i}
              transform={`translate(${leaf.x - 14} ${leaf.y - 12}) rotate(${leaf.rot})`}
              opacity={grown ? 1 : 0.12}
              style={{ transition: 'opacity 200ms ease' }}
            >
              <path d={LEAF_PATH} fill="var(--seedling)" />
            </g>
          );
        })}
        <circle cx="80" cy="600" r="3" fill="var(--accent)" opacity={progress > 0.92 ? 1 : 0.15} />
      </g>
    </svg>
  );
}
