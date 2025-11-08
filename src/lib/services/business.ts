import { createClient } from '@/lib/supabase';
import {
  Business,
  BusinessMember,
  UserSubscription,
  BusinessInvitation,
  CreateBusinessInput,
  UpdateBusinessInput,
  BusinessWithRole
} from '@/lib/types/business';

const supabase = createClient();

export class BusinessService {
  // Business CRUD operations
  static async createBusiness(data: CreateBusinessInput, userId: string): Promise<BusinessWithRole> {
    try {
      // First, ensure user has a subscription record
      await this.ensureUserSubscription(userId);

      // Create business using the stored procedure
      const { data: businessData, error } = await supabase.rpc('create_business_with_owner', {
        business_name: data.name,
        owner_user_id: userId,
        tin_number: data.tin_number,
        business_registration_number: data.business_registration_number,
        description: data.description,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        business_type: data.business_type || 'company',
        industry: data.industry,
        tax_year_start: data.tax_year_start || '2024-07-01',
        accounting_method: data.accounting_method || 'accrual'
      });

      if (error) {
        throw new Error(`Failed to create business: ${error.message}`);
      }

      // Fetch the complete business with role
      const { data: businessWithRole, error: fetchError } = await supabase
        .from('businesses')
        .select(`
          *,
          business_members!inner(role)
        `)
        .eq('id', businessData)
        .eq('business_members.user_id', userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch created business: ${fetchError.message}`);
      }

      return {
        ...businessWithRole,
        user_role: businessWithRole.business_members.role
      };
    } catch (error) {
      console.error('Error creating business:', error);
      throw error;
    }
  }

  static async getUserBusinesses(userId: string): Promise<BusinessWithRole[]> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          business_members!inner(role)
        `)
        .eq('business_members.user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user businesses: ${error.message}`);
      }

      return data.map(business => ({
        ...business,
        user_role: business.business_members.role
      }));
    } catch (error) {
      console.error('Error fetching user businesses:', error);
      throw error;
    }
  }

