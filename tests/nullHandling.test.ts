import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const mixedItems = [
  { name: "apple", price: 50, stock: 10, active: true, createdAt: new Date("2023-01-01") },
  { name: null, price: null, stock: 0, active: false, createdAt: new Date("2022-01-01") },
  { name: "banana", price: 20, stock: undefined, active: true, createdAt: null },
  { name: undefined, price: 100, stock: 5, active: false, createdAt: new Date("2024-01-01") },
];

test("Query.where with null value using =", () => {
  const result = Query.selectFrom(mixedItems).where("name", "=", null).execute();
  expect(result).toEqual([{ name: null, price: null, stock: 0, active: false, createdAt: new Date("2022-01-01") }]);
});

test("Query.where with undefined value using =", () => {
  const result = Query.selectFrom(mixedItems).where("name", "=", undefined).execute();
  expect(result).toEqual([{ name: undefined, price: 100, stock: 5, active: false, createdAt: new Date("2024-01-01") }]);
});

test("Query.where with <> operator and null value", () => {
  const result = Query.selectFrom(mixedItems).where("price", "<>", null).execute();
  expect(result).toEqual([mixedItems[0], mixedItems[2], mixedItems[3]]);
});

test("Query.where with boolean true value", () => {
  const result = Query.selectFrom(mixedItems).where("active", "=", true).execute();
  expect(result).toEqual([mixedItems[0], mixedItems[2]]);
});

test("Query.where with boolean false value", () => {
  const result = Query.selectFrom(mixedItems).where("active", "=", false).execute();
  expect(result).toEqual([mixedItems[1], mixedItems[3]]);
});

test("Query.where with Date value using >", () => {
  const result = Query.selectFrom(mixedItems).where("createdAt", ">", new Date("2023-01-01")).execute();

  expect(result).toEqual([mixedItems[3]]);
});

test("Query.where with Date value using <", () => {
  const result = Query.selectFrom(mixedItems).where("createdAt", "<", new Date("2023-01-01")).execute();

  expect(result).toEqual([mixedItems[1]]);
});

test("Query.where with Date value using =", () => {
  const result = Query.selectFrom(mixedItems).where("createdAt", "=", new Date("2023-01-01")).execute();

  expect(result).toEqual([mixedItems[0]]);
});

test("Query.where with contains skips null and undefined values", () => {
  const result = Query.selectFrom(mixedItems).where("name", "contains", "a").execute();

  expect(result).toEqual([mixedItems[0], mixedItems[2]]);
});

test("Query.where with startsWith skips null and undefined values", () => {
  const result = Query.selectFrom(mixedItems).where("name", "startsWith", "a").execute();

  expect(result).toEqual([mixedItems[0]]);
});

test("Query.where with numeric comparison skips null and undefined values", () => {
  const result = Query.selectFrom(mixedItems).where("price", "<", 60).execute();

  expect(result).toEqual([mixedItems[0], mixedItems[2]]);
});

test("Query.where with undefined field value using =", () => {
  const result = Query.selectFrom(mixedItems).where("stock", "=", undefined).execute();

  expect(result).toEqual([mixedItems[2]]);
});

test("Query.orderBy ascending with null and undefined values", () => {
  const result = Query.selectFrom(mixedItems).orderBy("price", "asc").execute();

  expect(result).toEqual([
    mixedItems[1], // null
    mixedItems[2], // 20
    mixedItems[0], // 50
    mixedItems[3], // 100
  ]);
});

test("Query.orderBy descending with null and undefined values", () => {
  const result = Query.selectFrom(mixedItems).orderBy("price", "desc").execute();

  expect(result).toEqual([
    mixedItems[3], // 100
    mixedItems[0], // 50
    mixedItems[2], // 20
    mixedItems[1], // null
  ]);
});

test("Query.orderBy ascending with undefined field values", () => {
  const result = Query.selectFrom(mixedItems).orderBy("stock", "asc").execute();

  expect(result).toEqual([
    mixedItems[2], // undefined
    mixedItems[1], // 0
    mixedItems[3], // 5
    mixedItems[0], // 10
  ]);
});

test("Query.orderBy descending with undefined field values", () => {
  const result = Query.selectFrom(mixedItems).orderBy("stock", "desc").execute();

  expect(result).toEqual([
    mixedItems[0], // 10
    mixedItems[3], // 5
    mixedItems[1], // 0
    mixedItems[2], // undefined
  ]);
});

test("Query.orderBy ascending with boolean values", () => {
  const result = Query.selectFrom(mixedItems).orderBy("active", "asc").execute();

  expect(result).toEqual([
    mixedItems[1], // false
    mixedItems[3], // false
    mixedItems[0], // true
    mixedItems[2], // true
  ]);
});

test("Query.orderBy descending with boolean values", () => {
  const result = Query.selectFrom(mixedItems).orderBy("active", "desc").execute();

  expect(result).toEqual([
    mixedItems[0], // true
    mixedItems[2], // true
    mixedItems[1], // false
    mixedItems[3], // false
  ]);
});

test("Query.orderBy ascending with Date values", () => {
  const result = Query.selectFrom(mixedItems).orderBy("createdAt", "asc").execute();

  expect(result).toEqual([
    mixedItems[2], // null
    mixedItems[1], // 2022
    mixedItems[0], // 2023
    mixedItems[3], // 2024
  ]);
});

test("Query.orderBy descending with Date values", () => {
  const result = Query.selectFrom(mixedItems).orderBy("createdAt", "desc").execute();

  expect(result).toEqual([
    mixedItems[3], // 2024
    mixedItems[0], // 2023
    mixedItems[1], // 2022
    mixedItems[2], // null
  ]);
});
