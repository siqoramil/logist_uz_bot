import type { AccessRepository, Logger, SubscriberRepository } from "@ports";

export class ExpireAccessGrantsUseCase {
  constructor(
    private readonly access: AccessRepository,
    private readonly subscribers: SubscriberRepository,
    private readonly logger: Logger,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const expired = await this.access.expireDue(now);

    for (const grant of expired) {
      if (grant.linkedUserId === null) continue;
      const subscriber = await this.subscribers.find(grant.linkedUserId);
      if (!subscriber) continue;
      await this.subscribers.update(grant.linkedUserId, {
        active: false,
        state: "idle",
        nextRunAt: null,
      });
    }

    if (expired.length > 0) {
      this.logger.info(`${expired.length} ta foydalanuvchining oylik dostupi tugadi`);
    }
    return expired.length;
  }
}
