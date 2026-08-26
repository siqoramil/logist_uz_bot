import type { TelegramClient } from "teleproto";
import { TelegramAccountBroadcaster } from "../src/account/account-broadcaster";
import type { RedisBroadcastState } from "../src/account/redis-broadcast-state";
import type { Logger } from "@ports";

interface FakeDialog {
  readonly isGroup: boolean;
  readonly title: string;
  readonly inputEntity: string;
}

const dialogs: FakeDialog[] = [
  { isGroup: true, title: "Group one", inputEntity: "group-1" },
  { isGroup: false, title: "Private chat", inputEntity: "user-1" },
  { isGroup: true, title: "Closed group", inputEntity: "group-2" },
  { isGroup: true, title: "Group three", inputEntity: "group-3" },
];

const sent: string[] = [];
let latestResult: unknown = null;
const fakeState = {
  acquire: async () => ({ release: async () => undefined }),
  saveLastResult: async (result: unknown) => { latestResult = result; },
  getLastResult: async () => latestResult,
} as unknown as RedisBroadcastState;
const fakeClient = {
  async getDialogs(): Promise<FakeDialog[]> {
    return dialogs;
  },
  async sendMessage(entity: string): Promise<void> {
    if (entity === "group-2") throw new Error("network error");
    sent.push(entity);
  },
} as unknown as TelegramClient;

const main = async (): Promise<void> => {
  const logger: Logger = { info: () => undefined, success: () => undefined, error: () => undefined };
  const broadcaster = new TelegramAccountBroadcaster(fakeClient, {
    sendConcurrency: 2,
    maxFloodWaitSeconds: 0,
  }, logger, fakeState);

  const groupCount = await broadcaster.countGroups();
  if (groupCount !== 3) throw new Error(`Expected 3 groups, received ${groupCount}`);

  const progress: number[] = [];
  const result = await broadcaster.execute("Test message", async ({ done }) => {
    progress.push(done);
  });

  if (result.total !== 3 || result.sent !== 2 || result.failed !== 1) {
    throw new Error(`Unexpected result: ${JSON.stringify(result)}`);
  }
  if (result.skipped !== 0 || result.canceled || progress.sort().join(",") !== "1,2,3") {
    throw new Error("Queue progress or completion state is incorrect");
  }
  if (sent.sort().join(",") !== "group-1,group-3") {
    throw new Error(`Unexpected targets: ${sent.join(",")}`);
  }
  if (result.deliveredGroups.sort().join(",") !== "Group one,Group three") {
    throw new Error(`Unexpected delivered groups: ${result.deliveredGroups.join(",")}`);
  }
  console.log("ACCOUNT BROADCAST SMOKE O'TDI ✅");
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
