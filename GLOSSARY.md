# Query

An in-memory, SQL-flavoured query builder for filtering, sorting and paginating arrays of plain objects.

## Language

### Building a query

**Query**:
An immutable description of what to select from a Source: its Filters, Sort Criteria, Sort Transformers, Offset and Limit. Every builder step yields a new Query; nothing runs until Execution.
_Avoid_: QueryBuilder, statement

**Source**:
The array of Items a Query selects from. It is never mutated.
_Avoid_: table, collection, data

**Item**:
One object in the Source.
_Avoid_: row, record, entity, element

**Key**:
A named property of an Item that Filters test and Sort Criteria order by.
_Avoid_: column, field, property, attribute

### Filtering

**Filter**:
A single test an Item either passes or fails. An Item is in the Result only if it passes every Filter on the Query.
_Avoid_: spec, specification, predicate, filterFn, condition

**Operator**:
A short name (`=`, `<>`, `<`, `<=`, `>`, `>=`, `contains`, `startsWith`, `endsWith`, and `icontains`, `istartsWith`, `iendsWith`) that names a kind of Filter, used together with a Key and a value. A RegExp may take the place of an Operator and value.
_Avoid_: comparator, op

**Equality Filter**:
A Filter that passes when a Key's value is exactly (`=`) or is not (`<>`) the given value. Dates are equal when they denote the same instant, and Nullish Values can match.
_Avoid_: match, equals check

**Range Filter**:
A Filter that passes when a Key's value is below or above a bound (`<`, `<=`, `>`, `>=`). Nullish Values never pass.
_Avoid_: comparison, bound check

**Text Match Filter**:
A Filter that tests a Key's text value: against a literal value it must contain, start with or end with (`contains`, `startsWith`, `endsWith`; the `i` prefix ignores case), or against a RegExp. Non-text values never pass.
_Avoid_: string filter, search

**Compound Filter**:
A Filter built from other Filters with all-of, any-of or negation. Successive Filters on a Query combine as all-of.
_Avoid_: composite, combinator, group

### Ordering

**Sort Criterion**:
A Key plus a Direction (ascending or descending). A Query holds an ordered list of Sort Criteria; later ones only break ties left by earlier ones. Text is ordered case- and accent-sensitively.
_Avoid_: sort option, order clause

**Sort Transformer**:
A per-Key conversion applied to values only when comparing them for ordering. A Query holds one set of them, shared by all its Sort Criteria. Filters never see it.
_Avoid_: transformer, mapper, accessor

**Nullish Value**:
A Key whose value is `null` or `undefined`. Nullish Values sort before everything else in ascending order and never pass a Range or Text Match Filter.
_Avoid_: empty, missing

### Windowing

**Offset**:
How many of the sorted, filtered Items to skip before the Result starts. Defaults to 0.
_Avoid_: skip, start, page number

**Limit**:
The most Items the Result may hold, counted after the Offset. A Query with no Limit returns all remaining Items.
_Avoid_: take, page size, chunk

### Results

**Execution**:
Running a Query against its Source to produce a Result.
_Avoid_: run, evaluate

**Result**:
The Items an Execution returns, after filtering, sorting, Offset and Limit.
_Avoid_: output, rows

**First**:
The first Item of the Result, so it respects the Offset and Limit.
_Avoid_: head, top

**Not Found**:
The outcome when a Query that must yield one Item yields none.
_Avoid_: empty result error, missing item
