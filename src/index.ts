declare const filterBrand: unique symbol;

/**
 * A single test an Item either passes or fails. Built only through the {@link ExpressionBuilder}
 * passed to `where(eb => ...)`; use `eb.fn` to wrap a custom predicate.
 */
export type Filter<T> = ((item: T) => boolean) & {
  readonly [filterBrand]: true;
};

/**
 * Text operators: the Key's text contains, starts with or ends with the value, taken literally.
 * The `i` prefixed variants ignore case. An empty value matches every string. Non-string values never match.
 * For wildcards or anything fancier, use a {@link RegexOperator}.
 */
export type TextOperator = "contains" | "icontains" | "startsWith" | "istartsWith" | "endsWith" | "iendsWith";

/** Regex operators: the Key's text matches the RegExp value. `~` is an alias of `match`. Non-string values never match. */
export type RegexOperator = "match" | "~";

/** Operators that compare a Key's value with a value of the same type. */
export type ComparisonOperator = "=" | "<>" | "<" | "<=" | ">" | ">=";

export type Operator = TextOperator | RegexOperator | ComparisonOperator;

/**
 * Builds Filters inside `where(eb => ...)`.
 *
 * @example
 * ```typescript
 * Query.selectFrom(items).where((eb) =>
 *   eb.or([
 *     eb("name", "=", "banana"),
 *     eb.and([eb("price", ">", 100), eb.not(eb("stock", "=", 0))]),
 *   ]),
 * );
 * ```
 */
export interface ExpressionBuilder<T> {
  /** A text match Filter on a Key. The value must be a string. See {@link TextOperator}. */
  <K extends keyof T & string>(key: K, op: TextOperator, value: string): Filter<T>;
  /** An equality or range Filter on a Key. */
  <K extends keyof T & string>(key: K, op: ComparisonOperator, value: T[K]): Filter<T>;
  /** A Filter passing when the Key's text matches the RegExp. See {@link RegexOperator}. */
  <K extends keyof T & string>(key: K, op: RegexOperator, regex: RegExp): Filter<T>;
  /** Passes when every Filter passes. An empty list always passes. */
  and(filters: readonly Filter<T>[]): Filter<T>;
  /** Passes when at least one Filter passes. An empty list never passes. */
  or(filters: readonly Filter<T>[]): Filter<T>;
  /** Passes when the Filter fails. */
  not(filter: Filter<T>): Filter<T>;
  /** Wraps a custom predicate as a Filter. */
  fn(predicate: (item: T) => boolean): Filter<T>;
}

type Predicate<T = unknown> = (item: T) => boolean;

/** How built-in Filters see an Item: a bag of values read by Key. */
type Row = Readonly<Record<PropertyKey, unknown>>;

/** Values the range operators compare. */
type Comparable = string | number | bigint | boolean | Date;

const and =
  <T>(filters: readonly Predicate<T>[]): Predicate<T> =>
  (e) => {
    for (let i = 0, l = filters.length; i < l; i++) if (!filters[i](e)) return false;
    return true;
  };

const or =
  <T>(filters: readonly Predicate<T>[]): Predicate<T> =>
  (e) => {
    for (let i = 0, l = filters.length; i < l; i++) if (filters[i](e)) return true;
    return false;
  };

const not =
  <T>(filter: Predicate<T>): Predicate<T> =>
  (e) =>
    !filter(e);

/** Equality: Dates are equal when they denote the same instant. */
const equalityFilter = (key: PropertyKey, value: unknown): Predicate<Row> => {
  if (value instanceof Date) {
    return (e) => {
      const v = e[key];
      return v instanceof Date && v.getTime() === value.getTime();
    };
  }
  return (e) => e[key] === value;
};

const assertString: (value: unknown) => asserts value is string = (value) => {
  if (typeof value !== "string") {
    throw new TypeError(`Operator requires a string value, got ${value === null ? "null" : typeof value}`);
  }
};

