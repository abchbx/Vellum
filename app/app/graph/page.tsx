import { GraphView } from '@/components/GraphView';
import { getGraph } from '@/db/queries';
import { getSessionUser } from '@/lib/auth';
import Link from 'next/link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function GraphPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const graph = await getGraph(user.id);

  return (
    <div className="mx-auto h-[calc(100vh-65px)] max-w-[1180px] px-6 py-8 md:px-12">
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="font-serif text-3xl">知识图谱</h1>
        <p className="text-sm text-muted">
          {graph.nodes.length} 个节点 · {graph.edges.length} 条链接 · 悬停高亮一阶邻居
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-5 font-mono text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--seedling)' }} />幼苗</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--budding)' }} />抽芽</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--evergreen)' }} />常青</span>
        <Link href="/app" className="link-underline">回工作台</Link>
      </div>
      <div className="paper relative mt-8 h-[60vh] overflow-hidden">
        <GraphView nodes={graph.nodes} edges={graph.edges} />
      </div>
    </div>
  );
}
