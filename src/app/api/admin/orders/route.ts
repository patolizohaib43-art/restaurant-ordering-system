import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
      ];
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { items: { select: { id: true, productName: true, quantity: true } } },
    });

    return apiSuccess(
      orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        orderType: o.orderType,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        totalAmount: o.totalAmount.toString(),
        itemCount: o.items.reduce((sum: number, i: any) => sum + i.quantity, 0),
        createdAt: o.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('GET /api/admin/orders failed:', error);
    return apiError('Could not load orders.', 500);
  }
}
