import { expect, test } from "vite-plus/test";
import { Query } from "../src";

test("Query.selectFrom creates a Query instance", () => {
  const items = [
    { name: "apple", price: 50, stock: 10 },
    { name: "banana", price: 20, stock: 0 },
    { name: "apricot", price: 120, stock: 5 },
    { name: "cherry", price: 30, stock: 15 },
  ];

  const query = Query.selectFrom(items);
  expect(query).toBeInstanceOf(Query);
});

test("Query does not mutate original array with where()", () => {
  const items = [
    { name: "apple", price: 50, stock: 10 },
    { name: "banana", price: 20, stock: 0 },
    { name: "apricot", price: 120, stock: 5 },
    { name: "cherry", price: 30, stock: 15 },
  ];
  const originalLength = items.length;
  const originalFirst = items[0];

  Query.selectFrom(items).where("price", "<", 100).execute();

  expect(items).toHaveLength(originalLength);
  expect(items[0]).toBe(originalFirst);
  expect(items).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "banana", price: 20, stock: 0 },
    { name: "apricot", price: 120, stock: 5 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});

test("Query does not mutate original array with orderBy()", () => {
  const items = [
    { name: "cherry", price: 30, stock: 15 },
    { name: "apple", price: 50, stock: 10 },
    { name: "banana", price: 20, stock: 0 },
    { name: "apricot", price: 120, stock: 5 },
  ];
  const originalLength = items.length;
  const originalFirst = items[0];

  Query.selectFrom(items).orderBy("name", "asc").execute();

  expect(items).toHaveLength(originalLength);
  expect(items[0]).toBe(originalFirst);
  expect(items[0].name).toBe("cherry");
});

test("Query does not mutate original array with chained operations", () => {
  const items = [
    { name: "cherry", price: 30, stock: 15 },
    { name: "apple", price: 50, stock: 10 },
    { name: "banana", price: 20, stock: 0 },
    { name: "apricot", price: 120, stock: 5 },
  ];
  const originalCopy = [...items];

  Query.selectFrom(items).where("price", "<", 100).orderBy("name", "asc").limit(2).execute();

  expect(items).toEqual(originalCopy);
});

test("Multiple Query instances from same array maintain independent state", () => {
  const items = [
    { name: "apple", price: 50 },
    { name: "banana", price: 20 },
    { name: "cherry", price: 30 },
  ];

  const query1 = Query.selectFrom(items).where("price", "<", 40);
  const query2 = Query.selectFrom(items).orderBy("name", "asc");

  const result1 = query1.execute();
  const result2 = query2.execute();

  expect(result1).toEqual([
    { name: "banana", price: 20 },
    { name: "cherry", price: 30 },
  ]);
  expect(result2).toEqual([
    { name: "apple", price: 50 },
    { name: "banana", price: 20 },
    { name: "cherry", price: 30 },
  ]);
  expect(items).toEqual([
    { name: "apple", price: 50 },
    { name: "banana", price: 20 },
    { name: "cherry", price: 30 },
  ]);
});

test("Query.selectFrom().execute() returns a different array reference", () => {
  const items = [
    { name: "apple", price: 50 },
    { name: "banana", price: 20 },
    { name: "cherry", price: 30 },
  ];

  const result = Query.selectFrom(items).execute();

  expect(result).not.toBe(items);
  expect(result).toEqual(items);
});
