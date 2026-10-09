import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const items = [
  { name: "apple", price: 50, stock: 10 },
  { name: "banana", price: 20, stock: 0 },
  { name: "apricot", price: 120, stock: 5 },
  { name: "cherry", price: 30, stock: 15 },
];

test("Query.orderBy ascending", () => {
  const result = Query.selectFrom(items).orderBy("name", "asc").execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "apricot", price: 120, stock: 5 },
    { name: "banana", price: 20, stock: 0 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});

test("Query.orderBy descending", () => {
  const result = Query.selectFrom(items).orderBy("price", "desc").execute();
  expect(result).toEqual([
    { name: "apricot", price: 120, stock: 5 },
    { name: "apple", price: 50, stock: 10 },
    { name: "cherry", price: 30, stock: 15 },
    { name: "banana", price: 20, stock: 0 },
  ]);
});

test("Query.orderBy supports chained criteria calls", () => {
  const data = [
    { name: "alpha", price: 10 },
    { name: "beta", price: 10 },
    { name: "gamma", price: 5 },
  ];

  const result = Query.selectFrom(data).orderBy("price", "asc").orderBy("name", "desc").execute();

  expect(result).toEqual([
    { name: "gamma", price: 5 },
    { name: "beta", price: 10 },
    { name: "alpha", price: 10 },
  ]);
});

test("Query.orderOptions applies Sort Transformers across criteria", () => {
  const data = [
    { name: "Z", createdAt: "2025-01-01" },
    { name: "a", createdAt: "1990-01-01" },
  ];

  const result = Query.selectFrom(data)
    .orderBy("createdAt", "asc")
    .orderBy("name", "asc")
    .orderOptions({ createdAt: Date.parse })
    .execute();

  expect(result).toEqual([
    { name: "a", createdAt: "1990-01-01" },
    { name: "Z", createdAt: "2025-01-01" },
  ]);
});

test("orderBy string uses variant (case- and accent-sensitive) comparison", () => {
  const data = [{ name: "a" }, { name: "A" }, { name: "á" }, { name: "b" }];

  const result = Query.selectFrom(data).orderBy("name", "asc").execute();

  // Variant sensitivity means:
  // - case matters: "A" ≠ "a"
  // - accents matter: "a" ≠ "á"
  expect(result).toEqual([{ name: "a" }, { name: "A" }, { name: "á" }, { name: "b" }]);
});

test("Query.orderOptions replaces earlier transformers", () => {
  const data = [{ n: "10" }, { n: "9" }];
  const query = Query.selectFrom(data).orderBy("n").orderOptions({ n: Number });

  expect(query.execute()).toEqual([{ n: "9" }, { n: "10" }]);
  expect(query.orderOptions({}).execute()).toEqual([{ n: "10" }, { n: "9" }]);
});
