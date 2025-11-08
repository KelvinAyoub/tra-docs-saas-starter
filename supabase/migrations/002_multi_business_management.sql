-- Multi-Business Management System Migration for TRA Compliance SaaS
-- This migration creates tables for managing multiple businesses per user with subscription controls

-- Businesses table to store business profiles
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tin_number TEXT UNIQUE, -- Tax Identification Number
  business_registration_number TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  business_type TEXT DEFAULT 'company', -- company, individual, partnership, etc.
  industry TEXT,
  tax_year_start DATE DEFAULT '2024-07-01', -- Tanzania tax year default
  accounting_method TEXT DEFAULT 'accrual', -- accrual or cash
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business members table for team collaboration
CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, accountant, employee
  permissions TEXT[] DEFAULT '{}', -- Array of permissions: view_transactions, create_transactions, manage_payroll, etc.
  invited_by TEXT NOT NULL, -- Clerk user ID of who invited
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- User subscriptions table for managing business limits
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL, -- Clerk user ID
  plan_type TEXT NOT NULL DEFAULT 'basic', -- basic, premium, enterprise
  max_businesses INTEGER NOT NULL DEFAULT 1,
  current_business_count INTEGER NOT NULL DEFAULT 0,
  subscription_status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business invitations table for pending invitations
CREATE TABLE IF NOT EXISTS public.business_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by TEXT NOT NULL, -- Clerk user ID
  role TEXT NOT NULL DEFAULT 'member',
  permissions TEXT[] DEFAULT '{}',
  invitation_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired, cancelled
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all new tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses table
-- Users can read businesses they are members of
CREATE POLICY "Users can read businesses they are members of" ON public.businesses
  FOR SELECT USING (
    id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Users can insert businesses if they haven't exceeded their subscription limit
CREATE POLICY "Users can create businesses within subscription limits" ON public.businesses
  FOR INSERT WITH CHECK (
    -- Check if user is within subscription limits
    (
      SELECT COALESCE((
        SELECT max_businesses FROM public.user_subscriptions
        WHERE user_id = auth.jwt() ->> 'sub'
        AND subscription_status = 'active'
        AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
      ), 1)
    ) > (
      SELECT COUNT(*) FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND role = 'owner'
    )
  );

-- Business owners and admins can update businesses
CREATE POLICY "Business owners and admins can update businesses" ON public.businesses
  FOR UPDATE USING (
    auth.jwt() ->> 'sub' IN (
      SELECT user_id FROM public.business_members
      WHERE business_id = id
      AND role IN ('owner', 'admin')
    )
  );

-- Business owners can delete businesses
CREATE POLICY "Business owners can delete businesses" ON public.businesses
  FOR DELETE USING (
    auth.jwt() ->> 'sub' IN (
      SELECT user_id FROM public.business_members
      WHERE business_id = id
      AND role = 'owner'
    )
  );

-- RLS Policies for business_members table
-- Users can read business memberships for businesses they are members of
CREATE POLICY "Users can read business memberships for their businesses" ON public.business_members
  FOR SELECT USING (
    auth.jwt() ->> 'sub' IN (
      SELECT user_id FROM public.business_members
      WHERE business_id = public.business_members.business_id
    )
  );

-- Business owners and admins can manage members
CREATE POLICY "Business owners and admins can manage members" ON public.business_members
  FOR ALL USING (
    auth.jwt() ->> 'sub' IN (
      SELECT user_id FROM public.business_members
      WHERE business_id = public.business_members.business_id
      AND role IN ('owner', 'admin')
    )
  );

-- Users can insert themselves as owners for new businesses
CREATE POLICY "Users can insert themselves as business owners" ON public.business_members
  FOR INSERT WITH CHECK (
    user_id = auth.jwt() ->> 'sub'
    AND role = 'owner'
  );

-- RLS Policies for user_subscriptions table
-- Users can only read and update their own subscription
CREATE POLICY "Users can manage own subscription" ON public.user_subscriptions
  FOR ALL USING (auth.jwt() ->> 'sub' = user_id);

-- RLS Policies for business_invitations table
-- Users can read invitations they sent or received
CREATE POLICY "Users can read relevant invitations" ON public.business_invitations
  FOR SELECT USING (
    auth.jwt() ->> 'sub' = invited_by
    OR invited_email = (
      SELECT primary_email_address FROM clerk.users
      WHERE id = auth.jwt() ->> 'sub'
    )
  );

-- Users can create invitations for businesses they own/admin
CREATE POLICY "Business owners and admins can create invitations" ON public.business_invitations
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'sub' IN (
      SELECT user_id FROM public.business_members
      WHERE business_id = business_id
      AND role IN ('owner', 'admin')
    )
  );

