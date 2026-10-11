import { expect, test } from "vite-plus/test";
import { Query } from "../src";

type Item = { name: string; price: number };

const items: Item[] = [
  { name: "apple", price: 50 },
  { name: "banana", price: 20 },
  { name: "apricot", price: 120 },
  { name: "cherry", price: 30 },
];

function* generate<T>(source: readonly T[]) {
  yield* source;
}

/** A bare Iterator: has next() but no Symbol.iterator. */
const bareIterator = <T>(source: readonly T[]): Iterator<T> => {
  let i = 0;
  return { next: () => (i < source.length ? { done: false, value: source[i++] } : { done: true, value: undefined }) };
};

function* naturals() {
  for (let i = 0; ; i++) yield { n: i };
}

test("selectFrom accepts a Set", () => {
  const result = Query.selectFrom(new Set(items)).where("price", "<", 100).orderBy("price").execute();
  expect(result.map((i) => i.name)).toEqual(["banana", "cherry", "apple"]);
});

test("selectFrom accepts a generator", () => {
  const result = Query.selectFrom(generate(items)).where("name", "startsWith", "ap").execute();
  expect(result.map((i) => i.name)).toEqual(["apple", "apricot"]);
});

test("selectFrom accepts Map.values()", () => {
  const map = new Map(items.map((i) => [i.name, i]));
  expect(Query.selectFrom(map.values()).orderBy("price", "desc").executeTakeFirst()).toEqual(items[2]);
});

test("selectFrom accepts a bare Iterator", () => {
  const result = Query.selectFrom(bareIterator(items)).offset(1).limit(2).execute();
  expect(result).toEqual([items[1], items[2]]);
});

test("execute without filters or sorting returns every Item of an iterable", () => {
  expect(Query.selectFrom(generate(items)).execute()).toEqual(items);
});

test("unsorted windowed execution stops reading an infinite iterable once the window is full", () => {
  const result = Query.selectFrom(naturals())
    .where((eb) => eb.fn((i) => i.n % 2 === 0))
    .offset(2)
    .limit(3)
    .execute();
  expect(result).toEqual([{ n: 4 }, { n: 6 }, { n: 8 }]);
  expect(Query.selectFrom(naturals()).limit(2).execute()).toEqual([{ n: 0 }, { n: 1 }]);
});

test("unsorted executeTakeFirst stops reading an infinite iterable at the first match", () => {
  expect(Query.selectFrom(naturals()).where("n", ">", 5).executeTakeFirst()).toEqual({ n: 6 });
  expect(Query.selectFrom(naturals()).executeTakeFirst()).toEqual({ n: 0 });
  expect(Query.selectFrom(naturals()).offset(3).executeTakeFirst()).toEqual({ n: 3 });
});

test("a re-iterable Source can be executed repeatedly", () => {
  const query = Query.selectFrom(new Set(items)).where("price", ">", 25);
  expect(query.execute()).toHaveLength(3);
  expect(query.execute()).toHaveLength(3);
});

test("a one-shot iterator is consumed by the first Execution", () => {
  const query = Query.selectFrom(generate(items));
  expect(query.execute()).toHaveLength(4);
  expect(query.execute()).toEqual([]);
});
