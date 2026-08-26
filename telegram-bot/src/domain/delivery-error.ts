export type DeliveryErrorCode =
  | "account-write-forbidden"
  | "account-not-member"
  | "account-restricted"
  | "send-rights-missing"
  | "bot-kicked"
  | "bot-not-member"
  | "chat-not-found"
  | "chat-migrated"
  | "chat-deactivated"
  | "chat-restricted"
  | "bot-blocked"
  | "user-deactivated"
  | "user-not-found"
  | "peer-invalid"
  | "admin-required"
  | "topic-closed"
  | "topic-not-found"
  | "message-empty"
  | "message-too-long"
  | "entity-parse"
  | "rate-limited"
  | "request-timeout"
  | "network-unavailable"
  | "connection-reset"
  | "telegram-server-error"
  | "bad-request"
  | "forbidden"
  | "unauthorized"
  | "conflict"
  | "unknown";

export interface DeliveryErrorExplanation {
  readonly code: DeliveryErrorCode;
  readonly reason: string;
  readonly action: string;
}
