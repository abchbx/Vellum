import { getSessionUser } from '@/lib/auth';
import { ok, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return ok({ user: null });
    return ok({
      user: {
        id: user.id,
        email: user.email,
        handle: user.handle,
        displayName: user.displayName,
        bio: user.bio,
        gardenPublic: user.gardenPublic,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