  static async getBusinessById(businessId: string, userId: string): Promise<BusinessWithRole | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          business_members!inner(role)
        `)
        .eq('id', businessId)
        .eq('business_members.user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Business not found or user doesn't have access
        }
        throw new Error(`Failed to fetch business: ${error.message}`);
      }

      return {
        ...data,
        user_role: data.business_members.role
      };
    } catch (error) {
      console.error('Error fetching business:', error);
      throw error;
    }
  }

  static async updateBusiness(data: UpdateBusinessInput, userId: string): Promise<BusinessWithRole> {
    try {
      // Verify user has permission to update the business
      const hasPermission = await this.verifyBusinessPermission(data.id, userId, ['owner', 'admin']);
      if (!hasPermission) {
        throw new Error('You do not have permission to update this business');
      }

      const updateData = { ...data };
      delete updateData.id; // Remove id from update data

      const { data: updatedBusiness, error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', data.id)
        .select(`
          *,
          business_members!inner(role)
        `)
        .eq('business_members.user_id', userId)
        .single();

      if (error) {
        throw new Error(`Failed to update business: ${error.message}`);
      }

      return {
        ...updatedBusiness,
        user_role: updatedBusiness.business_members.role
      };
    } catch (error) {
      console.error('Error updating business:', error);
      throw error;
    }
  }

  static async deleteBusiness(businessId: string, userId: string): Promise<void> {
    try {
      // Verify user is the owner
      const hasPermission = await this.verifyBusinessPermission(businessId, userId, ['owner']);
      if (!hasPermission) {
        throw new Error('Only business owners can delete businesses');
      }

      const { error } = await supabase
        .from('businesses')
        .update({ is_active: false })
        .eq('id', businessId);

      if (error) {
        throw new Error(`Failed to delete business: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting business:', error);
      throw error;
    }
  }

  static async getCurrentBusiness(userId: string): Promise<BusinessWithRole | null> {
    try {
      const { data, error } = await supabase.rpc('get_current_business', {
        user_id_param: userId
      });

      if (error) {
        throw new Error(`Failed to get current business: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const businessInfo = data[0];

      // Fetch complete business details
      return this.getBusinessById(businessInfo.id, userId);
    } catch (error) {
      console.error('Error getting current business:', error);
      throw error;
    }
  }

  // Business Members Management
  static async getBusinessMembers(businessId: string, userId: string): Promise<BusinessMember[]> {
    try {
      // Verify user has permission
      const hasPermission = await this.verifyBusinessPermission(businessId, userId, ['owner', 'admin']);
      if (!hasPermission) {
        throw new Error('You do not have permission to view business members');
      }

      const { data, error } = await supabase
        .from('business_members')
        .select(`
          *,
          user:profiles!user_id(
            first_name,
            last_name,
            email_address,
            profile_image_url
          )
        `)
        .eq('business_id', businessId)
        .order('joined_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch business members: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching business members:', error);
      throw error;
    }
  }

  static async inviteTeamMember(
    businessId: string,
    email: string,
    role: BusinessMember['role'],
    permissions: string[],
    userId: string
  ): Promise<BusinessInvitation> {
    try {
      // Verify user has permission
      const hasPermission = await this.verifyBusinessPermission(businessId, userId, ['owner', 'admin']);
      if (!hasPermission) {
        throw new Error('You do not have permission to invite team members');
      }

      // Generate invitation token
      const invitationToken = this.generateInvitationToken();

      const { data, error } = await supabase
        .from('business_invitations')
        .insert({
          business_id: businessId,
          invited_email: email,
          invited_by: userId,
          role,
          permissions,
          invitation_token: invitationToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select(`
          *,
          business:businesses(name),
          inviter:profiles!invited_by(first_name, last_name)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create invitation: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error inviting team member:', error);
      throw error;
    }
  }

  static async getPendingInvitations(userId: string): Promise<BusinessInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('business_invitations')
        .select(`
          *,
          business:businesses(name),
          inviter:profiles!invited_by(first_name, last_name)
        `)
        .eq('invited_email', (await this.getUserEmail(userId))!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch pending invitations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      throw error;
    }
  }

  static async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('accept_business_invitation', {
        p_invitation_id: invitationId,
        p_user_id: userId
      });

      if (error) {
        throw new Error(`Failed to accept invitation: ${error.message}`);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  static async removeTeamMember(businessId: string, memberUserId: string, userId: string): Promise<void> {
    try {
      // Verify user has permission
      const hasPermission = await this.verifyBusinessPermission(businessId, userId, ['owner', 'admin']);
      if (!hasPermission) {
        throw new Error('You do not have permission to remove team members');
      }

      const { error } = await supabase
        .from('business_members')
        .delete()
        .eq('business_id', businessId)
        .eq('user_id', memberUserId);

      if (error) {
        throw new Error(`Failed to remove team member: ${error.message}`);
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  }

  // Subscription Management
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

  static async ensureUserSubscription(userId: string): Promise<UserSubscription> {
    try {
      let subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        // Create default subscription
        const { data, error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_type: 'basic',
            max_businesses: 1,
            current_business_count: 0,
            subscription_status: 'active'
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create user subscription: ${error.message}`);
        }

        subscription = data;
      }

      return subscription;
    } catch (error) {
      console.error('Error ensuring user subscription:', error);
      throw error;
    }
  }

  // Helper Methods
  private static async verifyBusinessPermission(
    businessId: string,
    userId: string,
    allowedRoles: BusinessMember['role'][]
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('business_members')
        .select('role')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .single();

      if (error) {
        return false;
      }

      return allowedRoles.includes(data.role);
    } catch (error) {
      console.error('Error verifying business permission:', error);
      return false;
    }
  }

  private static generateInvitationToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  private static async getUserEmail(userId: string): Promise<string | null> {
    try {
      // This would typically use Clerk's API to get user email
      // For now, return null as a placeholder
      return null;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  }
}