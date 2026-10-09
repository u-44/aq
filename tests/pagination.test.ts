import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const items = [
  { name: "apple", price: 50, stock: 10 },
  { name: "banana", price: 20, stock: 0 },
  { name: "apricot", price: 120, stock: 5 },
  { name: "cherry", price: 30, stock: 15 },
];

test("Query.limit", () => {
  const result = Query.selectFrom(items).orderBy("name", "asc").limit(2).execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "apricot", price: 120, stock: 5 },
  ]);
});

test("Query.offset + limit", () => {
  const result = Query.selectFrom(items).orderBy("name", "asc").offset(2).limit(2).execute();
  expect(result).toEqual([
    { name: "banana", price: 20, stock: 0 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});

test("Query.offset without limit returns the rest", () => {
  const result = Query.selectFrom(items).orderBy("name", "asc").offset(3).execute();
  expect(result).toEqual([{ name: "cherry", price: 30, stock: 15 }]);
});

test("Query.limit(0) returns nothing", () => {
  expect(Query.selectFrom(items).limit(0).execute()).toEqual([]);
  expect(Query.selectFrom(items).where("price", "<", 100).limit(0).execute()).toEqual([]);
});

test("offset and limit replace earlier values", () => {
  const result = Query.selectFrom(items).offset(3).limit(1).offset(1).limit(2).execute();
  expect(result).toEqual([items[1], items[2]]);
});

test("offset/limit without orderBy window the filtered Items in Source order", () => {
  const query = Query.selectFrom(items).where("price", "<", 100);
  expect(query.limit(2).execute()).toEqual([items[0], items[1]]);
  expect(query.offset(2).limit(2).execute()).toEqual([items[3]]);
  expect(query.offset(4).limit(2).execute()).toEqual([]);
  expect(query.offset(1).execute()).toEqual([items[1], items[3]]);
});

test("offset/limit without filters or sorting return a slice of the Source", () => {
  expect(Query.selectFrom(items).offset(3).limit(3).execute()).toEqual([items[3]]);
});

test("offset and limit reject negative or non-integer counts", () => {
  const query = Query.selectFrom(items);
  expect(() => query.offset(-1)).toThrow(RangeError);
  expect(() => query.limit(1.5)).toThrow(RangeError);
  expect(() => query.limit(Number.NaN)).toThrow(RangeError);
});
