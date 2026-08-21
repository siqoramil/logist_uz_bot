import { DomainError } from "./errors";

export class GuardError extends DomainError {}

export class Guard {
  static againstNullish<T>(
    value: T | null | undefined,
    name: string,
  ): asserts value is T {
    if (value === null || value === undefined) {
      throw new GuardError(`${name} bo'sh bo'lishi mumkin emas`);
    }
  }

  static againstEmpty(value: string, name: string): void {
    if (value.trim().length === 0) {
      throw new GuardError(`${name} bo'sh bo'lishi mumkin emas`);
    }
  }

  static againstEmptyArray<T>(value: readonly T[], name: string): void {
    if (value.length === 0) {
      throw new GuardError(`${name} bo'sh bo'lishi mumkin emas`);
    }
  }

  static againstNonPositive(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new GuardError(`${name} musbat son bo'lishi kerak (oldingi: ${value})`);
    }
  }

  static againstOutOfRange(
    value: number,
    min: number,
    max: number,
    name: string,
  ): void {
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new GuardError(
        `${name} ${min}..${max} oralig'ida bo'lishi kerak (oldingi: ${value})`,
      );
    }
  }

  static againstInvalidPattern(
    value: string,
    pattern: RegExp,
    name: string,
  ): void {
    if (!pattern.test(value)) {
      throw new GuardError(`${name} noto'g'ri formatda: ${value}`);
    }
  }

  static againstTooLong(value: string, maxLength: number, name: string): void {
    if (value.length > maxLength) {
      throw new GuardError(
        `${name} uzunligi ${maxLength} dan oshmasligi kerak (oldingi: ${value.length})`,
      );
    }
  }
}

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
