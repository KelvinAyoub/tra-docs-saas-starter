-- Additional RLS policies and functions for comprehensive business-level data isolation
-- This extends the multi-business management system with enhanced security

-- Function to accept business invitation
CREATE OR REPLACE FUNCTION accept_business_invitation(
  p_invitation_id UUID,
  p_user_id TEXT
)
RETURNS VOID AS $$
DECLARE
  invitation_record RECORD;
  new_business_id UUID;
BEGIN
  -- Get invitation details and validate
  SELECT * INTO invitation_record
  FROM public.business_invitations
  WHERE id = p_invitation_id
  AND status = 'pending'
  AND invited_email = (
    SELECT primary_email_address
    FROM clerk.users
    WHERE id = p_user_id
  )
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Create business member record
  INSERT INTO public.business_members (
    business_id,
    user_id,
    role,
    permissions,
    invited_by,
    joined_at
  ) VALUES (
    invitation_record.business_id,
    p_user_id,
    invitation_record.role,
    invitation_record.permissions,
    invitation_record.invited_by,
    NOW()
  );

  -- Update invitation status
  UPDATE public.business_invitations
  SET status = 'accepted',
      updated_at = NOW()
  WHERE id = p_invitation_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User is already a member of this business';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sample TRA compliance tables with business-level isolation
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'tax_payment', 'salary_payment')),
  category TEXT NOT NULL, -- TRA-specific categories: utilities, rent, salaries, supplies, etc.
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  reference_number TEXT, -- Invoice number, receipt number, etc.
  supplier_customer TEXT,
  vat_amount DECIMAL(12,2) DEFAULT 0,
  vat_inclusive BOOLEAN DEFAULT false,
  attachment_urls TEXT[] DEFAULT '{}', -- Array of document URLs
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  nida_number TEXT UNIQUE,
  tin_number TEXT,
  employee_id TEXT UNIQUE,
  department TEXT,
  position TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  base_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0,
  pension_rate DECIMAL(3,2) DEFAULT 0.10, -- 10% default
  is_active BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of the payroll month
  total_gross_pay DECIMAL(12,2) NOT NULL,
  total_paye DECIMAL(12,2) NOT NULL,
  total_sdl DECIMAL(12,2) NOT NULL,
  total_pension DECIMAL(12,2) NOT NULL,
  total_nssf DECIMAL(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'submitted', 'paid')),
  submitted_by TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  basic_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0,
  gross_pay DECIMAL(10,2) NOT NULL,
  paye_tax DECIMAL(10,2) NOT NULL,
  employee_pension DECIMAL(10,2) NOT NULL,
  employer_pension DECIMAL(10,2) NOT NULL,
  nssf_employee DECIMAL(10,2) DEFAULT 0,
  nssf_employer DECIMAL(10,2) DEFAULT 0,
  net_pay DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vat_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_output_vat DECIMAL(12,2) NOT NULL,
  total_input_vat DECIMAL(12,2) NOT NULL,
  vat_payable DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'paid')),
  submission_date DATE,
  payment_date DATE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'vat_return', 'paye_certificate', 'tax_return', etc.
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_data JSONB, -- Structured data for the document
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'signed', 'submitted')),
  generated_by TEXT NOT NULL,
  signed_by TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Transactions RLS policies
CREATE POLICY "Business members can read transactions" ON public.transactions
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Business members can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'create_transactions' = ANY(permissions)
    )
    AND created_by = auth.jwt() ->> 'sub'
  );

CREATE POLICY "Business members can update transactions" ON public.transactions
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'create_transactions' = ANY(permissions)
    )
  );

CREATE POLICY "Business members can delete transactions" ON public.transactions
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'create_transactions' = ANY(permissions)
    )
    AND created_by = auth.jwt() ->> 'sub'
  );

-- Employees RLS policies
CREATE POLICY "Business members can read employees" ON public.employees
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Payroll managers can manage employees" ON public.employees
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'manage_payroll' = ANY(permissions)
    )
  );

-- Payroll runs RLS policies
CREATE POLICY "Business members can read payroll runs" ON public.payroll_runs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'manage_payroll' = ANY(permissions)
    )
  );

CREATE POLICY "Payroll managers can manage payroll runs" ON public.payroll_runs
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'manage_payroll' = ANY(permissions)
    )
    AND created_by = auth.jwt() ->> 'sub'
  );

