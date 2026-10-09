import { expect, test } from "vite-plus/test";
import { Query, type TextOperator } from "../src";

const items = [
  { name: "apple" },
  { name: "Apple Pie" },
  { name: "pineapple" },
  { name: "100%" },
  { name: "a_b" },
  { name: "ÉCLAIR" },
  { name: null },
  { name: undefined },
];

const run = (op: TextOperator, value: string) =>
  Query.selectFrom(items)
    .where("name", op, value)
    .execute()
    .map((i) => i.name);

test("contains is case-sensitive and literal", () => {
  expect(run("contains", "apple")).toEqual(["apple", "pineapple"]);
  expect(run("contains", "%")).toEqual(["100%"]);
  expect(run("contains", "_")).toEqual(["a_b"]);
});

test("icontains ignores case", () => {
  expect(run("icontains", "APPLE")).toEqual(["apple", "Apple Pie", "pineapple"]);
  expect(run("icontains", "éclair")).toEqual(["ÉCLAIR"]);
});

test("startsWith / istartsWith", () => {
  expect(run("startsWith", "app")).toEqual(["apple"]);
  expect(run("istartsWith", "APP")).toEqual(["apple", "Apple Pie"]);
});

test("endsWith / iendsWith", () => {
  expect(run("endsWith", "pie")).toEqual([]);
  expect(run("iendsWith", "PIE")).toEqual(["Apple Pie"]);
  expect(run("endsWith", "apple")).toEqual(["apple", "pineapple"]);
});

test("empty value matches every string, never nullish", () => {
  const strings = items.filter((i) => typeof i.name === "string").map((i) => i.name);
  for (const op of ["contains", "icontains", "startsWith", "istartsWith", "endsWith", "iendsWith"] as const) {
    expect(run(op, "")).toEqual(strings);
  }
});

test("text operators require a string value", () => {
  // @ts-expect-error
  expect(() => Query.selectFrom(items).where("name", "contains", 1)).toThrow(TypeError);
});

test("where(key, regex) tests the Key's text", () => {
  const result = Query.selectFrom(items)
    .where("name", /^apple/i)
    .execute()
    .map((i) => i.name);
  expect(result).toEqual(["apple", "Apple Pie"]);
});

test("regex with g or y flags is not stateful across Items", () => {
  const data = [{ name: "apple" }, { name: "apple" }, { name: "apple" }];
  expect(Query.selectFrom(data).where("name", /apple/g).execute()).toHaveLength(3);
  expect(Query.selectFrom(data).where("name", /apple/y).execute()).toHaveLength(3);
});

test("eb accepts text operators and regex", () => {
  const result = Query.selectFrom(items)
    .where((eb) => eb.or([eb("name", "icontains", "pie"), eb("name", /^\d+%$/)]))
    .execute()
    .map((i) => i.name);
  expect(result).toEqual(["Apple Pie", "100%"]);
});

test("text operator and regex type checks", () => {
  const query = Query.selectFrom([{ name: "a", price: 1 }]);
  query.where("name", /a/);
  query.where("name", "icontains", "a");
  // @ts-expect-error unknown key
  query.where("unknown", /a/);
  // @ts-expect-error a regex takes no value
  query.where("name", /a/, "x");
});
