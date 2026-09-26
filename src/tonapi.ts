import { Address } from "@ton/core";
import type { Jetton, JettonAsset } from "./asset.ts";
import { asBoolean, asObject, asString } from "./json.ts";
import { tonapiBaseUrl, type Network } from "./network.ts";
import { parseEventsPage, type Transfer } from "./transfer.ts";

export type TonApiOptions = {
  network: Network;
  apiKey?: string | undefined;
  fetch?: typeof fetch;
};

export class TonApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    body: string,
  ) {
    super(`TonAPI ${path} answered ${status}: ${body.slice(0, 200)}`);
  }
}

const eventsPageSize = 100;
const maxEventPages = 40;

export class TonApi {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetch: typeof fetch;

  constructor(options: TonApiOptions) {
    this.baseUrl = tonapiBaseUrl(options.network);
    this.headers = options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {};
    this.fetch = options.fetch ?? fetch.bind(globalThis);
  }

  async transfersSince(account: Address, since: number): Promise<Transfer[]> {
    const transfersById = new Map<string, Transfer>();
    let beforeLt: bigint | null = null;
    let pages = 0;
    do {
      if (++pages > maxEventPages) {
        throw new Error(`More than ${eventsPageSize * maxEventPages} events since ${since}. Check this invoice from a newer start time.`);
      }
      const query = new URLSearchParams({ limit: String(eventsPageSize), start_date: String(since) });
      if (beforeLt !== null) query.set("before_lt", beforeLt.toString());
      const page = parseEventsPage(await this.get(`/v2/accounts/${account.toRawString()}/events?${query}`));
      for (const transfer of page.transfers) transfersById.set(transferKey(transfer), transfer);
      const reachedStart = page.oldestTimestamp === null || page.oldestTimestamp <= since;
      beforeLt = reachedStart ? null : page.nextBeforeLt;
    } while (beforeLt !== null);
    return [...transfersById.values()];
  }

  async merchantKeptValue(receiverTransaction: string): Promise<boolean> {
    const transaction = asObject(await this.get(`/v2/blockchain/transactions/${receiverTransaction}`), "transaction");
    const incoming = asObject(transaction.in_msg, "transaction.in_msg");
    const bounceMessage = asBoolean(incoming.bounced, "transaction.in_msg.bounced");
    return transaction.bounce_phase === undefined && !bounceMessage;
  }

  async acceptJetton(jetton: Jetton, owner: Address): Promise<JettonAsset> {
    return { kind: "jetton", ...jetton, recipientWallet: await this.jettonWallet(jetton.master, owner) };
  }

  async jettonWallet(master: Address, owner: Address): Promise<Address> {
    const path = `/v2/blockchain/accounts/${master.toRawString()}/methods/get_wallet_address?args=${owner.toRawString()}`;
    const decoded = asObject(asObject(await this.get(path), "response").decoded, "decoded");
    return Address.parse(asString(decoded.jetton_wallet_address, "decoded.jetton_wallet_address"));
  }

  private async get(path: string): Promise<unknown> {
    const response = await this.fetch(this.baseUrl + path, { headers: this.headers });
    if (!response.ok) throw new TonApiError(response.status, path, await response.text());
    return response.json();
  }
}

function transferKey(transfer: Transfer): string {
  return `${transfer.eventId}:${transfer.actionIndex}`;
}
