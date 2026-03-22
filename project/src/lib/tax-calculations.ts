export interface TaxBreakdown {
  subtotal: number;
  salesTax: number;
  surtax: number;
  lodgingTax: number;
  taxTotal: number;
  grandTotal: number;
}

export function calculateJetSkiTaxes(subtotal: number): TaxBreakdown {
  const salesTaxRate = 0.065;
  const surtaxRate = 0.005;

  const salesTax = subtotal * salesTaxRate;
  const surtax = subtotal * surtaxRate;
  const taxTotal = salesTax + surtax;
  const grandTotal = subtotal + taxTotal;

  return {
    subtotal,
    salesTax,
    surtax,
    lodgingTax: 0,
    taxTotal,
    grandTotal,
  };
}

export function calculateRentalTaxes(subtotal: number): TaxBreakdown {
  const salesTaxRate = 0.065;
  const lodgingTaxRate = 0.05;

  const salesTax = subtotal * salesTaxRate;
  const lodgingTax = subtotal * lodgingTaxRate;
  const taxTotal = salesTax + lodgingTax;
  const grandTotal = subtotal + taxTotal;

  return {
    subtotal,
    salesTax,
    surtax: 0,
    lodgingTax,
    taxTotal,
    grandTotal,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
