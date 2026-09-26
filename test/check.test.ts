import { describe, expect, test } from "bun:test";
import { TON } from "../src/asset.ts";
import { checkInvoice } from "../src/check.ts";
import { createInvoice } from "../src/invoice.ts";
import { TonApi } from "../src/tonapi.ts";
import { buyer, event, merchant, page, tonTransfer } from "./fixtures.ts";

function transaction(options: { bouncePhase?: string; bounced?: boolean } = {}) {
  return {
    hash: "tx",
    transaction_type: "TransOrd",
    ...(options.bouncePhase ? { bounce_phase: options.bouncePhase } : {}),
    in_msg: {
      bounced: options.bounced ?? false,
      source: { address: buyer.toRawString() },
      destination: { address: merchant.toRawString() },
    },
  };
}

function tonapiWith(events: object, receiverTransaction: object) {
  const fetch = (async (input: Parameters<typeof globalThis.fetch>[0]) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/events")) return Response.json(events);
    if (url.pathname.startsWith("/v2/blockchain/transactions/")) return Response.json(receiverTransaction);
    return new Response("not found", { status: 404 });
  }) as typeof globalThis.fetch;
  return new TonApi({ network: "mainnet", fetch });
}

describe("checkInvoice", () => {
  const invoice = createInvoice({ network: "mainnet", recipient: merchant, asset: TON, amount: 25_000_000_000n });
  const paidEvents = page([event({ id: "a", timestamp: invoice.createdAt + 5 }, tonTransfer(25_000_000_000, invoice.memo))]);

  test("counts a TON payment the merchant kept", async () => {
    expect((await checkInvoice(tonapiWith(paidEvents, transaction()), invoice)).kind).toBe("paid");
  });

  test("ignores a TON payment that bounced back to the sender", async () => {
    const bounced = transaction({ bouncePhase: "TrPhaseBounceOk" });
    expect((await checkInvoice(tonapiWith(paidEvents, bounced), invoice)).kind).toBe("unpaid");
  });

  test("ignores a bounce message coming back to the merchant", async () => {
    const bounceMessage = transaction({ bounced: true });
    expect((await checkInvoice(tonapiWith(paidEvents, bounceMessage), invoice)).kind).toBe("unpaid");
  });
});