-- Payroll entries RLS policies
CREATE POLICY "Business members can read payroll entries" ON public.payroll_entries
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'manage_payroll' = ANY(permissions)
    )
  );

-- VAT returns RLS policies
CREATE POLICY "Business members can read VAT returns" ON public.vat_returns
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'view_reports' = ANY(permissions)
    )
  );

CREATE POLICY "Accountants can manage VAT returns" ON public.vat_returns
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'generate_documents' = ANY(permissions)
    )
    AND created_by = auth.jwt() ->> 'sub'
  );

-- Generated documents RLS policies
CREATE POLICY "Business members can read generated documents" ON public.generated_documents
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'view_reports' = ANY(permissions)
    )
  );

CREATE POLICY "Accountants can manage generated documents" ON public.generated_documents
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.jwt() ->> 'sub'
      AND 'generate_documents' = ANY(permissions)
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON public.transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);

CREATE INDEX IF NOT EXISTS idx_employees_business_id ON public.employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_nida_number ON public.employees(nida_number);
CREATE INDEX IF NOT EXISTS idx_employees_tin_number ON public.employees(tin_number);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_business_id ON public.payroll_runs(business_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON public.payroll_runs(month);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON public.payroll_runs(status);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_payroll_run_id ON public.payroll_entries(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee_id ON public.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_business_id ON public.payroll_entries(business_id);

CREATE INDEX IF NOT EXISTS idx_vat_returns_business_id ON public.vat_returns(business_id);
CREATE INDEX IF NOT EXISTS idx_vat_returns_period ON public.vat_returns(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_vat_returns_status ON public.vat_returns(status);

CREATE INDEX IF NOT EXISTS idx_generated_documents_business_id ON public.generated_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON public.generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_generated_documents_status ON public.generated_documents(status);

-- Create updated_at triggers
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vat_returns_updated_at
  BEFORE UPDATE ON public.vat_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check user permissions for a business
CREATE OR REPLACE FUNCTION check_business_permission(
  p_business_id UUID,
  p_user_id TEXT,
  p_required_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  member_role TEXT;
  member_permissions TEXT[];
BEGIN
  -- Get user's role and permissions for the business
  SELECT role, permissions INTO member_role, member_permissions
  FROM public.business_members
  WHERE business_id = p_business_id
  AND user_id = p_user_id;

  -- Check if user is a member
  IF member_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Owner has all permissions
  IF member_role = 'owner' THEN
    RETURN TRUE;
  END IF;

  -- Check if user has the required permission
  IF p_required_permission = ANY(member_permissions) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible businesses
CREATE OR REPLACE FUNCTION get_accessible_businesses(p_user_id TEXT)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  user_role TEXT,
  permissions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    bm.role,
    bm.permissions
  FROM public.businesses b
  JOIN public.business_members bm ON b.id = bm.business_id
  WHERE bm.user_id = p_user_id
  AND b.is_active = true
  ORDER BY bm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate business context for API calls
CREATE OR REPLACE FUNCTION validate_business_context(p_business_id UUID, p_user_id TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  user_role TEXT,
  permissions TEXT[]
) AS $$
DECLARE
  access_record RECORD;
BEGIN
  -- Get user's access record for the business
  SELECT b.id, bm.role, bm.permissions INTO access_record
  FROM public.businesses b
  JOIN public.business_members bm ON b.id = bm.business_id
  WHERE bm.user_id = p_user_id
  AND b.id = p_business_id
  AND b.is_active = true;

  -- Return validation results
  RETURN QUERY
  SELECT
    (access_record.id IS NOT NULL) as is_valid,
    COALESCE(access_record.role, '') as user_role,
    COALESCE(access_record.permissions, ARRAY[]::TEXT[]) as permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for business transaction summaries
CREATE OR REPLACE VIEW business_transaction_summaries AS
SELECT
  b.id as business_id,
  b.name as business_name,
  COUNT(t.id) as total_transactions,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
  COALESCE(SUM(t.amount), 0) as net_amount,
  MIN(t.date) as earliest_transaction,
  MAX(t.date) as latest_transaction
FROM public.businesses b
LEFT JOIN public.transactions t ON b.id = t.business_id
WHERE b.is_active = true
GROUP BY b.id, b.name;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;