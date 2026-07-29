/**
 * Market microstructure as gaming law.
 *
 * A limit order book is a small concurrent game surface: bids and asks expose
 * playable liquidity, and a marketable order walks the available side until it
 * is exhausted or the book runs dry. This module owns the reusable order-book
 * mechanics; financial/product packages may name the venue, but the game-shaped
 * book walk belongs to gaming.
 */
import { ratSign } from "@lenticule-science/articulating/predicating/positing/settling/analysis";
import {
  addMoney,
  cmpMoney,
  commodityOf,
  moneyFromParts,
  moneyZero,
  ratioOf,
  scaleMoney,
  subMoney,
  timesMoney,
  valueRational,
  type Money,
} from "./economy.mjs";

export * from "./economy.mjs";

const oneHalf = valueRational(moneyFromParts(1n, 2n, "scalar"));

/** One price level of an order book. */
export interface BookLevel {
  /** Quote commodity per one unit of base. */
  readonly price: Money;
  /** Available size at this price, in the base commodity. */
  readonly quantity: Money;
}

/** An order book snapshot. Sides may arrive unsorted; the laws sort copies. */
export interface OrderBook {
  readonly bids: readonly BookLevel[];
  readonly asks: readonly BookLevel[];
}

function assertSideCoherent(side: readonly BookLevel[], label: string): void {
  const first = side[0];
  if (first === undefined) return;
  for (const level of side) {
    if (commodityOf(level.price) !== commodityOf(first.price)) {
      throw new TypeError(`gaming.market: mixed price commodities in ${label}`);
    }
    if (commodityOf(level.quantity) !== commodityOf(first.quantity)) {
      throw new TypeError(`gaming.market: mixed quantity commodities in ${label}`);
    }
    if (ratSign(valueRational(level.quantity)) < 0 || ratSign(valueRational(level.price)) < 0) {
      throw new RangeError(`gaming.market: negative price or quantity in ${label}`);
    }
  }
}

function sortedAsks(book: OrderBook): readonly BookLevel[] {
  assertSideCoherent(book.asks, "asks");
  return [...book.asks].sort((a, b) => cmpMoney(a.price, b.price));
}

function sortedBids(book: OrderBook): readonly BookLevel[] {
  assertSideCoherent(book.bids, "bids");
  return [...book.bids].sort((a, b) => cmpMoney(b.price, a.price));
}

/** The highest bid level, if any. */
export function bestBid(book: OrderBook): BookLevel | undefined {
  return sortedBids(book)[0];
}

/** The lowest ask level, if any. */
export function bestAsk(book: OrderBook): BookLevel | undefined {
  return sortedAsks(book)[0];
}

/** Exact spread, best ask minus best bid, absent when either side is empty. */
export function spread(book: OrderBook): Money | undefined {
  const bid = bestBid(book);
  const ask = bestAsk(book);
  if (bid === undefined || ask === undefined) return undefined;
  return subMoney(ask.price, bid.price);
}

/** Exact midpoint, average of best bid and best ask. */
export function midpoint(book: OrderBook): Money | undefined {
  const bid = bestBid(book);
  const ask = bestAsk(book);
  if (bid === undefined || ask === undefined) return undefined;
  return scaleMoney(addMoney(bid.price, ask.price), oneHalf);
}

/** Spread over midpoint as a dimensionless exact ratio. */
export function relativeSpread(book: OrderBook): { readonly num: bigint; readonly den: bigint } | undefined {
  const s = spread(book);
  const m = midpoint(book);
  if (s === undefined || m === undefined) return undefined;
  if (ratSign(valueRational(m)) === 0) return undefined;
  return ratioOf(s, m);
}

/** The outcome of walking one side of a book with a marketable order. */
export interface BookWalk {
  /** Base quantity actually filled. */
  readonly filled: Money;
  /** Quote spent by a buy, or received by a sell. */
  readonly cost: Money;
  /** Base quantity left unfilled; positive means the book was too thin. */
  readonly shortfall: Money;
  /** Exact average price, absent when nothing filled. */
  readonly averagePrice?: Money;
}

function walk(levels: readonly BookLevel[], baseQuantity: Money): BookWalk {
  if (ratSign(valueRational(baseQuantity)) < 0) {
    throw new RangeError("gaming.market: negative walk quantity");
  }
  const first = levels[0];
  const baseCommodity = commodityOf(baseQuantity);
  const quoteCommodity = first === undefined ? baseCommodity : commodityOf(first.price);
  let remaining = baseQuantity;
  let filled = moneyZero(baseCommodity);
  let cost = moneyZero(quoteCommodity);
  for (const level of levels) {
    if (ratSign(valueRational(remaining)) === 0) break;
    if (commodityOf(level.quantity) !== baseCommodity) {
      throw new TypeError(
        `gaming.market: walk quantity commodity ${baseCommodity} does not match book base ${commodityOf(level.quantity)}`,
      );
    }
    const take = cmpMoney(remaining, level.quantity) <= 0 ? remaining : level.quantity;
    filled = addMoney(filled, take);
    cost = addMoney(cost, timesMoney(level.price, take, commodityOf(level.price)));
    remaining = subMoney(remaining, take);
  }
  const averagePrice = ratSign(valueRational(filled)) === 0
    ? undefined
    : (() => {
        const ratio = ratioOf(cost, filled);
        return moneyFromParts(ratio.num, ratio.den, commodityOf(cost));
      })();
  return Object.freeze({
    filled,
    cost,
    shortfall: remaining,
    ...(averagePrice !== undefined ? { averagePrice } : {}),
  });
}

/** Walk the asks with a market buy of `baseQuantity`. */
export function marketBuyWalk(book: OrderBook, baseQuantity: Money): BookWalk {
  return walk(sortedAsks(book), baseQuantity);
}

/** Walk the bids with a market sell of `baseQuantity`. */
export function marketSellWalk(book: OrderBook, baseQuantity: Money): BookWalk {
  return walk(sortedBids(book), baseQuantity);
}

export * from "./arena.mjs";
