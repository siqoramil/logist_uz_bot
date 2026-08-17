export interface SendOutcome {
  readonly ok: boolean;
  /** Set when the chat is gone for good (kicked, deleted) — caller deactivates it. */
  readonly permanentFailure: boolean;
  readonly reason: string | null;
}

export interface Broadcaster {
  send(chatId: number, text: string): Promise<SendOutcome>;
}
