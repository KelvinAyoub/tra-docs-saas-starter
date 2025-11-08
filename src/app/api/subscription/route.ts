import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SubscriptionService } from '@/lib/services/subscription';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await SubscriptionService.getUserSubscription(userId);

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
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
    const { action, planType } = body;

    switch (action) {
      case 'upgrade':
        if (!planType) {
          return NextResponse.json(
            { error: 'Plan type is required for upgrade' },
            { status: 400 }
          );
        }
        const upgradedSubscription = await SubscriptionService.upgradeSubscription(
          userId,
          planType
        );
        return NextResponse.json({ subscription: upgradedSubscription });

      case 'cancel':
        await SubscriptionService.cancelSubscription(userId);
        return NextResponse.json({ message: 'Subscription cancelled successfully' });

      case 'check-creation-permission':
        const canCreate = await SubscriptionService.canCreateBusiness(userId);
        return NextResponse.json({ canCreate });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error managing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}