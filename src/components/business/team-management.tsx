'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TeamInvitation, TeamMemberCard } from './team-invitation';
import { BusinessMember, BusinessInvitation } from '@/lib/types/business';
import { BusinessService } from '@/lib/services/business';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Calendar,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamManagementProps {
  businessId: string;
  userRole: string;
}

export function TeamManagement({ businessId, userRole }: TeamManagementProps) {
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<BusinessInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const canManageTeam = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    fetchTeamData();
  }, [businessId]);

  const fetchTeamData = async () => {
    try {
      setIsLoading(true);
      const [membersData, invitationsData] = await Promise.all([
        BusinessService.getBusinessMembers(businessId, 'placeholder-user-id'),
        BusinessService.getPendingInvitations('placeholder-user-id'),
      ]);

      setMembers(membersData);
      setPendingInvitations(invitationsData);
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (email: string, role: string, permissions: string[]) => {
    try {
      setIsInviting(true);
      await BusinessService.inviteTeamMember(
        businessId,
        email,
        role as any,
        permissions,
        'placeholder-user-id'
      );
      await fetchTeamData();
    } catch (error: any) {
      throw error;
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await BusinessService.removeTeamMember(businessId, memberId, 'placeholder-user-id');
      setMembers(members.filter(m => m.id !== memberId));
      toast.success('Team member removed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove team member');
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await BusinessService.acceptInvitation(invitationId, 'placeholder-user-id');
      await fetchTeamData();
      toast.success('Invitation accepted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept invitation');
    }
  };

  const filteredMembers = members.filter(member =>
    member.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user?.email_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInvitationStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getRoleStats = () => {
    const stats = members.reduce(
      (acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(stats).map(([role, count]) => ({
      role,
      count,
      color: role === 'owner' ? 'bg-blue-100 text-blue-800' :
             role === 'admin' ? 'bg-purple-100 text-purple-800' :
             role === 'accountant' ? 'bg-green-100 text-green-800' :
             'bg-gray-100 text-gray-800'
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Team Management</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">
            Manage your business team and permissions
          </p>
        </div>
        {canManageTeam && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {getRoleStats().map(({ role, count, color }) => (
          <Card key={role}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground capitalize">
                    {role}s
                  </p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Invites
                </p>
                <p className="text-2xl font-bold">{pendingInvitations.length}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitations ({pendingInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {filteredMembers.length} of {members.length}
            </Badge>
          </div>

          {filteredMembers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No team members found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'No members match your search criteria.'
                    : "You haven't added any team members yet."}
                </p>
                {canManageTeam && !searchQuery && (
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite First Member
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  canManage={canManageTeam}
                  onRemove={handleRemoveMember}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          {pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending invitations</h3>
                <p className="text-muted-foreground mb-4">
                  {canManageTeam
                    ? "You haven't sent any invitations yet."
                    : "You don't have any pending invitations."}
                </p>
                {canManageTeam && (
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send First Invitation
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{invitation.invited_email}</h4>
                          <p className="text-sm text-muted-foreground">
                            Invited to join {invitation.business?.name} as {invitation.role}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(invitation.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              {getInvitationStatusIcon(invitation.status)}
                              <span className="capitalize">{invitation.status}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {invitation.role}
                        </Badge>
                        {invitation.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                          >
                            Accept
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {canManageTeam && (
        <TeamInvitation
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          businessId={businessId}
          currentMembers={members}
          onInvite={handleInvite}
          isInviting={isInviting}
        />
      )}
    </div>
  );
}