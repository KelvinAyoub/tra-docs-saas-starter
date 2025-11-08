'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { BusinessWithRole } from '@/lib/types/business';
import { BusinessService } from '@/lib/services/business';

interface BusinessContextType {
  businesses: BusinessWithRole[];
  currentBusiness: BusinessWithRole | null;
  isLoading: boolean;
  switchBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
  addBusiness: (business: BusinessWithRole) => void;
  updateBusiness: (business: BusinessWithRole) => void;
  removeBusiness: (businessId: string) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<BusinessWithRole[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<BusinessWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBusinesses = async () => {
    try {
      setIsLoading(true);
      const userBusinesses = await BusinessService.getUserBusinesses(
        'placeholder-user-id' // This would come from Clerk auth
      );
      setBusinesses(userBusinesses);

      // Set current business if not already set
      if (!currentBusiness && userBusinesses.length > 0) {
        const storedBusinessId = localStorage.getItem('currentBusinessId');
        const businessToSet = storedBusinessId
          ? userBusinesses.find(b => b.id === storedBusinessId)
          : userBusinesses[0];

        setCurrentBusiness(businessToSet || userBusinesses[0]);

        if (businessToSet) {
          localStorage.setItem('currentBusinessId', businessToSet.id);
        }
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchBusiness = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);
      localStorage.setItem('currentBusinessId', businessId);
    }
  };

  const refreshBusinesses = async () => {
    await fetchBusinesses();
  };

  const addBusiness = (business: BusinessWithRole) => {
    setBusinesses(prev => [...prev, business]);
    if (!currentBusiness) {
      setCurrentBusiness(business);
      localStorage.setItem('currentBusinessId', business.id);
    }
  };

  const updateBusiness = (updatedBusiness: BusinessWithRole) => {
    setBusinesses(prev =>
      prev.map(b => b.id === updatedBusiness.id ? updatedBusiness : b)
    );
    if (currentBusiness?.id === updatedBusiness.id) {
      setCurrentBusiness(updatedBusiness);
    }
  };

  const removeBusiness = (businessId: string) => {
    setBusinesses(prev => prev.filter(b => b.id !== businessId));
    if (currentBusiness?.id === businessId) {
      const nextBusiness = businesses.find(b => b.id !== businessId);
      setCurrentBusiness(nextBusiness || null);
      if (nextBusiness) {
        localStorage.setItem('currentBusinessId', nextBusiness.id);
      } else {
        localStorage.removeItem('currentBusinessId');
      }
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const value = {
    businesses,
    currentBusiness,
    isLoading,
    switchBusiness,
    refreshBusinesses,
    addBusiness,
    updateBusiness,
    removeBusiness,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}