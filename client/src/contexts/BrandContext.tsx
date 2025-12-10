/**
 * Brand Context - White-label app customization (Dec 2025)
 *
 * Fetches brand settings from /api/brand on app load
 * Makes app name available globally without requiring auth
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BrandSettings {
  appName: string;
}

interface BrandContextType {
  appName: string;
  loading: boolean;
  refetch: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const DEFAULT_APP_NAME = 'Streamline';

export function BrandProvider({ children }: { children: ReactNode }) {
  const [appName, setAppName] = useState<string>(DEFAULT_APP_NAME);
  const [loading, setLoading] = useState(true);

  const fetchBrandSettings = async () => {
    try {
      const response = await fetch('/api/brand');
      if (response.ok) {
        const data: BrandSettings = await response.json();
        setAppName(data.appName || DEFAULT_APP_NAME);
      }
    } catch (error) {
      console.error('[BrandContext] Failed to fetch brand settings:', error);
      // Keep default app name on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandSettings();
  }, []);

  const refetch = async () => {
    setLoading(true);
    await fetchBrandSettings();
  };

  const value = {
    appName,
    loading,
    refetch,
  };

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
