import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const items = [
  { name: "apple", price: 50, stock: 10 },
  { name: "banana", price: 20, stock: 0 },
  { name: "apricot", price: 120, stock: 5 },
  { name: "cherry", price: 30, stock: 15 },
];

const names = (result: typeof items) => result.map((i) => i.name);

test("eb(key, op, value) builds the same Filter as where(key, op, value)", () => {
  const ops = [
    ["name", "contains", "a"],
    ["name", "istartsWith", "AP"],
    ["name", "iendsWith", "E"],
    ["price", "<", 50],
    ["price", "<=", 50],
    ["price", ">", 50],
    ["price", ">=", 50],
    ["price", "=", 50],
    ["price", "<>", 50],
  ] as const;
  for (const [key, op, value] of ops) {
    const viaBuilder = Query.selectFrom(items)
      // @ts-expect-error -- iterating a union of operator/value pairs
      .where((eb) => eb(key, op, value))
      .execute();
    // @ts-expect-error -- iterating a union of operator/value pairs
    const viaWhere = Query.selectFrom(items).where(key, op, value).execute();
    expect(viaBuilder).toEqual(viaWhere);
  }
});

test("eb.and passes when every Filter passes", () => {
  const result = Query.selectFrom(items)
    .where((eb) => eb.and([eb("name", "contains", "a"), eb("price", "<", 100)]))
    .execute();
  expect(names(result)).toEqual(["apple", "banana"]);
});

test("eb.or passes when any Filter passes", () => {
  const result = Query.selectFrom(items)
    .where((eb) => eb.or([eb("name", "=", "apple"), eb("name", "=", "cherry")]))
    .execute();
  expect(names(result)).toEqual(["apple", "cherry"]);
});

test("eb.not negates a Filter", () => {
  const result = Query.selectFrom(items)
    .where((eb) => eb.not(eb("name", "contains", "a")))
    .execute();
  expect(names(result)).toEqual(["cherry"]);
});

test("empty eb.and always passes, empty eb.or never passes", () => {
  expect(
    Query.selectFrom(items)
      .where((eb) => eb.and([]))
      .execute(),
  ).toHaveLength(4);
  expect(
    Query.selectFrom(items)
      .where((eb) => eb.or([]))
      .execute(),
  ).toHaveLength(0);
});

test("nested compound Filters", () => {
  const result = Query.selectFrom(items)
    .where((eb) => eb.or([eb("name", "=", "banana"), eb.and([eb("price", ">", 100), eb.not(eb("stock", "=", 0))])]))
    .execute();
  expect(names(result)).toEqual(["banana", "apricot"]);
});

test("eb.fn wraps a custom predicate", () => {
  const result = Query.selectFrom(items)
    .where((eb) => eb.fn((item) => item.price % 20 === 0))
    .execute();
  expect(names(result)).toEqual(["banana", "apricot"]);
});

test("eb.fn composes with other Filters", () => {
  const result = Query.selectFrom(items)
    .where((eb) => eb.and([eb.fn((item) => item.stock > 0), eb("price", "<", 100)]))
    .execute();
  expect(names(result)).toEqual(["apple", "cherry"]);
});

test("where(eb => ...) combines with other where calls as all-of", () => {
  const result = Query.selectFrom(items)
    .where("price", "<", 100)
    .where((eb) => eb.or([eb("stock", "=", 0), eb("name", "startsWith", "ch")]))
    .execute();
  expect(names(result)).toEqual(["banana", "cherry"]);
});

test("where(eb => ...) throws when the callback does not return a Filter", () => {
  // @ts-expect-error -- a plain predicate is not a Filter; use eb.fn
  expect(() => Query.selectFrom(items).where((item) => item.price < 100)).toThrow(TypeError);
});

test("text operators require a string value", () => {
  // @ts-expect-error -- value must be a string
  expect(() => Query.selectFrom(items).where((eb) => eb("name", "contains", 1))).toThrow(TypeError);
  // @ts-expect-error -- value must be a string
  expect(() => Query.selectFrom(items).where((eb) => eb("name", "istartsWith", null))).toThrow(TypeError);
});
