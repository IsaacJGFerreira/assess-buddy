import assert from "node:assert/strict";
import test from "node:test";

import {
  runSequentialFeedbackDelivery,
  type FeedbackDeliveryUpdate,
} from "@/lib/feedback-delivery-queue";

test("delivers one feedback at a time and reports each phase", async () => {
  const events: string[] = [];
  const updates: FeedbackDeliveryUpdate[] = [];

  const results = await runSequentialFeedbackDelivery(
    [{ id: "ana" }, { id: "gabriel" }],
    async (item, setPhase) => {
      events.push(`start:${item.id}`);
      setPhase("sending");
      await Promise.resolve();
      events.push(`end:${item.id}`);
    },
    (update) => updates.push(update),
  );

  assert.deepEqual(events, ["start:ana", "end:ana", "start:gabriel", "end:gabriel"]);
  assert.deepEqual(results, [
    { id: "ana", status: "sent" },
    { id: "gabriel", status: "sent" },
  ]);
  assert.deepEqual(
    updates.map(({ id, status }) => `${id}:${status}`),
    [
      "ana:preparing",
      "ana:sending",
      "ana:sent",
      "gabriel:preparing",
      "gabriel:sending",
      "gabriel:sent",
    ],
  );
});

test("continues with the next student when one delivery fails", async () => {
  const attempted: string[] = [];

  const results = await runSequentialFeedbackDelivery(
    [{ id: "sem-email" }, { id: "com-email" }],
    async (item) => {
      attempted.push(item.id);
      if (item.id === "sem-email") throw new Error("Aluno sem e-mail.");
    },
    () => undefined,
  );

  assert.deepEqual(attempted, ["sem-email", "com-email"]);
  assert.deepEqual(results, [
    { id: "sem-email", status: "failed", error: "Aluno sem e-mail." },
    { id: "com-email", status: "sent" },
  ]);
});
