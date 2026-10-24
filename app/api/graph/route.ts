import { NextRequest } from 'next/server';
import { requireUserFromRequest } from '@/lib/auth';
import { getGraph } from '@/db/queries';
import { ok, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromRequest(req);
    const graph = await getGraph(user.id);
    return ok({ nodes: graph.nodes, edges: graph.edges });
  } catch (err) {
    return handleError(err);
  }
}
