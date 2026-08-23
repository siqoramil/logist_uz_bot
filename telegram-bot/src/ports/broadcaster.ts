import type { DeliveryErrorExplanation } from "@domain";

export type SendOutcome =
  | {
      readonly ok: true;
      readonly permanentFailure: false;
      readonly failure: null;
    }
  | {
      readonly ok: false;
      /** Set when retrying this chat cannot succeed without admin action. */
      readonly permanentFailure: boolean;
      readonly failure: DeliveryErrorExplanation;
    };

export interface Broadcaster {
  send(chatId: number, text: string): Promise<SendOutcome>;
}
