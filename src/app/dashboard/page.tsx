'use client';

import { useState, useEffect } from 'react';
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext';
import { BusinessSwitcher } from '@/components/business/business-switcher';
import { BusinessForm } from '@/components/business/business-form';
import { TeamManagement } from '@/components/business/team-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  Settings,
  Plus,
  CreditCard,
  BarChart3,
  DollarSign,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { SubscriptionService } from '@/lib/services/subscription';
import { UserSubscription } from '@/lib/types/business';

function DashboardContent() {
  const { currentBusiness, businesses, isLoading, refreshBusinesses, addBusiness } = useBusiness();
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  useEffect(() => {
    if (currentBusiness) {
      fetchSubscription();
    }
  }, [currentBusiness]);

  const fetchSubscription = async () => {
    try {
      setIsLoadingSubscription(true);
      const userSubscription = await SubscriptionService.getUserSubscription(
        'placeholder-user-id' // This would come from Clerk auth
      );
      setSubscription(userSubscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const handleCreateBusiness = async (data: any) => {
    try {
      const newBusiness = await (await import('@/lib/services/business')).BusinessService.createBusiness(
        data,
        'placeholder-user-id'
      );
      addBusiness(newBusiness);
      setShowCreateBusiness(false);
    } catch (error: any) {
      throw error;
    }
  };

  const getSubscriptionProgress = () => {
    if (!subscription) return 0;
    return Math.round((subscription.current_business_count / subscription.max_businesses) * 100);
  };

  const getSubscriptionColor = () => {
    if (!subscription) return 'bg-gray-500';
    if (subscription.plan_type === 'basic') return 'bg-blue-500';
    if (subscription.plan_type === 'premium') return 'bg-purple-500';
    if (subscription.plan_type === 'enterprise') return 'bg-green-500';
    return 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Welcome to TRA Compliance Hub</h1>
            <p className="text-muted-foreground text-lg mb-6">
              Manage your business compliance with Tanzanian tax regulations
            </p>
            <Button size="lg" onClick={() => setShowCreateBusiness(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Business
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <CardTitle>Document Generation</CardTitle>
                <CardDescription>
                  Generate TRA-compliant tax returns, VAT forms, and certificates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <CardTitle>Financial Management</CardTitle>
                <CardDescription>
                  Track income, expenses, and manage payroll with AI assistance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>
                  Work with accountants and team members on compliance tasks
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        <BusinessForm
          open={showCreateBusiness}
          onOpenChange={setShowCreateBusiness}
          onSubmit={handleCreateBusiness}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">TRA Compliance Hub</h1>
              <BusinessSwitcher
                className="w-80"
                onOpenCreateBusiness={() => setShowCreateBusiness(true)}
                onOpenManageBusiness={() => {}}
                onOpenTeamManagement={() => setShowTeamManagement(true)}
              />
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                {subscription?.plan_type || 'Basic'} Plan
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Business Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Businesses</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{businesses.length}</div>
              <p className="text-xs text-muted-foreground">
                {subscription ? `${subscription.current_business_count}/${subscription.max_businesses} businesses` : 'Basic plan'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Across all businesses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents Generated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">
                Excellent standing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Usage */}
        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Subscription Usage
                  </CardTitle>
                  <CardDescription>
                    Your current plan and usage statistics
                  </CardDescription>
                </div>
                <Badge variant="outline" className="capitalize">
                  {subscription.plan_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Business Usage</span>
                    <span className="text-sm text-muted-foreground">
                      {subscription.current_business_count} / {subscription.max_businesses} businesses
                    </span>
                  </div>
                  <Progress
                    value={getSubscriptionProgress()}
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">Monthly Revenue</p>
                    <p className="text-2xl font-bold">TZS 2.4M</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Receipt className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">Tax Documents</p>
                    <p className="text-2xl font-bold">156</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <UserCheck className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">Compliance Status</p>
                    <p className="text-2xl font-bold text-green-600">Active</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>
                    Latest income and expense entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Office Rent</p>
                        <p className="text-sm text-muted-foreground">Expense • Dec 1, 2024</p>
                      </div>
                      <span className="text-red-600 font-medium">-TZS 500,000</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Client Payment</p>
                        <p className="text-sm text-muted-foreground">Income • Nov 30, 2024</p>
                      </div>
                      <span className="text-green-600 font-medium">+TZS 1,200,000</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Utilities</p>
                        <p className="text-sm text-muted-foreground">Expense • Nov 28, 2024</p>
                      </div>
                      <span className="text-red-600 font-medium">-TZS 85,000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Deadlines</CardTitle>
                  <CardDescription>
                    Important TRA compliance dates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div>
                        <p className="font-medium">VAT Return - November 2024</p>
                        <p className="text-sm text-muted-foreground">Due in 5 days</p>
                      </div>
                      <Badge variant="outline" className="text-yellow-600">
                        Due Soon
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">PAYE Monthly Filing</p>
                        <p className="text-sm text-muted-foreground">Due in 12 days</p>
                      </div>
                      <Badge variant="outline">Upcoming</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Skills Development Levy</p>
                        <p className="text-sm text-muted-foreground">Due in 18 days</p>
                      </div>
                      <Badge variant="outline">Upcoming</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Management</CardTitle>
                <CardDescription>
                  Manage your business income and expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Transaction management interface will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle>Employee Management</CardTitle>
                <CardDescription>
                  Manage your team and payroll
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Employee management interface will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Document Generation</CardTitle>
                <CardDescription>
                  Generate TRA-compliant documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Document generation interface will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>
                  View detailed financial analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Reports interface will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Business Settings</CardTitle>
                <CardDescription>
                  Configure your business information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Business settings interface will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <BusinessForm
        open={showCreateBusiness}
        onOpenChange={setShowCreateBusiness}
        onSubmit={handleCreateBusiness}
      />

      <Dialog open={showTeamManagement} onOpenChange={setShowTeamManagement}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Management</DialogTitle>
            <DialogDescription>
              Manage your business team members and permissions
            </DialogDescription>
          </DialogHeader>
          <TeamManagement
            businessId={currentBusiness.id}
            userRole={currentBusiness.user_role}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <BusinessProvider>
      <DashboardContent />
    </BusinessProvider>
  );
}