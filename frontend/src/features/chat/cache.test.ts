import { describe, expect, it } from "vitest";
import type { MessageDto } from "@/lib/api/types";
import {
  addOptimistic,
  applyReadReceipt,
  createOptimisticMessage,
  flattenMessages,
  markFailed,
  upsertMessage,
  type MessagesData,
} from "./cache";

const msg = (id: string, senderId: string, content = id, readAt: string | null = null): MessageDto => ({
  id,
  conversationId: "c1",
  senderId,
  content,
  createdAt: "2026-10-07T10:00:00Z",
  readAt,
});

const data = (pages: MessageDto[][]): MessagesData => ({ pages, pageParams: pages.map(() => undefined) });

describe("chat message cache", () => {
  it("flattens newest-first pages into chronological order", () => {
    const d = data([
      [msg("m3", "a"), msg("m4", "b")],
      [msg("m1", "a"), msg("m2", "b")],
    ]);
    expect(flattenMessages(d).map((m) => m.id)).toEqual(["m1", "m2", "m3", "m4"]);
  });

  it("replaces the optimistic message when the server echo arrives", () => {
    const temp = createOptimisticMessage("c1", "me", "hello");
    let d = addOptimistic(data([[msg("m1", "them")]]), temp);
    d = upsertMessage(d, msg("m2", "me", "hello"));
    expect(flattenMessages(d).map((m) => [m.id, m.pending])).toEqual([
      ["m1", undefined],
      ["m2", undefined],
    ]);
  });

  it("ignores duplicate deliveries and drops the temp copy when REST and WS race", () => {
    const temp = createOptimisticMessage("c1", "me", "hi");
    let d = addOptimistic(data([[]]), temp);
    d = upsertMessage(d, msg("m9", "me", "hi")); // WS echo replaces the temp
    d = upsertMessage(d, msg("m9", "me", "hi"), temp.id); // REST response for the same message
    expect(flattenMessages(d).map((m) => m.id)).toEqual(["m9"]);
  });

  it("appends messages from the counterpart", () => {
    const d = upsertMessage(data([[msg("m1", "me")]]), msg("m2", "them"));
    expect(flattenMessages(d).map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("marks failed sends and applies read receipts to the reader's counterpart messages only", () => {
    const temp = createOptimisticMessage("c1", "me", "yo");
    let d = addOptimistic(data([[msg("m1", "me"), msg("m2", "them")]]), temp);
    d = markFailed(d, temp.id);
    d = applyReadReceipt(d, "them", "2026-10-07T11:00:00Z");
    const [m1, m2, failed] = flattenMessages(d);
    expect(m1.readAt).toBe("2026-10-07T11:00:00Z");
    expect(m2.readAt).toBeNull();
    expect(failed).toMatchObject({ failed: true, pending: false, readAt: null });
  });

  it("leaves unloaded threads alone", () => {
    expect(upsertMessage(undefined, msg("m1", "a"))).toBeUndefined();
  });
});
