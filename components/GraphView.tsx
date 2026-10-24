'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3-force';

interface GraphNode {
  id: string;
  title: string;
  slug: string;
  status: string;
  size: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
}

const STATUS_COLOR: Record<string, string> = {
  seedling: 'var(--seedling)',
  budding: 'var(--budding)',
  evergreen: 'var(--evergreen)',
};

export function GraphView({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;
    const dataNodes: SimNode[] = nodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
    }));
    const dataLinks = edges
      .filter(
        (e) =>
          dataNodes.some((n) => n.id === e.source) && dataNodes.some((n) => n.id === e.target),
      )
      .map((e) => ({ ...e }));

    const link = forceLink<SimNode, SimLink>(dataLinks)
      .id((d) => d.id)
      .distance(90)
      .strength(0.35);

    const sim = forceSimulation<SimNode>(dataNodes)
      .force('link', link)
      .force('charge', forceManyBody().strength(-320))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<SimNode>().radius((d) => 18 + (d.size ?? 1) * 6))
      .alpha(1)
      .alphaDecay(0.022);

    let raf = 0;
    const stop = () => cancelAnimationFrame(raf);

    const draw = () => {
      const g = svg.querySelector('#graph-g');
      if (!g) return;
      const pos = new Map(dataNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));

      let lines = '';
      for (const l of dataLinks) {
        const a = pos.get(l.source);
        const b = pos.get(l.target);
        if (!a || !b) continue;
        lines += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
      }
      g.querySelector('#graph-edges')!.innerHTML = lines;

      let circles = '';
      for (const n of dataNodes) {
        const neighborSet = hover
          ? new Set(
              dataLinks
                .filter((l) => l.source === hover || l.target === hover)
                .map((l) => (l.source === hover ? l.target : l.source)),
            )
          : null;
        const dimmed = !!hover && !!neighborSet && !neighborSet.has(n.id);
        circles += `<circle cx="${n.x}" cy="${n.y}" r="${9 + (n.size ?? 1) * 4}" fill="${STATUS_COLOR[n.status] ?? 'var(--muted)'}" opacity="${dimmed ? 0.12 : hover && neighborSet ? 0.95 : 0.8}" data-id="${n.id}" class="graph-node" />`;
      }
      g.querySelector('#graph-nodes')!.innerHTML = circles;
    };

    sim.on('tick', draw);

    const onMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-id]') as HTMLElement | null;
      setHover(target?.dataset.id ?? null);
    };
    const onMouseOut = () => setHover(null);
    svg.addEventListener('mouseover', onMouseOver);
    svg.addEventListener('mouseout', onMouseOut);

    const resize = () => {
      const w = svg.clientWidth || 800;
      const h = svg.clientHeight || 600;
      sim.force('center', forceCenter(w / 2, h / 2));
      sim.alpha(0.4).restart();
    };
    window.addEventListener('resize', resize);

    let running = true;
    const loop = () => {
      if (!running) return;
      if (sim.alpha() < 0.01) {
        sim.stop();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      running = false;
      stop();
      svg.removeEventListener('mouseover', onMouseOver);
      svg.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('resize', resize);
      sim.stop();
    };
  }, [nodes, edges, hover]);

  const onNodeClick = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (node) router.push(`/app?note=${node.id}`);
  };

  const hovered = hover ? nodes.find((n) => n.id === hover) : null;

  if (nodes.length === 0) {
    return <div className="flex h-full items-center justify-center text-muted">还没有笔记，先去工作台种一篇。</div>;
  }

  return (
    <svg ref={svgRef} viewBox="0 0 800 600" className="h-full w-full" role="img" aria-label="知识图谱">
      <g id="graph-g">
        <g id="graph-edges" stroke="var(--line)" strokeWidth="1" />
        <g
          id="graph-nodes"
          onClick={(e) => {
            const target = (e.target as HTMLElement)?.closest('[data-id]') as HTMLElement | null;
            if (target?.dataset.id) onNodeClick(target.dataset.id);
          }}
        />
      </g>
      {hovered && (
        <g>
          <rect x="8" y="8" width="200" height="44" rx="8" fill="var(--surface)" stroke="var(--line)" />
          <text x="16" y="27" fontSize="13" fill="var(--ink)">
            {hovered.title.length > 22 ? `${hovered.title.slice(0, 22)}…` : hovered.title}
          </text>
          <text x="16" y="42" fontSize="10" fill="var(--muted)" className="font-mono">
            {hovered.status}
          </text>
        </g>
      )}
    </svg>
  );
}
