import { Address } from "@ton/core";
import { asArray, asBoolean, asInteger, asNumber, asObject, asOptionalString, asString, type JsonObject } from "./json.ts";

export type Transfer = {
  eventId: string;
  actionIndex: number;
  timestamp: number;
  sender: Address | null;
  recipient: Address;
  amount: bigint;
  comment: string | null;
  asset: TransferredAsset;
};

export type TransferredAsset =
  | { kind: "ton"; receiverTransaction: string }
  | { kind: "jetton"; master: Address; recipientWallet: Address };

export type EventsPage = {
  transfers: Transfer[];
  oldestTimestamp: number | null;
  nextBeforeLt: bigint | null;
};

export function parseEventsPage(body: unknown): EventsPage {
  const page = asObject(body, "response");
  const events = asArray(page.events, "events").map((event, index) => asObject(event, `events[${index}]`));
  const transfers = events.flatMap((event, index) => parseEventTransfers(event, `events[${index}]`));
  const timestamps = events.map((event, index) => asNumber(event.timestamp, `events[${index}].timestamp`));
  const nextFrom = page.next_from === undefined ? 0n : asInteger(page.next_from, "next_from");
  return {
    transfers,
    oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : null,
    nextBeforeLt: nextFrom > 0n ? nextFrom : null,
  };
}

function parseEventTransfers(event: JsonObject, path: string): Transfer[] {
  if (asBoolean(event.in_progress, `${path}.in_progress`)) return [];
  const eventId = asString(event.event_id, `${path}.event_id`);
  const timestamp = asNumber(event.timestamp, `${path}.timestamp`);
  return asArray(event.actions, `${path}.actions`).flatMap((raw, index) => {
    const actionPath = `${path}.actions[${index}]`;
    const action = asObject(raw, actionPath);
    const body = parseActionBody(action, actionPath);
    return body ? [{ eventId, actionIndex: index, timestamp, ...body }] : [];
  });
}

type TransferBody = Omit<Transfer, "eventId" | "actionIndex" | "timestamp">;

function parseActionBody(action: JsonObject, path: string): TransferBody | null {
  if (action.status !== "ok") return null;
  if (action.type === "TonTransfer") {
    const receiverTransaction = asString(asArray(action.base_transactions, `${path}.base_transactions`)[0], `${path}.base_transactions[0]`);
    return parseTonTransfer(asObject(action.TonTransfer, `${path}.TonTransfer`), receiverTransaction);
  }
  if (action.type === "JettonTransfer") return parseJettonTransfer(asObject(action.JettonTransfer, `${path}.JettonTransfer`));
  return null;
}

function parseTonTransfer(body: JsonObject, receiverTransaction: string): TransferBody {
  return {
    sender: accountAddress(body.sender, "TonTransfer.sender"),
    recipient: accountAddress(body.recipient, "TonTransfer.recipient"),
    amount: asInteger(body.amount, "TonTransfer.amount"),
    comment: asOptionalString(body.comment, "TonTransfer.comment"),
    asset: { kind: "ton", receiverTransaction },
  };
}

function parseJettonTransfer(body: JsonObject): TransferBody | null {
  if (body.recipient === undefined) return null;
  const jetton = asObject(body.jetton, "JettonTransfer.jetton");
  return {
    sender: body.sender === undefined ? null : accountAddress(body.sender, "JettonTransfer.sender"),
    recipient: accountAddress(body.recipient, "JettonTransfer.recipient"),
    amount: asInteger(body.amount, "JettonTransfer.amount"),
    comment: asOptionalString(body.comment, "JettonTransfer.comment"),
    asset: {
      kind: "jetton",
      master: Address.parse(asString(jetton.address, "JettonTransfer.jetton.address")),
      recipientWallet: Address.parse(asString(body.recipients_wallet, "JettonTransfer.recipients_wallet")),
    },
  };
}

function accountAddress(value: unknown, path: string): Address {
  return Address.parse(asString(asObject(value, path).address, `${path}.address`));
}