-- Users can update invitation status they received
CREATE POLICY "Users can accept invitations sent to them" ON public.business_invitations
  FOR UPDATE USING (
    invited_email = (
      SELECT primary_email_address FROM clerk.users
      WHERE id = auth.jwt() ->> 'sub'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(id);
CREATE INDEX IF NOT EXISTS idx_businesses_tin_number ON public.businesses(tin_number);
CREATE INDEX IF NOT EXISTS idx_businesses_registration_number ON public.businesses(business_registration_number);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON public.businesses(is_active);

CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON public.business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_role ON public.business_members(role);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_type ON public.user_subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(subscription_status);

CREATE INDEX IF NOT EXISTS idx_business_invitations_business_id ON public.business_invitations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_invitations_invited_email ON public.business_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_business_invitations_token ON public.business_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_business_invitations_status ON public.business_invitations(status);

-- Create updated_at triggers for all new tables
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_members_updated_at
  BEFORE UPDATE ON public.business_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_invitations_updated_at
  BEFORE UPDATE ON public.business_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create a new business with owner membership
CREATE OR REPLACE FUNCTION create_business_with_owner(
  business_name TEXT,
  owner_user_id TEXT,
  tin_number TEXT DEFAULT NULL,
  business_registration_number TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  website TEXT DEFAULT NULL,
  business_type TEXT DEFAULT 'company',
  industry TEXT DEFAULT NULL,
  tax_year_start DATE DEFAULT '2024-07-01',
  accounting_method TEXT DEFAULT 'accrual'
)
RETURNS UUID AS $$
DECLARE
  new_business_id UUID;
  subscription_limit INTEGER;
  current_business_count INTEGER;
BEGIN
  -- Check subscription limits
  SELECT max_businesses INTO subscription_limit
  FROM public.user_subscriptions
  WHERE user_id = owner_user_id
  AND subscription_status = 'active'
  AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW());

  IF subscription_limit IS NULL THEN
    subscription_limit := 1; -- Default limit
  END IF;

  -- Count current businesses owned by user
  SELECT COUNT(*) INTO current_business_count
  FROM public.business_members
  WHERE user_id = owner_user_id
  AND role = 'owner';

  IF current_business_count >= subscription_limit THEN
    RAISE EXCEPTION 'User has reached maximum business limit for their subscription';
  END IF;

  -- Create the business
  INSERT INTO public.businesses (
    name, tin_number, business_registration_number, description,
    address, phone, email, website, business_type, industry,
    tax_year_start, accounting_method
  ) VALUES (
    business_name, tin_number, business_registration_number, description,
    address, phone, email, website, business_type, industry,
    tax_year_start, accounting_method
  ) RETURNING id INTO new_business_id;

  -- Create owner membership
  INSERT INTO public.business_members (business_id, user_id, role, invited_by)
  VALUES (new_business_id, owner_user_id, 'owner', owner_user_id);

  -- Update business count in subscription
  UPDATE public.user_subscriptions
  SET current_business_count = current_business_count + 1
  WHERE user_id = owner_user_id;

  RETURN new_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current active business for user
CREATE OR REPLACE FUNCTION get_current_business(user_id_param TEXT)
RETURNS TABLE(id UUID, name TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.name, bm.role
  FROM public.businesses b
  JOIN public.business_members bm ON b.id = bm.business_id
  WHERE bm.user_id = user_id_param
  AND b.is_active = true
  ORDER BY bm.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update business count on membership deletion
CREATE OR REPLACE FUNCTION update_business_count_on_member_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If this was an owner, decrement the count
  IF OLD.role = 'owner' THEN
    UPDATE public.user_subscriptions
    SET current_business_count = GREATEST(current_business_count - 1, 0)
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_member_delete_trigger
  AFTER DELETE ON public.business_members
  FOR EACH ROW
  EXECUTE FUNCTION update_business_count_on_member_delete();