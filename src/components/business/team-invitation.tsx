'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Mail, Shield, Eye, Edit, Trash2 } from 'lucide-react';
import { BusinessMember } from '@/lib/types/business';
import { toast } from 'sonner';

const invitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'accountant', 'employee']),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

type InvitationFormData = z.infer<typeof invitationSchema>;

interface TeamInvitationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  currentMembers: BusinessMember[];
  onInvite: (email: string, role: string, permissions: string[]) => Promise<void>;
  isInviting?: boolean;
}

const ROLE_PERMISSIONS = {
  admin: [
    { id: 'view_transactions', label: 'View Transactions' },
    { id: 'create_transactions', label: 'Create/Edit Transactions' },
    { id: 'manage_payroll', label: 'Manage Payroll' },
    { id: 'view_reports', label: 'View Reports' },
    { id: 'manage_team', label: 'Manage Team Members' },
    { id: 'business_settings', label: 'Business Settings' },
  ],
  accountant: [
    { id: 'view_transactions', label: 'View Transactions' },
    { id: 'create_transactions', label: 'Create/Edit Transactions' },
    { id: 'manage_payroll', label: 'Manage Payroll' },
    { id: 'view_reports', label: 'View Reports' },
    { id: 'generate_documents', label: 'Generate TRA Documents' },
  ],
  employee: [
    { id: 'view_transactions', label: 'View Transactions' },
    { id: 'view_reports', label: 'View Reports' },
  ],
};

const ROLE_DESCRIPTIONS = {
  admin: 'Full access to all business functions and settings',
  accountant: 'Can manage financial data, payroll, and generate documents',
  employee: 'Can view financial data and reports',
};

export function TeamInvitation({
  open,
  onOpenChange,
  businessId,
  currentMembers,
  onInvite,
  isInviting = false,
}: TeamInvitationProps) {
  const [selectedRole, setSelectedRole] = useState<string>('employee');

  const form = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      role: 'employee',
      permissions: ['view_transactions'],
    },
  });

  const watchedRole = form.watch('role');

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    const defaultPermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
      .map(p => p.id);
    form.setValue('permissions', defaultPermissions);
  };

  const handleSubmit = async (data: InvitationFormData) => {
    try {
      // Check if user is already a member
      const isAlreadyMember = currentMembers.some(
        member => member.user?.email_address?.toLowerCase() === data.email.toLowerCase()
      );

      if (isAlreadyMember) {
        toast.error('This user is already a team member');
        return;
      }

      await onInvite(data.email, data.role, data.permissions);
      form.reset();
      onOpenChange(false);
      toast.success('Invitation sent successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your business team
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role
                  </FormLabel>
                  <Select onValueChange={handleRoleChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {ROLE_DESCRIPTIONS[watchedRole as keyof typeof ROLE_DESCRIPTIONS]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base font-medium">Permissions</FormLabel>
                    <FormDescription className="text-sm">
                      Select what this team member can access
                    </FormDescription>
                  </div>
                  <div className="space-y-3">
                    {ROLE_PERMISSIONS[watchedRole as keyof typeof ROLE_PERMISSIONS].map(
                      (permission) => (
                        <FormField
                          key={permission.id}
                          control={form.control}
                          name="permissions"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={permission.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(permission.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, permission.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== permission.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {permission.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      )
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface TeamMemberCardProps {
  member: BusinessMember;
  canManage: boolean;
  onRemove?: (memberId: string) => void;
}

export function TeamMemberCard({ member, canManage, onRemove }: TeamMemberCardProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'accountant':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPermissionIcon = (permissionId: string) => {
    switch (permissionId) {
      case 'view_transactions':
        return <Eye className="h-3 w-3" />;
      case 'create_transactions':
        return <Edit className="h-3 w-3" />;
      case 'manage_team':
        return <UserPlus className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              {member.user?.profile_image_url ? (
                <img
                  src={member.user.profile_image_url}
                  alt={member.user.first_name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">
                  {member.user?.first_name?.charAt(0) ||
                    member.user?.email_address?.charAt(0) ||
                    'U'}
                </span>
              )}
            </div>
            <div>
              <CardTitle className="text-sm">
                {member.user?.first_name && member.user?.last_name
                  ? `${member.user.first_name} ${member.user.last_name}`
                  : member.user?.email_address || 'Unknown User'}
              </CardTitle>
              <CardDescription className="text-xs">
                {member.user?.email_address}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
              {member.role}
            </Badge>
            {canManage && member.role !== 'owner' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove?.(member.id)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {member.permissions.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {member.permissions.slice(0, 3).map((permission) => (
              <Badge key={permission} variant="outline" className="text-xs">
                {getPermissionIcon(permission)}
                <span className="ml-1">
                  {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </Badge>
            ))}
            {member.permissions.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{member.permissions.length - 3} more
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}