const textFilter = (key: PropertyKey, op: TextOperator, value: unknown): Predicate<Row> => {
  assertString(value);
  switch (op) {
    case "contains": {
      return (e) => {
        const v = e[key];
        return typeof v === "string" && v.includes(value);
      };
    }
    case "icontains": {
      const needle = value.toLowerCase();
      return (e) => {
        const v = e[key];
        return typeof v === "string" && v.toLowerCase().includes(needle);
      };
    }
    case "startsWith": {
      return (e) => {
        const v = e[key];
        return typeof v === "string" && v.startsWith(value);
      };
    }
    case "istartsWith": {
      const needle = value.toLowerCase();
      return (e) => {
        const v = e[key];
        return typeof v === "string" && v.toLowerCase().startsWith(needle);
      };
    }
    case "endsWith": {
      return (e) => {
        const v = e[key];
        return typeof v === "string" && v.endsWith(value);
      };
    }
    case "iendsWith": {
      const needle = value.toLowerCase();
      return (e) => {
        const v = e[key];
        return typeof v === "string" && v.toLowerCase().endsWith(needle);
      };
    }
  }
};

const regexFilter = (key: PropertyKey, regex: unknown): Predicate<Row> => {
  if (!(regex instanceof RegExp)) {
    throw new TypeError(`Operator requires a RegExp value, got ${regex === null ? "null" : typeof regex}`);
  }
  // `g` and `y` make test() stateful (lastIndex); drop them so every Item is tested from the start.
  const r = regex.global || regex.sticky ? new RegExp(regex.source, regex.flags.replace(/[gy]/g, "")) : regex;
  return (e) => {
    const v = e[key];
    return typeof v === "string" && r.test(v);
  };
};

/** Built-in Filters read Items as Rows; this is the one place an Item is treated as one. */
const createFilter = (key: PropertyKey, op: Operator, value: unknown): Predicate =>
  createRowFilter(key, op, value) as Predicate;

const createRowFilter = (key: PropertyKey, op: Operator, value: unknown): Predicate<Row> => {
  // Range operators rely on JS relational semantics for whatever the caller passed in.
  const bound = value as Comparable;
  switch (op) {
    case "=":
      return equalityFilter(key, value);
    case "<>":
      return not(equalityFilter(key, value));
    case "<":
      return (e) => {
        const v = e[key] as Comparable | null | undefined;
        return v != null && v < bound;
      };
    case "<=":
      return (e) => {
        const v = e[key] as Comparable | null | undefined;
        return v != null && v <= bound;
      };
    case ">":
      return (e) => {
        const v = e[key] as Comparable | null | undefined;
        return v != null && v > bound;
      };
    case ">=":
      return (e) => {
        const v = e[key] as Comparable | null | undefined;
        return v != null && v >= bound;
      };
    case "contains":
    case "icontains":
    case "startsWith":
    case "istartsWith":
    case "endsWith":
    case "iendsWith":
      return textFilter(key, op, value);
    case "match":
    case "~":
      return regexFilter(key, value);
    default:
      throw new TypeError(`Unsupported operator: ${String(op)}`);
  }
};

/** Brands a Predicate as a Filter. Only the ExpressionBuilder mints Filters. */
const brand = <T>(predicate: Predicate<T>) => predicate as Filter<T>;

/** One shared instance: the builder holds no state, so it serves every Item type. */
const sharedExpressionBuilder = Object.assign(
  (key: PropertyKey, op: Operator, value: unknown) => brand(createFilter(key, op, value)),
  {
    and: <T>(filters: readonly Filter<T>[]) => brand(and(filters)),
    or: <T>(filters: readonly Filter<T>[]) => brand(or(filters)),
    not: <T>(filter: Filter<T>) => brand(not(filter)),
    fn: <T>(predicate: Predicate<T>) => brand(predicate),
  },
);

const expressionBuilder = <T>(): ExpressionBuilder<T> => sharedExpressionBuilder;

type Transformers<T> = {
  [K in keyof T]?: (value: T[K]) => string | number | boolean | Date | null | undefined;
};

/** Shared collator: same ordering as `localeCompare(b, undefined, { sensitivity: "variant" })`, without per-call setup. */
const textCollator = new Intl.Collator(undefined, { sensitivity: "variant" });

