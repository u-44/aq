# AQ — Array Query

**AQ** (Array Query) is a small, type-safe, SQL-flavoured query builder for filtering, sorting and paginating arrays of plain objects — entirely in memory, with zero dependencies.

```ts
import { Query } from "@u-44/aq";

const products = [
  { name: "Apple", price: 50, stock: 10 },
  { name: "Banana", price: 20, stock: 0 },
  { name: "Apricot", price: 120, stock: 5 },
  { name: "Cherry", price: 80, stock: 3 },
];

const result = Query.selectFrom(products)
  .where("name", "icontains", "a")
  .where("stock", ">", 0)
  .orderBy("price", "desc")
  .limit(10)
  .execute();
// → [Apricot, Apple]
```

## Features

- **Fluent & immutable** — every step returns a new `Query`; nothing runs until you execute it. Build a base query once and reuse it.
- **Type-safe** — keys are checked against your item type, and values are checked against the key's type.
- **Non-mutating** — the source array is never modified.
- **SQL-like comparisons** — `=`, `<>`, `<`, `<=`, `>`, `>=`.
- **Text search** — `contains`, `startsWith`, `endsWith` (and `i`-prefixed case-insensitive variants), or any `RegExp`.
- **Expression builder** — combine filters with `and`, `or` and `not`, and plug in custom predicates.
- **Multi-key sorting** — with sensible handling of strings, numbers, booleans, dates and `null`/`undefined`.
- **Offset & limit** — SQL-style windowing, with early exit when no sorting is needed.

## Installation

```bash
npm install @u-44/aq
# or
bun add @u-44/aq
```

## Usage

### Filtering

Use `where(key, operator, value)`. Successive `where` calls are combined with **AND**.

```ts
Query.selectFrom(products).where("price", ">=", 50).where("name", "icontains", "ap").execute();
```

| Operator                                | Meaning                                                          |
| --------------------------------------- | ---------------------------------------------------------------- |
| `=` / `<>`                              | Strict equality / inequality. `Date`s are compared by timestamp. |
| `<` `<=` `>` `>=`                       | Range comparison. `null`/`undefined` never match.                |
| `contains`                              | Text includes the value, case-sensitive.                         |
| `startsWith`                            | Text starts with the value, case-sensitive.                      |
| `endsWith`                              | Text ends with the value, case-sensitive.                        |
| `icontains`, `istartsWith`, `iendsWith` | Same, ignoring case.                                             |

#### Text search

`contains`, `startsWith`, `endsWith` and their `i` variants take the value literally (no wildcards, no escaping), so they are the easy choice for user input. An empty value matches every string; non-string values never match.

```ts
Query.selectFrom(products).where("name", "icontains", search).execute();
```

#### Regular expressions

Pass a `RegExp` instead of an operator to test the key's text against it, for wildcards, whole-text or case-insensitive equality matches, and anything else the text operators don't cover. Non-string values never match.

```ts
Query.selectFrom(products)
  .where("name", /^ap(ple|ricot)$/i)
  .execute();
```

### Expression builder

For `or`, `not`, nesting or custom logic, pass a callback to `where`. It receives an expression builder `eb` that uses the same operators:

```ts
Query.selectFrom(products)
  .where((eb) => eb.or([eb("name", "=", "Banana"), eb.and([eb("price", ">", 100), eb("stock", ">", 0)])]))
  .where((eb) => eb.not(eb("name", "istartsWith", "cherry")))
  .execute();
```

| Method               | Passes when                                              |
| -------------------- | -------------------------------------------------------- |
| `eb(key, op, value)` | The key matches, exactly like `where(key, op, value)`.   |
| `eb.and([...])`      | Every filter passes (an empty list always passes).       |
| `eb.or([...])`       | At least one filter passes (an empty list never passes). |
| `eb.not(filter)`     | The filter fails.                                        |
| `eb.fn(predicate)`   | Your custom `(item) => boolean` returns `true`.          |

Keys and values are type-checked against your items inside the callback too.

#### Custom predicates

Wrap any predicate with `eb.fn`. It composes with the other filters:

```ts
Query.selectFrom(products)
  .where((eb) => eb.and([eb.fn((p) => p.price % 2 === 0), eb("stock", ">", 0)]))
  .execute();
```

### Sorting

Chain `orderBy(key, direction)` calls; later criteria only break ties left by earlier ones. Direction defaults to `"asc"`.

```ts
Query.selectFrom(products).orderBy("stock", "desc").orderBy("name").execute();
```

- Strings are compared with `Intl.Collator`.
- Numbers, booleans and `Date`s are compared by value (`NaN` sorts last).
- `null` and `undefined` sort first in ascending order.

#### Sort transformers

Use `orderOptions(transformers)` to transform a key's values only for ordering (filters are unaffected). It applies to every `orderBy` on the query, and a later call replaces an earlier one:

```ts
Query.selectFrom(users)
  .orderBy("createdAt", "desc")
  .orderBy("name")
  .orderOptions({
    createdAt: (value) => new Date(value), // e.g. ISO strings → Date
  })
  .execute();
```

### Offset & limit

`offset(count)` skips the first `count` items of the filtered, sorted result; `limit(count)` keeps at most `count` of what remains. Both take non-negative integers, and a later call replaces an earlier one. Without them, all matching items are returned.

```ts
const secondPage = Query.selectFrom(products).orderBy("name").offset(20).limit(20).execute();
```

### Executing

| Method                              | Returns                                                         |
| ----------------------------------- | --------------------------------------------------------------- |
| `execute()`                         | `T[]` — all matching items.                                     |
| `executeTakeFirst()`                | `T \| undefined` — the first matching item.                     |
| `executeTakeFirstOrThrow(message?)` | `T` — the first matching item, or throws `Query.NotFoundError`. |

```ts
try {
  const cheapest = Query.selectFrom(products)
    .where("stock", ">", 0)
    .orderBy("price")
    .executeTakeFirstOrThrow("Nothing in stock");
} catch (error) {
  if (error instanceof Query.NotFoundError) {
    // handle missing item
  }
}
```

### Reusing queries

Because queries are immutable, you can derive variants from a shared base:

```ts
const inStock = Query.selectFrom(products).where("stock", ">", 0);

const cheap = inStock.where("price", "<", 60).execute();
const byName = inStock.orderBy("name").execute();
```

## License

MIT
