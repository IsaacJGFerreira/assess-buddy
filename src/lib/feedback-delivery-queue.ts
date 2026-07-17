export type FeedbackDeliveryStatus = "queued" | "preparing" | "sending" | "sent" | "failed";

export interface FeedbackDeliveryItem {
  id: string;
}

export interface FeedbackDeliveryUpdate {
  id: string;
  status: FeedbackDeliveryStatus;
  error?: string;
}

export interface FeedbackDeliveryResult {
  id: string;
  status: "sent" | "failed";
  error?: string;
}

export async function runSequentialFeedbackDelivery<T extends FeedbackDeliveryItem>(
  items: T[],
  deliver: (item: T, setPhase: (status: "preparing" | "sending") => void) => Promise<void>,
  onUpdate: (update: FeedbackDeliveryUpdate) => void,
): Promise<FeedbackDeliveryResult[]> {
  const results: FeedbackDeliveryResult[] = [];

  for (const item of items) {
    onUpdate({ id: item.id, status: "preparing" });

    try {
      await deliver(item, (status) => onUpdate({ id: item.id, status }));
      const result: FeedbackDeliveryResult = { id: item.id, status: "sent" };
      results.push(result);
      onUpdate(result);
    } catch (error) {
      const result: FeedbackDeliveryResult = {
        id: item.id,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
      results.push(result);
      onUpdate(result);
    }
  }

  return results;
}
