import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const items = [
  { name: "apple", price: 50, stock: 10 },
  { name: "banana", price: 20, stock: 0 },
  { name: "apricot", price: 120, stock: 5 },
  { name: "cherry", price: 30, stock: 15 },
];

test("Query.executeTakeFirst", () => {
  const result = Query.selectFrom(items).where("price", "<=", 50).orderBy("name", "asc").executeTakeFirst();
  expect(result).toEqual({ name: "apple", price: 50, stock: 10 });
});

test("Query.executeTakeFirst no match", () => {
  const result = Query.selectFrom(items).where("price", "<", 10).executeTakeFirst();
  expect(result).toBeUndefined();
});

test("Query.executeTakeFirstOrThrow", () => {
  const result = Query.selectFrom(items).where("price", "<", 100).orderBy("name", "asc").executeTakeFirstOrThrow();
  expect(result).toEqual({ name: "apple", price: 50, stock: 10 });
});

test("Query.executeTakeFirstOrThrow no match throws", () => {
  expect(() => {
    Query.selectFrom(items).where("price", "<", 10).executeTakeFirstOrThrow();
  }).toThrow(Query.NotFoundError);
});

test("Query.executeTakeFirst respects offset", () => {
  const result = Query.selectFrom(items).orderBy("name", "asc").offset(2).limit(2).executeTakeFirst();
  expect(result).toEqual({ name: "banana", price: 20, stock: 0 });
});

test("Query.executeTakeFirst returns undefined for an offset past the end", () => {
  const result = Query.selectFrom(items).offset(10).executeTakeFirst();
  expect(result).toBeUndefined();
});

test("Query.executeTakeFirstOrThrow respects offset", () => {
  expect(() => Query.selectFrom(items).offset(10).executeTakeFirstOrThrow()).toThrow(Query.NotFoundError);
});

test("Query.executeTakeFirst returns the earliest Item among ties", () => {
  const data = [
    { id: 1, price: 10 },
    { id: 2, price: 30 },
    { id: 3, price: 30 },
  ];
  expect(Query.selectFrom(data).orderBy("price", "desc").executeTakeFirst()).toEqual({ id: 2, price: 30 });
  expect(Query.selectFrom(data).orderBy("price", "asc").executeTakeFirst()).toEqual({ id: 1, price: 10 });
});

test("Query.executeTakeFirst applies filters before picking the first sorted Item", () => {
  const result = Query.selectFrom(items).where("stock", ">", 0).orderBy("price", "asc").executeTakeFirst();
  expect(result).toEqual({ name: "cherry", price: 30, stock: 15 });
});

test("Query.executeTakeFirst without sorting returns the first matching Item", () => {
  expect(Query.selectFrom(items).where("price", ">", 100).executeTakeFirst()).toEqual(items[2]);
  expect(Query.selectFrom(items).executeTakeFirst()).toEqual(items[0]);
});

test("Query.executeTakeFirst returns undefined with limit(0)", () => {
  expect(Query.selectFrom(items).limit(0).executeTakeFirst()).toBeUndefined();
});

test("a sorted, filtered window is taken after sorting every match", () => {
  const items = [5, 4, 3, 2, 1].map((p) => ({ p }));
  const result = Query.selectFrom(items).where("p", ">", 0).orderBy("p").offset(1).limit(2).execute();
  expect(result).toEqual([{ p: 2 }, { p: 3 }]);
});

test("a filtered execution without a limit returns every match", () => {
  const items = Array.from({ length: 20_000 }, (_, p) => ({ p }));
  expect(Query.selectFrom(items).where("p", ">=", 0).execute()).toHaveLength(20_000);
});
