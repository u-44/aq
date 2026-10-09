import { expect, test } from "vite-plus/test";
import { Query } from "../src";

test("Type checks for Query.where with null and undefined", () => {
  const items = [
    { name: "apple", price: 50, stock: 10, createdAt: new Date() },
    { name: null, price: null, stock: 0, createdAt: null },
    { name: undefined, price: 100, stock: 5, createdAt: undefined },
  ];

  const query = Query.selectFrom(items);

  // ✅ Correct usage with null and undefined
  query.where("name", "=", null);
  query.where("name", "<>", undefined);
  query.where("createdAt", "=", new Date());
  query.where("createdAt", ">", new Date());

  // @ts-expect-error invalid key
  query.where("unknownKey", "=", null);

  // @ts-expect-error invalid operator
  expect(() => query.where("price", "approx", 50)).toThrow();

  // @ts-expect-error like / ilike were removed; use the text operators or a RegExp
  expect(() => query.where("name", "like", "%a%")).toThrow(TypeError);

  // @ts-expect-error invalid value type
  query.where("stock", "=", "ten");

  // @ts-expect-error invalid value type
  query.where("stock", "=", undefined);

  // @ts-expect-error text operators require a string
  expect(() => query.where("name", "contains", undefined)).toThrow();
});

test("Type checks for the expression builder with null, undefined, Date", () => {
  const items = [
    { name: "apple", price: 50, stock: 10, createdAt: new Date() },
    { name: null, price: null, stock: 0, createdAt: null },
  ];
  const query = Query.selectFrom(items);

  // ✅ Correct usage
  query.where((eb) => eb("name", "=", null));
  query.where((eb) => eb("price", "<>", null));
  query.where((eb) => eb.and([eb("createdAt", "=", new Date()), eb("createdAt", "<", new Date())]));
  query.where((eb) => eb.fn((item) => item.stock > 0));

  // @ts-expect-error invalid value type
  query.where((eb) => eb("name", "=", 123));

  // @ts-expect-error invalid key
  query.where((eb) => eb("unknown", "<>", null));

  // @ts-expect-error range operator expects the key's type
  query.where((eb) => eb("name", "<", new Date()));

  // @ts-expect-error and/or take a list of Filters
  query.where((eb) => eb.and(eb("name", "=", null)));

  // @ts-expect-error raw predicates must be wrapped with eb.fn
  query.where((eb) => eb.and([(item) => item.stock > 0]));
});

test("Type checks for orderBy", () => {
  const items = [{ name: "apple", price: 50 }];
  const query = Query.selectFrom(items);

  // ✅ Valid keys
  query.orderBy("name", "asc");
  query.orderBy("price", "desc");

  // @ts-expect-error
  query.orderBy("unknownKey", "asc");

  // @ts-expect-error
  query.orderBy("price", "upwards");
});

test("Type checks for offset and limit methods", () => {
  const items = [{ name: "apple" }];
  const query = Query.selectFrom(items);

  // ✅ Valid
  query.offset(0).limit(10);

  // @ts-expect-error
  expect(() => query.offset("first")).toThrow(RangeError);

  // @ts-expect-error
  expect(() => query.limit("ten")).toThrow(RangeError);
});

test("Type checks for orderBy and orderOptions", () => {
  const items = [{ name: "apple", createdAt: "2025-01-01" }];
  const query = Query.selectFrom(items);

  // ✅ Valid
  query.orderBy("createdAt").orderOptions({ createdAt: Date.parse });

  // @ts-expect-error orderBy no longer takes transformers
  query.orderBy("createdAt", "asc", { createdAt: Date.parse });

  // @ts-expect-error
  query.orderOptions({ unknownKey: Date.parse });
});
