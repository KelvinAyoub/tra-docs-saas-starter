import { NextRequest, NextResponse } from 'next/server';
import { withBusinessAuth } from '@/lib/middleware/business-access';
import { createClient } from '@/lib/supabase';

// GET /api/businesses/[id]/transactions
export const GET = withBusinessAuth(
  async (request, { businessId, userId, permissions }) => {
    try {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);

      // Parse query parameters
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const type = searchParams.get('type');
      const category = searchParams.get('category');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const offset = (page - 1) * limit;

      // Check if user has permission to view transactions
      if (!permissions.includes('view_transactions')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to view transactions' },
          { status: 403 }
        );
      }

      // Build query
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (type) {
        query = query.eq('type', type);
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data: transactions, error, count } = await query;

      if (error) {
        throw error;
      }

      // Get summary statistics
      const { data: summary } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('business_id', businessId)
        .then(({ data }) => {
          const income = data?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          const expenses = data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          return { total_income: income, total_expenses: expenses, net_amount: income - expenses };
        });

      return NextResponse.json({
        transactions,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
        summary,
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['view_transactions'] }
);

// POST /api/businesses/[id]/transactions
export const POST = withBusinessAuth(
  async (request, { businessId, userId, permissions }) => {
    try {
      // Check if user has permission to create transactions
      if (!permissions.includes('create_transactions')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create transactions' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const supabase = createClient();

      // Validate required fields
      const requiredFields = ['type', 'category', 'amount', 'date'];
      const missingFields = requiredFields.filter(field => !body[field]);

      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Missing required fields: ${missingFields.join(', ')}` },
          { status: 400 }
        );
      }

      // Create transaction
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          business_id: businessId,
          type: body.type,
          category: body.category,
          description: body.description,
          amount: body.amount,
          date: body.date,
          reference_number: body.reference_number,
          supplier_customer: body.supplier_customer,
          vat_amount: body.vat_amount || 0,
          vat_inclusive: body.vat_inclusive || false,
          attachment_urls: body.attachment_urls || [],
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({ transaction }, { status: 201 });
    } catch (error) {
      console.error('Error creating transaction:', error);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['create_transactions'] }
);