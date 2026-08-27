export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ConfigurationError extends DomainError {}

export class SubscriberNotFoundError extends DomainError {
  constructor(userId: number) {
    super(`Foydalanuvchi topilmadi: ${userId}`);
  }
}

export class NoChatsError extends DomainError {
  constructor() {
    super("Bot hech qaysi guruhga qo'shilmagan");
  }
}

export class NoMessageError extends DomainError {
  constructor() {
    super("Xabar matni hali belgilanmagan");
  }
}

export type AccessInputErrorCode =
  | "invalid-full-name"
  | "invalid-username"
  | "invalid-phone"
  | "username-in-use"
  | "phone-in-use";

export class AccessInputError extends DomainError {
  constructor(
    readonly code: AccessInputErrorCode,
    message: string,
  ) {
    super(message);
  }
}
