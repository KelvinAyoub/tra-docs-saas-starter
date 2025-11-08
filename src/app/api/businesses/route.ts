import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BusinessService } from '@/lib/services/business';
import { CreateBusinessInput } from '@/lib/types/business';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businesses = await BusinessService.getUserBusinesses(userId);

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateBusinessInput = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    const business = await BusinessService.createBusiness(body, userId);

    return NextResponse.json({ business }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating business:', error);

    // Handle specific error cases
    if (error.message?.includes('maximum business limit')) {
      return NextResponse.json(
        { error: 'You have reached the maximum number of businesses for your subscription' },
        { status: 429 }
      );
    }

    if (error.message?.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'TIN number or registration number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}