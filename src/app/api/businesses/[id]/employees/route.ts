import { NextRequest, NextResponse } from 'next/server';
import { withBusinessAuth } from '@/lib/middleware/business-access';
import { createClient } from '@/lib/supabase';

// GET /api/businesses/[id]/employees
export const GET = withBusinessAuth(
  async (request, { businessId, userId, permissions }) => {
    try {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);

      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const isActive = searchParams.get('isActive');
      const department = searchParams.get('department');
      const offset = (page - 1) * limit;

      // Check if user has permission to view employees
      if (!permissions.includes('manage_payroll')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to view employees' },
          { status: 403 }
        );
      }

      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (isActive !== null) {
        query = query.eq('is_active', isActive === 'true');
      }
      if (department) {
        query = query.eq('department', department);
      }

      const { data: employees, error, count } = await query;

      if (error) {
        throw error;
      }

      // Get employee statistics
      const { data: stats } = await supabase
        .from('employees')
        .select('is_active, department')
        .eq('business_id', businessId)
        .then(({ data }) => {
          const active = data?.filter(e => e.is_active).length || 0;
          const inactive = data?.filter(e => !e.is_active).length || 0;
          const departments = [...new Set(data?.map(e => e.department).filter(Boolean))];
          return { active_count: active, inactive_count: inactive, departments };
        });

      return NextResponse.json({
        employees,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
        stats,
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['manage_payroll'] }
);

// POST /api/businesses/[id]/employees
export const POST = withBusinessAuth(
  async (request, { businessId, userId, permissions }) => {
    try {
      // Check if user has permission to manage employees
      if (!permissions.includes('manage_payroll')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to manage employees' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const supabase = createClient();

      // Validate required fields
      const requiredFields = ['first_name', 'last_name', 'base_salary', 'start_date'];
      const missingFields = requiredFields.filter(field => !body[field]);

      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Missing required fields: ${missingFields.join(', ')}` },
          { status: 400 }
        );
      }

      // Check for duplicate NIDA number or TIN
      if (body.nida_number) {
        const { data: existingNida } = await supabase
          .from('employees')
          .select('id')
          .eq('nida_number', body.nida_number)
          .eq('business_id', businessId)
          .single();

        if (existingNida) {
          return NextResponse.json(
            { error: 'Employee with this NIDA number already exists' },
            { status: 409 }
          );
        }
      }

      if (body.tin_number) {
        const { data: existingTin } = await supabase
          .from('employees')
          .select('id')
          .eq('tin_number', body.tin_number)
          .eq('business_id', businessId)
          .single();

        if (existingTin) {
          return NextResponse.json(
            { error: 'Employee with this TIN already exists' },
            { status: 409 }
          );
        }
      }

      // Generate employee ID if not provided
      if (!body.employee_id) {
        const employeeCount = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId);

        const count = employeeCount.count || 0;
        body.employee_id = `EMP${String(count + 1).padStart(4, '0')}`;
      }

      // Create employee
      const { data: employee, error } = await supabase
        .from('employees')
        .insert({
          business_id: businessId,
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email,
          phone: body.phone,
          nida_number: body.nida_number,
          tin_number: body.tin_number,
          employee_id: body.employee_id,
          department: body.department,
          position: body.position,
          start_date: body.start_date,
          end_date: body.end_date,
          base_salary: body.base_salary,
          allowances: body.allowances || 0,
          pension_rate: body.pension_rate || 0.10,
          is_active: body.is_active !== false,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({ employee }, { status: 201 });
    } catch (error) {
      console.error('Error creating employee:', error);
      return NextResponse.json(
        { error: 'Failed to create employee' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['manage_payroll'] }
);