import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BusinessService } from '@/lib/services/business';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const members = await BusinessService.getBusinessMembers(businessId, userId);

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Error fetching business members:', error);

    if (error.message?.includes('permission')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch business members' },
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

    const body = await request.json();
    const { businessId, email, role, permissions } = body;

    if (!businessId || !email || !role) {
      return NextResponse.json(
        { error: 'Business ID, email, and role are required' },
        { status: 400 }
      );
    }

    const invitation = await BusinessService.inviteTeamMember(
      businessId,
      email,
      role,
      permissions || [],
      userId
    );

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error: any) {
    console.error('Error inviting team member:', error);

    if (error.message?.includes('permission')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to invite team member' },
      { status: 500 }
    );
  }
}