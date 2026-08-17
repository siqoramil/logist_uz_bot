/** A group the bot was added to, owned by whoever added it. */
export interface ManagedChat {
  readonly chatId: number;
  readonly ownerId: number;
  readonly title: string;
  readonly active: boolean;
}
