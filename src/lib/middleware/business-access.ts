import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';

interface BusinessAccessOptions {
  requiredPermissions?: string[];
  allowedRoles?: string[];
  checkBusinessExists?: boolean;
}

/**
 * Middleware to validate business access for API routes
 * Ensures users can only access data from businesses they are members of
 */
export async function withBusinessAccess(
  request: NextRequest,
  options: BusinessAccessOptions = {}
): Promise<{
  success: boolean;
  userId?: string;
  businessId?: string;
  userRole?: string;
  permissions?: string[];
  error?: string;
  response?: NextResponse;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized',
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      };
    }

    // Extract business ID from request
    const businessId = extractBusinessId(request);

    if (!businessId) {
      return {
        success: false,
        error: 'Business ID is required',
        response: NextResponse.json(
          { error: 'Business ID is required' },
          { status: 400 }
        )
      };
    }

    // Validate user's access to the business
    const accessValidation = await validateBusinessAccess(
      businessId,
      userId,
      options
    );

    if (!accessValidation.isValid) {
      return {
        success: false,
        error: accessValidation.error || 'Access denied',
        response: NextResponse.json(
          { error: accessValidation.error || 'Access denied' },
          { status: 403 }
        )
      };
    }

    return {
      success: true,
      userId,
      businessId,
      userRole: accessValidation.userRole,
      permissions: accessValidation.permissions,
    };
  } catch (error) {
    console.error('Business access validation error:', error);
    return {
      success: false,
      error: 'Internal server error',
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Higher-order function to wrap API route handlers with business access validation
 */
export function withBusinessAuth<T extends any[]>(
  handler: (
    request: NextRequest,
    context: {
      userId: string;
      businessId: string;
      userRole: string;
      permissions: string[];
    },
    ...args: T
  ) => Promise<NextResponse>,
  options: BusinessAccessOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const accessResult = await withBusinessAccess(request, options);

    if (!accessResult.success) {
      return accessResult.response!;
    }

    return handler(
      request,
      {
        userId: accessResult.userId!,
        businessId: accessResult.businessId!,
        userRole: accessResult.userRole!,
        permissions: accessResult.permissions!,
      },
      ...args
    );
  };
}

/**
 * Extract business ID from various request sources
 */
function extractBusinessId(request: NextRequest): string | null {
  const url = new URL(request.url);

  // Try to get business_id from query parameters
  let businessId = url.searchParams.get('business_id');

  if (businessId) {
    return businessId;
  }

  // Try to get businessId from query parameters (alternative naming)
  businessId = url.searchParams.get('businessId');
  if (businessId) {
    return businessId;
  }

  // Try to extract from URL path (e.g., /api/businesses/[id]/transactions)
  const pathSegments = url.pathname.split('/');
  const businessesIndex = pathSegments.indexOf('businesses');

  if (businessesIndex !== -1 && businessesIndex + 1 < pathSegments.length) {
    return pathSegments[businessesIndex + 1];
  }

  // Try to get from request body for POST/PUT requests
  // Note: This would require parsing the body, which we'll handle in specific routes

  return null;
}

/**
 * Validate user's access to a specific business
 */
async function validateBusinessAccess(
  businessId: string,
  userId: string,
  options: BusinessAccessOptions
): Promise<{
  isValid: boolean;
  userRole?: string;
  permissions?: string[];
  error?: string;
}> {
  const supabase = createClient();

  try {
    // Call the validation function
    const { data, error } = await supabase.rpc('validate_business_context', {
      p_business_id: businessId,
      p_user_id: userId
    });

    if (error) {
      console.error('Business validation error:', error);
      return {
        isValid: false,
        error: 'Failed to validate business access'
      };
    }

    if (!data || data.length === 0) {
      return {
        isValid: false,
        error: 'Business not found or access denied'
      };
    }

    const validation = data[0];

    if (!validation.is_valid) {
      return {
        isValid: false,
        error: 'You do not have access to this business'
      };
    }

    // Check role-based access
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!options.allowedRoles.includes(validation.user_role)) {
        return {
          isValid: false,
          error: 'Insufficient role permissions'
        };
      }
    }

    // Check permission-based access
    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasAllPermissions = options.requiredPermissions.every(
        permission => validation.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return {
          isValid: false,
          error: 'Insufficient permissions'
        };
      }
    }

    return {
      isValid: true,
      userRole: validation.user_role,
      permissions: validation.permissions,
    };
  } catch (error) {
    console.error('Error validating business access:', error);
    return {
      isValid: false,
      error: 'Failed to validate business access'
    };
  }
}

/**
 * Extract business ID from request body for POST/PUT requests
 */
export async function extractBusinessIdFromBody(request: NextRequest): Promise<string | null> {
  try {
    const contentType = request.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return null;
    }

    const body = await request.json();

    // Try various field names
    return body.business_id || body.businessId || body.business_id;
  } catch (error) {
    return null;
  }
}

/**
 * Create business context for database queries
 */
export function createBusinessContext(businessId: string, userId: string) {
  return {
    business_id: businessId,
    user_id: userId,
    created_at: new Date().toISOString(),
  };
}

/**
 * Check if user can perform a specific action on a business resource
 */
export async function canPerformAction(
  businessId: string,
  userId: string,
  requiredPermission: string
): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('check_business_permission', {
      p_business_id: businessId,
      p_user_id: userId,
      p_required_permission: requiredPermission
    });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

/**
 * Get user's businesses for filtering
 */
export async function getUserBusinesses(userId: string): Promise<string[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('get_accessible_businesses', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error getting user businesses:', error);
      return [];
    }

    return data?.map((business: any) => business.business_id) || [];
  } catch (error) {
    console.error('Error getting user businesses:', error);
    return [];
  }
}

/**
 * Middleware to add business context to request headers
 */
export function addBusinessContextToHeaders(
  request: NextRequest,
  businessId: string,
  userRole: string,
  permissions: string[]
): NextRequest {
  // Create a new request with additional headers
  const headers = new Headers(request.headers);
  headers.set('x-business-id', businessId);
  headers.set('x-user-role', userRole);
  headers.set('x-user-permissions', JSON.stringify(permissions));

  // Create a new request object with the modified headers
  const newRequest = new NextRequest(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: 'half',
  } as any);

  return newRequest;
}

/**
 * Extract business context from request headers
 */
export function extractBusinessContextFromHeaders(
  request: NextRequest
): {
  businessId?: string;
  userRole?: string;
  permissions?: string[];
} {
  const businessId = request.headers.get('x-business-id');
  const userRole = request.headers.get('x-user-role');
  const permissionsHeader = request.headers.get('x-user-permissions');

  let permissions: string[] = [];
  if (permissionsHeader) {
    try {
      permissions = JSON.parse(permissionsHeader);
    } catch (error) {
      console.error('Error parsing permissions header:', error);
    }
  }

  return {
    businessId: businessId || undefined,
    userRole: userRole || undefined,
    permissions,
  };
}