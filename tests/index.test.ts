import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const items = [
  { name: "apple", price: 50, stock: 10 },
  { name: "banana", price: 20, stock: 0 },
  { name: "apricot", price: 120, stock: 5 },
  { name: "cherry", price: 30, stock: 15 },
];

test("Query.selectFrom creates a Query instance", () => {
  const query = Query.selectFrom(items);
  expect(query).toBeInstanceOf(Query);
});

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

test("Query.executeTakeFirst", () => {
  const result = Query.selectFrom(items).where("price", "<", 100).orderBy("name", "asc").executeTakeFirst();
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

const mixedItems = [
  {
    name: "apple",
    price: 50,
    stock: 10,
    active: true,
    createdAt: new Date("2023-01-01"),
  },
  {
    name: null,
    price: null,
    stock: 0,
    active: false,
    createdAt: new Date("2022-01-01"),
  },
  {
    name: "banana",
    price: 20,
    stock: undefined,
    active: true,
    createdAt: null,
  },
  {
    name: undefined,
    price: 100,
    stock: 5,
    active: false,
    createdAt: new Date("2024-01-01"),
  },
];

test("Query.where with null value using =", () => {
  const result = Query.selectFrom(mixedItems).where("name", "=", null).execute();
  expect(result).toEqual([
    {
      name: null,
      price: null,
      stock: 0,
      active: false,
      createdAt: new Date("2022-01-01"),
    },
  ]);
});

test("Query.where with undefined value using =", () => {
  const result = Query.selectFrom(mixedItems).where("name", "=", undefined).execute();
  expect(result).toEqual([
    {
      name: undefined,
      price: 100,
      stock: 5,
      active: false,
      createdAt: new Date("2024-01-01"),
    },
  ]);
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
