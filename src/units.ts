const decimalAmount = /^(\d+)(?:\.(\d+))?$/;

export function parseUnits(value: string, decimals: number): bigint {
  const match = decimalAmount.exec(value.trim());
  if (!match) throw new Error(`Not a positive decimal amount: "${value}"`);
  const whole = match[1] ?? "0";
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) throw new Error(`"${value}" has more than ${decimals} decimal places`);
  return BigInt(whole + fraction.padEnd(decimals, "0"));
}

export function formatUnits(units: bigint, decimals: number): string {
  if (decimals === 0) return units.toString();
  const digits = units.toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, -decimals);
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
