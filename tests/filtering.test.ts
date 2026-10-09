import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const items = [
  { name: "apple", price: 50, stock: 10 },
  { name: "banana", price: 20, stock: 0 },
  { name: "apricot", price: 120, stock: 5 },
  { name: "cherry", price: 30, stock: 15 },
];

test("Query.where with eb.fn predicate", () => {
  const result = Query.selectFrom(items)
    .where((eb) => eb.fn((item) => item.price < 100))
    .execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "banana", price: 20, stock: 0 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});

test("Query.where with key, op, value", () => {
  const result = Query.selectFrom(items).where("price", "<", 100).execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "banana", price: 20, stock: 0 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});

test("Query.where with = operator", () => {
  const result = Query.selectFrom(items).where("price", "=", 50).execute();
  expect(result).toEqual([{ name: "apple", price: 50, stock: 10 }]);
});

test("Query.where with <> operator", () => {
  const result = Query.selectFrom(items).where("price", "<>", 50).execute();
  expect(result).toEqual([
    { name: "banana", price: 20, stock: 0 },
    { name: "apricot", price: 120, stock: 5 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});

test("Query.where with contains operator", () => {
  const result = Query.selectFrom(items).where("name", "contains", "ap").execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "apricot", price: 120, stock: 5 },
  ]);
});

test("Query.where multiple filters", () => {
  const result = Query.selectFrom(items).where("price", "<", 100).where("stock", ">", 0).execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});
