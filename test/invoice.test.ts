import { describe, expect, test } from "bun:test";
import { TON, USDT } from "../src/asset.ts";
import { createInvoice, invoiceFromJson, invoiceToJson } from "../src/invoice.ts";
import { merchant, merchantUsdtWallet } from "./fixtures.ts";

describe("createInvoice", () => {
  test("gives each invoice a distinct 10-character memo", () => {
    const memos = new Set(
      Array.from({ length: 1000 }, () => createInvoice({ network: "mainnet", recipient: merchant, asset: TON, amount: 1n }).memo),
    );
    expect(memos.size).toBe(1000);
    for (const memo of memos) expect(memo).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
  });

  test("rejects zero amounts", () => {
    expect(() => createInvoice({ network: "mainnet", recipient: merchant, asset: TON, amount: 0n })).toThrow();
  });
});

describe("invoice JSON", () => {
  test("round-trips a jetton invoice", () => {
    const invoice = createInvoice({
      network: "testnet",
      recipient: merchant,
      asset: { kind: "jetton", ...USDT, recipientWallet: merchantUsdtWallet },
      amount: 37_000_000n,
    });
    const restored = invoiceFromJson(JSON.parse(JSON.stringify(invoiceToJson(invoice))));
    expect(restored.amount).toBe(invoice.amount);
    expect(restored.memo).toBe(invoice.memo);
    expect(restored.recipient.equals(merchant)).toBe(true);
    expect(restored.asset.kind === "jetton" && restored.asset.recipientWallet.equals(merchantUsdtWallet)).toBe(true);
  });
});
