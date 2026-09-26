import type { Address } from "@ton/core";
import type { Invoice } from "./invoice.ts";
import type { Network } from "./network.ts";

export function friendlyAddress(address: Address, network: Network): string {
  return address.toString({ urlSafe: true, bounceable: false, testOnly: network === "testnet" });
}

export function transferLink(invoice: Invoice): string {
  return `ton://transfer/${transferPath(invoice)}`;
}

export function tonkeeperLink(invoice: Invoice): string {
  return `https://app.tonkeeper.com/transfer/${transferPath(invoice)}`;
}

function transferPath(invoice: Invoice): string {
  const query = new URLSearchParams({ amount: invoice.amount.toString(), text: invoice.memo });
  if (invoice.asset.kind === "jetton") {
    query.set("jetton", friendlyAddress(invoice.asset.master, invoice.network));
  }
  return `${friendlyAddress(invoice.recipient, invoice.network)}?${query}`;
}
