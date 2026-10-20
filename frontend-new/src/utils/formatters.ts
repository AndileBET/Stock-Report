export function formatNumber(value: number) { return new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 2 }).format(value ?? 0); }
export function formatCurrency(value: number) { return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(value ?? 0); }
export function formatPercent(value: number) { return `${new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 1 }).format(value ?? 0)}%`; }
