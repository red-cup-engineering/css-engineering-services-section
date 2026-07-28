/**
 * organizing/accounting/market-admission — admit an economic order book through
 * gaming's market arena.
 *
 * This is the organizing-owned remnant of the retired `@red-cup-engineering/trading` root:
 * an accounting market token is not admitted as free data. Its order book is
 * first read as a gaming concurrent-game arena, then admitted through the
 * `@red-cup-engineering/gaming` root.
 */
import { gaming, type GamingAdmission } from "@red-cup-engineering/gaming";
import { marketArena, type OrderBook } from "@red-cup-engineering/gaming/market";

export type AccountingMarketAction = "accounting.market.admit";

export interface AccountingMarketToken {
  readonly id: string;
  readonly book: OrderBook;
}

export interface AccountingMarketClaim {
  readonly id?: string;
}

export interface AccountingMarketCarrier {
  readonly kind: "organizing.accounting.market.carrier";
  readonly game: GamingAdmission;
  readonly book: OrderBook;
}

export interface AccountingMarketAdmission {
  readonly action: AccountingMarketAction;
  readonly admitted: boolean;
  readonly carrier?: AccountingMarketCarrier;
  readonly game: GamingAdmission;
}

export function admitAccountingMarket(
  token: AccountingMarketToken,
  claim: AccountingMarketClaim = {},
): AccountingMarketAdmission {
  const arena = marketArena(token.book);
  const game = gaming(
    "create",
    { id: token.id, arena },
    claim.id === undefined ? {} : { id: claim.id },
  );
  return Object.freeze({
    action: "accounting.market.admit" as const,
    admitted: game.admitted,
    ...(game.admitted
      ? {
          carrier: Object.freeze({
            kind: "organizing.accounting.market.carrier" as const,
            game,
            book: token.book,
          }),
        }
      : {}),
    game,
  });
}

export function trade(
  action: AccountingMarketAction,
  token: AccountingMarketToken,
  claim?: AccountingMarketClaim,
): AccountingMarketAdmission {
  if (action !== "accounting.market.admit") {
    throw new TypeError(`accounting market trade: unsupported action ${JSON.stringify(action)}`);
  }
  return admitAccountingMarket(token, claim);
}
