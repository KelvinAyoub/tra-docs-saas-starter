import { createClient } from '@/lib/supabase';
import { UserSubscription } from '@/lib/types/business';

const supabase = createClient();

export class SubscriptionService {
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch user subscription: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      throw error;
    }
  }

  static async canCreateBusiness(userId: string): Promise<{ canCreate: boolean; reason?: string; maxBusinesses: number; currentCount: number }> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        // Create default subscription if it doesn't exist
        await this.ensureDefaultSubscription(userId);
        const newSubscription = await this.getUserSubscription(userId);

        if (!newSubscription) {
          return { canCreate: false, reason: 'Unable to verify subscription', maxBusinesses: 0, currentCount: 0 };
        }

        return {
          canCreate: newSubscription.current_business_count < newSubscription.max_businesses,
          reason: newSubscription.current_business_count >= newSubscription.max_businesses
            ? `You have reached your limit of ${newSubscription.max_businesses} businesses on the ${newSubscription.plan_type} plan`
            : undefined,
          maxBusinesses: newSubscription.max_businesses,
          currentCount: newSubscription.current_business_count
        };
      }

      // Check if subscription is active
      if (subscription.subscription_status !== 'active') {
        return {
          canCreate: false,
          reason: 'Your subscription is not active',
          maxBusinesses: subscription.max_businesses,
          currentCount: subscription.current_business_count
        };
      }

      // Check if subscription has expired
      if (subscription.subscription_expires_at && new Date(subscription.subscription_expires_at) < new Date()) {
        return {
          canCreate: false,
          reason: 'Your subscription has expired',
          maxBusinesses: subscription.max_businesses,
          currentCount: subscription.current_business_count
        };
      }

      // Check business count limit
      const canCreate = subscription.current_business_count < subscription.max_businesses;

      return {
        canCreate,
        reason: canCreate ? undefined : `You have reached your limit of ${subscription.max_businesses} businesses on the ${subscription.plan_type} plan`,
        maxBusinesses: subscription.max_businesses,
        currentCount: subscription.current_business_count
      };
    } catch (error) {
      console.error('Error checking business creation permission:', error);
      return {
        canCreate: false,
        reason: 'Unable to verify subscription status',
        maxBusinesses: 0,
        currentCount: 0
      };
    }
  }

  static async upgradeSubscription(userId: string, planType: 'basic' | 'premium' | 'enterprise'): Promise<UserSubscription> {
    try {
      const planLimits = {
        basic: { maxBusinesses: 1, price: 0 },
        premium: { maxBusinesses: 10, price: 29 },
        enterprise: { maxBusinesses: -1, price: 99 } // -1 for unlimited
      };

      const limits = planLimits[planType];

      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          plan_type: planType,
          max_businesses: limits.maxBusinesses === -1 ? 999 : limits.maxBusinesses, // Large number for unlimited
          subscription_status: 'active',
          subscription_expires_at: planType === 'basic' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year for paid plans
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to upgrade subscription: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  }

  static async cancelSubscription(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  static async getSubscriptionFeatures(planType: string): Promise<{
    maxBusinesses: number;
    features: string[];
    price: number;
  }> {
    const features = {
      basic: {
        maxBusinesses: 1,
        features: [
          'Business profile management',
          'Basic document generation',
          'Bank statement upload',
          'AI chat assistance',
          'Email support'
        ],
        price: 0
      },
      premium: {
        maxBusinesses: 10,
        features: [
          'Everything in Basic',
          'Up to 10 businesses',
          'Advanced document generation',
          'ERP integrations (1 connection)',
          'Priority email support',
          'Team collaboration (5 members per business)',
          'Advanced reporting'
        ],
        price: 29
      },
      enterprise: {
        maxBusinesses: -1, // Unlimited
        features: [
          'Everything in Premium',
          'Unlimited businesses',
          'Unlimited ERP connections',
          'Phone & email support',
          'Unlimited team members',
          'Custom branding',
          'API access',
          'Dedicated account manager'
        ],
        price: 99
      }
    };

    return features[planType as keyof typeof features] || features.basic;
  }

  private static async ensureDefaultSubscription(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'basic',
          max_businesses: 1,
          current_business_count: 0,
          subscription_status: 'active'
        })
        .select();

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw new Error(`Failed to create default subscription: ${error.message}`);
      }
    } catch (error) {
      console.error('Error ensuring default subscription:', error);
      throw error;
    }
  }

  static async getBusinessUsageStats(userId: string): Promise<{
    totalBusinesses: number;
    activeBusinesses: number;
    totalTeamMembers: number;
    subscriptionUsed: number; // percentage
  }> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        return {
          totalBusinesses: 0,
          activeBusinesses: 0,
          totalTeamMembers: 0,
          subscriptionUsed: 0
        };
      }

      // Get user's businesses and team members
      const { data: businesses } = await supabase
        .from('businesses')
        .select(`
          id,
          is_active,
          business_members!inner(user_id)
        `)
        .eq('business_members.user_id', userId)
        .eq('business_members.role', 'owner');

      const { data: allMembers } = await supabase
        .from('business_members')
        .select('business_id')
        .in('business_id', businesses?.map(b => b.id) || []);

      const totalBusinesses = businesses?.length || 0;
      const activeBusinesses = businesses?.filter(b => b.is_active).length || 0;
      const totalTeamMembers = allMembers?.length || 0;

      const subscriptionUsed = subscription.max_businesses > 0
        ? Math.round((subscription.current_business_count / subscription.max_businesses) * 100)
        : 0;

      return {
        totalBusinesses,
        activeBusinesses,
        totalTeamMembers,
        subscriptionUsed
      };
    } catch (error) {
      console.error('Error getting business usage stats:', error);
      return {
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalTeamMembers: 0,
        subscriptionUsed: 0
      };
    }
  }
}