/** Collects up to `limit` matching Items after skipping `offset` of them, stopping as soon as the window is full. */
const takeWindow = <T>(items: Iterable<T>, filter: Predicate<T> | undefined, offset: number, limit: number): T[] => {
  const window: T[] = [];
  if (limit <= 0) return window;
  let skipped = 0;
  for (const item of items) {
    if (filter && !filter(item)) continue;
    if (skipped < offset) {
      skipped++;
      continue;
    }
    window.push(item);
    if (window.length >= limit) break;
  }
  return window;
};

const assertCount = (name: string, value: number) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer, got ${String(value)}`);
  }
};

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Normalises a Source to an Iterable. A bare Iterator becomes a one-shot Iterable over it. */
const toIterable = <T>(items: Iterable<T> | Iterator<T>): Iterable<T> => {
  if (Symbol.iterator in items) return items;
  if ("next" in items && typeof items.next === "function") {
    return { [Symbol.iterator]: () => items };
  }
  throw new TypeError("Query.selectFrom requires an Iterable or an Iterator");
};

type Ordering<T> = { key: keyof T; direction: "asc" | "desc" };

/** Everything a Query describes. Each builder step copies it with one field changed. */
type QueryState<T> = {
  readonly items: Iterable<T>;
  readonly filters?: readonly Predicate<T>[];
  readonly orderBy?: readonly Ordering<T>[];
  readonly transformers?: Transformers<T>;
  readonly offset: number;
  readonly limit?: number;
};

/**
 * A fluent query builder for filtering, sorting, and paginating arrays of objects.
 * Supports chaining operations like where, orderBy, offset and limit for building complex queries.
 *
 * @example
 * ```typescript
 * const items = [
 *   { name: "apple", price: 50, stock: 10 },
 *   { name: "banana", price: 20, stock: 0 },
 *   { name: "apricot", price: 120, stock: 5 },
 * ];
 *
 * const result = Query
 *   .selectFrom(items)
 *   .where("name", "icontains", "a")
 *   .where("price", "<", 100)
 *   .where((eb) => eb.or([eb("stock", ">", 0), eb("name", "=", "banana")]))
 *   .orderBy("name", "asc")
 *   .orderBy("price", "desc")
 *   .offset(0)
 *   .limit(10)
 *   .execute();
 * ```
 */
export class Query<T> {
  private constructor(private readonly state: QueryState<T>) {}

  static NotFoundError = NotFoundError;

  static compare<T>(a: T, b: T, key: keyof T, transformers?: Transformers<T>): number {
    const t = transformers?.[key];
    const aVal: unknown = t ? t(a[key]) : a[key];
    const bVal: unknown = t ? t(b[key]) : b[key];

    if (aVal == null) return bVal == null ? 0 : -1;
    if (bVal == null) return 1;

    const aType = typeof aVal;
    const bType = typeof bVal;

    if (aType === "string" && bType === "string") {
      return textCollator.compare(aVal as string, bVal as string);
    }
    if (aType === "number" && bType === "number") {
      if (Number.isNaN(aVal)) return Number.isNaN(bVal) ? 0 : 1;
      if (Number.isNaN(bVal)) return -1;
      return (aVal as number) - (bVal as number);
    }
    if (aType === "boolean" && bType === "boolean") {
      return aVal === bVal ? 0 : aVal ? 1 : -1;
    }
    if (aVal instanceof Date && bVal instanceof Date) {
      return aVal.getTime() - bVal.getTime();
    }
    return 0;
  }

  /**
   * Creates a new Query instance from a Source: an array, any other Iterable (Set, Map values,
   * generator, ...) or a bare Iterator. The Source is never mutated.
   *
   * A one-shot Source (a generator or Iterator) is consumed by the first Execution; later
   * Executions see only what is left of it. Unsorted Executions with a Limit, and
   * `executeTakeFirst()` without sorting, stop reading the Source early, so they work on infinite ones.
   *
   * @param items The objects to query.
   * @returns A new Query instance.
   */
  static selectFrom<T>(items: Iterable<T> | Iterator<T>): Query<T> {
    return new Query({ items: toIterable(items), offset: 0 });
  }

  private with(changes: Partial<QueryState<T>>): Query<T> {
    return new Query({ ...this.state, ...changes });
  }

  /**
   * Adds a text match Filter. The value must be a string. See {@link TextOperator}.
   *
   * @example
   * ```typescript
   * Query.selectFrom(items).where("name", "icontains", search).execute();
   * Query.selectFrom(items).where("name", "istartsWith", "ap").execute();
   * ```
   */
  where<K extends keyof T & string>(key: K, op: TextOperator, value: string): Query<T>;
  /**
   * Adds an equality or range Filter.
   *
   * @example
   * ```typescript
   * Query.selectFrom(items).where("price", "<", 100).execute();
   * ```
   */
  where<K extends keyof T & string>(key: K, op: ComparisonOperator, value: T[K]): Query<T>;
  /**
   * Adds a Filter passing when the Key's text matches the RegExp. See {@link RegexOperator}.
   *
   * @example
   * ```typescript
   * Query.selectFrom(items).where("name", "match", /^ap(ple|ricot)$/i).execute();
   * Query.selectFrom(items).where("name", "~", /^ap/).execute();
   * ```
   */
  where<K extends keyof T & string>(key: K, op: RegexOperator, regex: RegExp): Query<T>;
  /**
   * Adds a Filter built with the {@link ExpressionBuilder}, for and / or / not and custom predicates.
   *
   * @example
   * ```typescript
   * Query.selectFrom(items)
   *   .where((eb) => eb.or([eb("name", "=", "banana"), eb("price", ">", 100)]))
   *   .where((eb) => eb.fn((item) => item.price % 2 === 0))
   *   .execute();
   * ```
   */
  where(build: (eb: ExpressionBuilder<T>) => Filter<T>): Query<T>;
  where(
    keyOrBuild: (keyof T & string) | ((eb: ExpressionBuilder<T>) => Filter<T>),
    op?: Operator,
    value?: unknown,
  ): Query<T> {
    let filter: Predicate<T>;
    if (typeof keyOrBuild === "function") {
      filter = keyOrBuild(expressionBuilder<T>());
      if (typeof filter !== "function") {
        throw new TypeError("where(eb => ...) must return a Filter; wrap custom predicates with eb.fn()");
      }
    } else if (typeof keyOrBuild === "string" && typeof op === "string") {
      filter = createFilter(keyOrBuild, op, value);
    } else {
      throw new TypeError("Invalid arguments for Query.where clause");
    }
    const filters = this.state.filters;
    return this.with({ filters: filters ? [...filters, filter] : [filter] });
  }

  /**
   * Adds a Sort Criterion. Chain multiple calls for multi-criteria sorting;
   * later criteria only break ties left by earlier ones.
   *
   * @example
   * ```typescript
   * const sorted = Query.selectFrom(items)
   *   .orderBy("price", "asc")
   *   .orderBy("name", "desc")
   *   .execute();
   * ```
   *
   * @param key The property key to sort by.
   * @param direction The sort direction, defaults to ascending.
   * @returns A new Query instance with sorting applied.
   */
  orderBy<K extends keyof T>(key: K, direction: "asc" | "desc" = "asc"): Query<T> {
    const ordering = this.state.orderBy ?? [];
    return this.with({ orderBy: [...ordering, { key, direction }] });
  }

  /**
   * Sets the Sort Transformers: per-Key conversions applied to values only when ordering.
   * Filters never see them. Replaces any transformers set by an earlier call.
   *
   * @example
   * ```typescript
   * Query.selectFrom(users)
   *   .orderBy("createdAt", "desc")
   *   .orderBy("name")
   *   .orderOptions({ createdAt: Date.parse })
   *   .execute();
   * ```
   *
   * @param transformers Conversions keyed by the Key they apply to.
   * @returns A new Query instance with the transformers applied.
   */
  orderOptions(transformers: Transformers<T>): Query<T> {
    return this.with({ transformers });
  }

  /**
   * Skips the first `count` Items of the filtered, sorted result. Replaces any earlier offset.
   *
   * @example
   * ```typescript
   * const secondPage = Query.selectFrom(items).orderBy("name").offset(10).limit(10).execute();
   * ```
   *
   * @param count A non-negative integer.
   * @returns A new Query instance with the offset applied.
   */
  offset(count: number): Query<T> {
    assertCount("offset", count);
    return this.with({ offset: count });
  }

  /**
   * Returns at most `count` Items, after the offset. Replaces any earlier limit.
   *
   * @example
   * ```typescript
   * const top3 = Query.selectFrom(items).orderBy("price", "desc").limit(3).execute();
   * ```
   *
   * @param count A non-negative integer.
   * @returns A new Query instance with the limit applied.
   */
  limit(count: number): Query<T> {
    assertCount("limit", count);
    return this.with({ limit: count });
  }

  /**
   * Executes the query and returns the filtered, sorted, offset and limited results.
   *
   * @example
   * ```typescript
   * const result = Query.selectFrom(items)
   *   .where("stock", ">", 0)
   *   .orderBy("price", "asc")
   *   .limit(10)
   *   .execute();
   * ```
   *
   * @returns The array of items matching the query criteria.
   */
  execute(): T[] {
    const { items, offset, limit } = this.state;
    const filter = this.combinedFilter();
    const comparator = this.buildComparator();

    // Unsorted: stream, stopping as soon as the window is full (works on infinite Sources).
    if (!comparator) return takeWindow(items, filter, offset, limit ?? Infinity);

    // Sorted: every match must be seen before the window is known. Filter, sort, then slice.
    const result = filter ? takeWindow(items, filter, 0, Infinity) : Array.from(items);
    result.sort(comparator);
    if (offset === 0 && limit === undefined) return result;
    return result.slice(offset, limit === undefined ? undefined : offset + limit);
  }

  private combinedFilter(): Predicate<T> | undefined {
    const filters = this.state.filters;
    if (!filters?.length) return undefined;
    return filters.length === 1 ? filters[0] : and(filters);
  }

  /** Builds one comparator for all Sort Criteria, or undefined when the Query is unsorted. */
  private buildComparator(): ((a: T, b: T) => number) | undefined {
    const { orderBy, transformers } = this.state;
    if (!orderBy?.length) return undefined;
    const keys = orderBy.map((c) => c.key);
    const multipliers = orderBy.map((c) => (c.direction === "desc" ? -1 : 1));
    const n = keys.length;
    return (a, b) => {
      for (let i = 0; i < n; i++) {
        const diff = Query.compare(a, b, keys[i], transformers);
        if (diff !== 0) return multipliers[i] * diff;
      }
      return 0;
    };
  }

  /**
   * Executes the query and returns the first item of the result (respecting `offset()` and `limit()`),
   * or undefined if it is empty.
   *
   * @example
   * ```typescript
   * const first = Query.selectFrom(items)
   *   .where("stock", ">", 0)
   *   .orderBy("price", "asc")
   *   .executeTakeFirst();
   * ```
   *
   * @returns The first item matching the query criteria, or undefined.
   */
  executeTakeFirst(): T | undefined {
    const { items, offset, limit } = this.state;
    if (limit === 0) return undefined;
    if (offset > 0) return this.limit(1).execute().at(0);

    const filter = this.combinedFilter();
    const comparator = this.buildComparator();
    if (!comparator) {
      for (const item of items) if (!filter || filter(item)) return item;
      return undefined;
    }

    // Single pass instead of a full sort. Strict `<` keeps the earliest Item among ties,
    // matching the stable sort used by execute().
    let best: T | undefined;
    for (const item of items) if ((!filter || filter(item)) && (!best || comparator(item, best) < 0)) best = item;
    return best;
  }

  /**
   * Executes the query and returns the first matching item, or throws an error if no items match.
   *
   * @param message Optional error message when no matching item is found.
   * @example
   * ```typescript
   * try {
   *   const item = Query.selectFrom(items)
   *     .where("stock", ">", 0)
   *     .orderBy("price", "asc")
   *     .executeTakeFirstOrThrow("No item found");
   *   console.log(item);
   * } catch (error) {
   *   if (error instanceof Query.NotFoundError) {
   *     console.error("No item found");
   *   } else {
   *     throw error;
   *   }
   * }
   * ```
   *
   * @returns The first item matching the query criteria.
   * @throws NotFoundError if no items match the query criteria.
   */
  executeTakeFirstOrThrow(message?: string): T {
    const result = this.executeTakeFirst();
    if (result === undefined) {
      throw new Query.NotFoundError(message ?? "No item found");
    }
    return result;
  }
}
