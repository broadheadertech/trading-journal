'use client';

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useProfile } from '@/hooks/useStore';
import { formatCurrency as rawFormatCurrency, formatPrice as rawFormatPrice } from '@/lib/utils';
import { fetchExchangeRates, getRate } from '@/lib/exchange-rates';

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => void;
  formatCurrency: (value: number) => string;
  formatPrice: (value: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  formatCurrency: (v) => rawFormatCurrency(v, 'USD'),
  formatPrice: (v) => rawFormatPrice(v, 'USD'),
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { currency, setCurrency } = useProfile();
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });

  useEffect(() => {
    fetchExchangeRates().then(setRates);
  }, []);

  // Re-fetch when currency changes (in case rates were stale/fallback)
  useEffect(() => {
    if (currency !== 'USD') {
      fetchExchangeRates().then(setRates);
    }
  }, [currency]);

  const formatCurrency = useCallback(
    (value: number) => {
      const converted = value * getRate(rates, currency);
      return rawFormatCurrency(converted, currency);
    },
    [currency, rates]
  );

  const formatPrice = useCallback(
    (value: number) => {
      const converted = value * getRate(rates, currency);
      return rawFormatPrice(converted, currency);
    },
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}
