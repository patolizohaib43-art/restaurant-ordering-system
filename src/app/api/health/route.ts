import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, status: 'ok', db: 'connected' });
  } catch (error) {
    return NextResponse.json(
      { success: false, status: 'error', message: 'Database connection failed' },
      { status: 500 }
    );
  }
}
