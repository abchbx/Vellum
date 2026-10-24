import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') ?? 'Vellum · 数字花园').slice(0, 60);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f6f4ef 0%, #efeae0 100%)',
          fontFamily: 'Georgia, serif',
          padding: '60px',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: '0.2em', color: '#6b675e', marginBottom: 24 }}>
          VELLUM · DIGITAL GARDEN
        </div>
        <div style={{ fontSize: 72, fontWeight: 400, color: '#171613', textAlign: 'center' }}>
          种一座思想的花园
        </div>
        <div style={{ fontSize: 24, color: '#6b675e', marginTop: 24 }}>{title}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
