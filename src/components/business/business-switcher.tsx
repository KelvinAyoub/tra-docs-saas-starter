'use client';

import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Plus, Settings, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface BusinessSwitcherProps {
  className?: string;
  onOpenCreateBusiness?: () => void;
  onOpenManageBusiness?: () => void;
  onOpenTeamManagement?: () => void;
}

export function BusinessSwitcher({
  className,
  onOpenCreateBusiness,
  onOpenManageBusiness,
  onOpenTeamManagement,
}: BusinessSwitcherProps) {
  const { businesses, currentBusiness, isLoading, switchBusiness } = useBusiness();
  const [isOpen, setIsOpen] = useState(false);

  const getBusinessInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  if (isLoading) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn('w-full justify-between', className)}
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>Loading businesses...</span>
        </div>
        <ChevronDown className="h-4 w-4" />
      </Button>
    );
  }

  if (!currentBusiness) {
    return (
      <Button
        variant="outline"
        onClick={onOpenCreateBusiness}
        className={cn('w-full justify-between', className)}
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Create Business</span>
        </div>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-between', className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentBusiness.logo_url} alt={currentBusiness.name} />
              <AvatarFallback className="text-xs">
                {getBusinessInitials(currentBusiness.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{currentBusiness.name}</span>
            <Badge variant={getRoleBadgeVariant(currentBusiness.user_role)} className="text-xs">
              {currentBusiness.user_role}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="start">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentBusiness.logo_url} alt={currentBusiness.name} />
              <AvatarFallback>
                {getBusinessInitials(currentBusiness.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                {currentBusiness.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentBusiness.description || 'No description'}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {businesses.length > 1 && (
          <>
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Switch Business
            </DropdownMenuLabel>
            {businesses
              .filter(business => business.id !== currentBusiness.id)
              .map((business) => (
                <DropdownMenuItem
                  key={business.id}
                  onClick={() => switchBusiness(business.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={business.logo_url} alt={business.name} />
                      <AvatarFallback className="text-xs">
                        {getBusinessInitials(business.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{business.name}</p>
                      <Badge
                        variant={getRoleBadgeVariant(business.user_role)}
                        className="text-xs"
                      >
                        {business.user_role}
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Manage
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() => {
            onOpenManageBusiness?.();
            setIsOpen(false);
          }}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Business Settings</span>
        </DropdownMenuItem>

        {currentBusiness.user_role === 'owner' || currentBusiness.user_role === 'admin' ? (
          <DropdownMenuItem
            onClick={() => {
              onOpenTeamManagement?.();
              setIsOpen(false);
            }}
            className="cursor-pointer"
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Team Members</span>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            onOpenCreateBusiness?.();
            setIsOpen(false);
          }}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Create New Business</span>
          <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}