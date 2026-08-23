import type { AccessAnalytics, AccessGrant } from "@domain";

export interface AccessRepository {
  list(): Promise<AccessGrant[]>;
  add(username: string, phone: string): Promise<AccessGrant>;
  setEnabled(id: string, enabled: boolean): Promise<AccessGrant | null>;
  expireDue(now: Date): Promise<AccessGrant[]>;
  analytics(now?: Date): Promise<AccessAnalytics>;
  remove(id: string): Promise<AccessGrant | null>;
  isAuthorized(userId: number, username: string | null): Promise<boolean>;
  authorizeByUsername(userId: number, username: string | null): Promise<boolean>;
  authorizeByPhone(
    userId: number,
    username: string | null,
    phone: string,
  ): Promise<boolean>;
}
