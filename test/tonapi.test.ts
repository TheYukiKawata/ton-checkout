import { describe, expect, test } from "bun:test";
import { TonApi, TonApiError } from "../src/tonapi.ts";
import { event, merchant, merchantUsdtWallet, page, tonTransfer, usdtMaster } from "./fixtures.ts";

function fakeFetch(responses: Record<string, unknown>, seen: string[] = []): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    seen.push(url.pathname + url.search);
    const beforeLt = url.searchParams.get("before_lt") ?? "first";
    const body = responses[url.pathname.includes("/events") ? beforeLt : url.pathname];
    if (body === undefined) return new Response("not found", { status: 404 });
    return Response.json(body);
  }) as typeof fetch;
}

describe("TonApi.transfersSince", () => {
  test("follows pages until it reaches the start date", async () => {
    const seen: string[] = [];
    const tonapi = new TonApi({
      network: "mainnet",
      fetch: fakeFetch(
        {
          first: page([event({ id: "a", timestamp: 500 }, tonTransfer(1, "X"))], 10),
          "10": page([event({ id: "b", timestamp: 90 }, tonTransfer(2, "Y"))], 5),
        },
        seen,
      ),
    });
    const transfers = await tonapi.transfersSince(merchant, 100);
    expect(transfers.map((transfer) => transfer.eventId)).toEqual(["a", "b"]);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toContain("start_date=100");
  });

  test("keeps one copy of an event seen on two pages", async () => {
    const repeated = event({ id: "a", timestamp: 500 }, tonTransfer(1, "X"));
    const tonapi = new TonApi({
      network: "mainnet",
      fetch: fakeFetch({ first: page([repeated], 10), "10": page([repeated]) }),
    });
    expect(await tonapi.transfersSince(merchant, 100)).toHaveLength(1);
  });

  test("throws TonApiError on HTTP errors", async () => {
    const tonapi = new TonApi({ network: "mainnet", fetch: fakeFetch({}) });
    expect(tonapi.transfersSince(merchant, 0)).rejects.toBeInstanceOf(TonApiError);
  });
});

describe("TonApi.jettonWallet", () => {
  test("reads the wallet from the master's get_wallet_address method", async () => {
    const path = `/v2/blockchain/accounts/${usdtMaster.toRawString()}/methods/get_wallet_address`;
    const tonapi = new TonApi({
      network: "mainnet",
      fetch: fakeFetch({ [path]: { decoded: { jetton_wallet_address: merchantUsdtWallet.toRawString() } } }),
    });
    expect((await tonapi.jettonWallet(usdtMaster, merchant)).equals(merchantUsdtWallet)).toBe(true);
  });
});
