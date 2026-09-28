import { ImageResponse } from 'next/server';

export const runtime = 'edge';
export const alt = 'Calora appointment booking and scheduling';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ alignItems: 'center', background: '#101827', color: 'white', display: 'flex', height: '100%', justifyContent: 'center', padding: '72px', width: '100%' }}>
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
          <div style={{ alignItems: 'center', background: '#5146D8', borderRadius: '20px', display: 'flex', fontSize: '42px', height: '88px', justifyContent: 'center', width: '88px' }}>C</div>
          <div style={{ fontSize: '72px', fontWeight: 800, marginTop: '30px' }}>Calora</div>
          <div style={{ color: '#B8C0D0', fontSize: '34px', lineHeight: 1.35, marginTop: '20px', maxWidth: '880px' }}>
            Appointment booking and scheduling, connected to your business.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
