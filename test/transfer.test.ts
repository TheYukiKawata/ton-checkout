import { describe, expect, test } from "bun:test";
import { parseEventsPage } from "../src/transfer.ts";
import { buyer, event, jettonTransfer, merchant, merchantUsdtWallet, page, tonTransfer, usdtMaster } from "./fixtures.ts";

describe("parseEventsPage", () => {
  test("reads TON transfers", () => {
    const { transfers } = parseEventsPage(page([event({ id: "a" }, tonTransfer(2_000_000_000, "MEMO"))]));
    expect(transfers).toHaveLength(1);
    const [transfer] = transfers;
    expect(transfer?.amount).toBe(2_000_000_000n);
    expect(transfer?.comment).toBe("MEMO");
    expect(transfer?.asset).toEqual({ kind: "ton", receiverTransaction: "tx-MEMO-2000000000" });
    expect(transfer?.sender?.equals(buyer)).toBe(true);
    expect(transfer?.recipient.equals(merchant)).toBe(true);
  });

  test("reads jetton transfers with the recipient's jetton wallet", () => {
    const { transfers } = parseEventsPage(page([event({ id: "a" }, jettonTransfer("37000000", "MEMO"))]));
    const [transfer] = transfers;
    expect(transfer?.amount).toBe(37_000_000n);
    const asset = transfer?.asset;
    expect(asset?.kind).toBe("jetton");
    if (asset?.kind !== "jetton") return;
    expect(asset.master.equals(usdtMaster)).toBe(true);
    expect(asset.recipientWallet.equals(merchantUsdtWallet)).toBe(true);
  });

  test("skips events still in progress and failed actions", () => {
    const { transfers } = parseEventsPage(
      page([
        event({ id: "a", inProgress: true }, tonTransfer(1, "MEMO")),
        event({ id: "b" }, tonTransfer(1, "MEMO", "failed")),
      ]),
    );
    expect(transfers).toHaveLength(0);
  });

  test("skips other action types and jetton burns", () => {
    const burn = jettonTransfer("1", "MEMO");
    const { recipient: _, ...burnBody } = burn.JettonTransfer;
    const { transfers } = parseEventsPage(
      page([event({ id: "a" }, { type: "NftItemTransfer", status: "ok" }, { ...burn, JettonTransfer: burnBody })]),
    );
    expect(transfers).toHaveLength(0);
  });

  test("reads jetton mints without a sender", () => {
    const mint = jettonTransfer("5", "MEMO");
    const { sender: _, ...mintBody } = mint.JettonTransfer;
    const { transfers } = parseEventsPage(page([event({ id: "a" }, { ...mint, JettonTransfer: mintBody })]));
    expect(transfers[0]?.sender).toBeNull();
  });

  test("reports the oldest event and the next page cursor", () => {
    const result = parseEventsPage(
      page([event({ id: "a", timestamp: 300 }), event({ id: "b", timestamp: 100 })], 42),
    );
    expect(result.oldestTimestamp).toBe(100);
    expect(result.nextBeforeLt).toBe(42n);
    expect(parseEventsPage(page([])).nextBeforeLt).toBeNull();
  });

  test("rejects responses in an unknown shape", () => {
    expect(() => parseEventsPage({ error: "rate limit" })).toThrow();
    expect(() => parseEventsPage(page([{ event_id: "a" }]))).toThrow();
  });
});
