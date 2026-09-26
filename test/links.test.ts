import { describe, expect, test } from "bun:test";
import { TON, USDT } from "../src/asset.ts";
import { createInvoice } from "../src/invoice.ts";
import { friendlyAddress, tonkeeperLink, transferLink } from "../src/links.ts";
import { merchant, merchantUsdtWallet } from "./fixtures.ts";

describe("payment links", () => {
  test("use the non-bounceable address so payments reach an undeployed wallet", () => {
    expect(friendlyAddress(merchant, "mainnet")).toStartWith("UQ");
    expect(friendlyAddress(merchant, "testnet")).toStartWith("0Q");
  });

  test("carry the amount and memo", () => {
    const invoice = createInvoice({ network: "mainnet", recipient: merchant, asset: TON, amount: 25_000_000_000n });
    const url = new URL(transferLink(invoice));
    expect(url.protocol).toBe("ton:");
    expect(url.searchParams.get("amount")).toBe("25000000000");
    expect(url.searchParams.get("text")).toBe(invoice.memo);
    expect(url.searchParams.has("jetton")).toBe(false);
  });

  test("name the jetton master for jetton invoices", () => {
    const invoice = createInvoice({
      network: "mainnet",
      recipient: merchant,
      asset: { kind: "jetton", ...USDT, recipientWallet: merchantUsdtWallet },
      amount: 37_000_000n,
    });
    const url = new URL(tonkeeperLink(invoice));
    expect(url.pathname).toBe(`/transfer/${friendlyAddress(merchant, "mainnet")}`);
    expect(url.searchParams.get("jetton")).toBe(friendlyAddress(USDT.master, "mainnet"));
  });
});
