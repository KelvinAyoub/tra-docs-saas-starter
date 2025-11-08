import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BusinessService } from '@/lib/services/business';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const business = await BusinessService.getCurrentBusiness(userId);

    if (!business) {
      return NextResponse.json(
        { error: 'No current business found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Error fetching current business:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current business' },
      { status: 500 }
    );
  }
}