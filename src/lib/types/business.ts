export interface Business {
  id: string;
  name: string;
  description?: string;
  tin_number?: string;
  business_registration_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  business_type: 'company' | 'individual' | 'partnership' | 'corporation' | 'llc';
  industry?: string;
  tax_year_start: string;
  accounting_method: 'accrual' | 'cash';
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'accountant' | 'employee';
  permissions: string[];
  invited_by: string;
  joined_at: string;
  updated_at: string;
  user?: {
    first_name?: string;
    last_name?: string;
    email_address?: string;
    profile_image_url?: string;
  };
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_type: 'basic' | 'premium' | 'enterprise';
  max_businesses: number;
  current_business_count: number;
  subscription_status: 'active' | 'cancelled' | 'expired';
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessInvitation {
  id: string;
  business_id: string;
  invited_email: string;
  invited_by: string;
  role: 'owner' | 'admin' | 'accountant' | 'employee';
  permissions: string[];
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  updated_at: string;
  business?: {
    name: string;
  };
  inviter?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface CreateBusinessInput {
  name: string;
  description?: string;
  tin_number?: string;
  business_registration_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  business_type?: Business['business_type'];
  industry?: string;
  tax_year_start?: string;
  accounting_method?: Business['accounting_method'];
  logo_url?: string;
}

export interface UpdateBusinessInput extends Partial<CreateBusinessInput> {
  id: string;
}

export interface BusinessWithRole extends Business {
  user_role: 'owner' | 'admin' | 'accountant' | 'employee';
}