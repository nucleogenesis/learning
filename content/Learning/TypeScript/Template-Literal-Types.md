---
title: Template-Literal-Types
tags: [topic/typescript, topic/type-system, kind/concept]
lastUpdated: 2026-05-15
---
# Template literal types — strings in the type system

> **Convention**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

Three problems that all want the same trick — manipulating strings at the type level:

- **Type-safe event names**: an event emitter where `'user:login'` is a valid event and `'user:fnord'` is a compile error, and `emit('user:login', { ... })` knows the payload shape.
- **Type-safe object paths**: `get(user, 'profile.address.city')` infers a return type of `string`. Misspell `'profile.adres.city'` → compile error.
- **CSS-in-JS tagged types**: `color: '#FF00AA'` is OK; `color: '#GG00AA'` is a type error because `'G'` isn't a hex digit.
  - Before TS 4.1, these required either an enum, a manual union of literal strings (tedious and stale-prone), or a runtime cast (no compile-time safety). After 4.1, you can write the relationship in the type system: **the type of a string depends on its content**.
  - Template literal types are easily the most divisive of the advanced TS features. Used to **derive** type information from existing strings (event names, route paths), they're transformative. Used to **simulate** a string-processing language inside the type system, they make codebases unreadable. This page is about the first kind.

## A tiny worked example

```ts
type Greeting = `Hello, ${string}!`;

const a: Greeting = 'Hello, Alice!';     // ✅
const b: Greeting = 'Hi, Alice!';        // ❌ — wrong prefix
const c: Greeting = 'Hello, Alice';      // ❌ — missing exclamation
```

The backtick syntax mirrors JavaScript template literals, but at the type level. `${string}` is a placeholder that matches any string. Anything outside the placeholder is literal.

### Naming the parts as they come up

- **Template literal type** — a string-shaped type using backticks and `${...}` placeholders.
- **String literal type** — a specific string value as a type. `'red'` is a type; values must be exactly `'red'`.
- **Intrinsic string types** — `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize`. Built-in functions that transform string literal types.
- **Distribution** — like conditional types, template literal types distribute over unions. `${ 'a' | 'b' }-x` becomes `'a-x' | 'b-x'`.
  - For the full syntactic detail: [Handbook: Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html).

## Distribution — the cartesian product

```ts
type Direction = 'top' | 'bottom' | 'left' | 'right';
type Edge = `border-${Direction}`;
// = 'border-top' | 'border-bottom' | 'border-left' | 'border-right'

type Pair = `${'h' | 'v'}-${'a' | 'b'}`;
// = 'h-a' | 'h-b' | 'v-a' | 'v-b'   ← cartesian product
```

When a template literal type contains a union, it distributes. With multiple unions, you get the full cartesian product. This is what makes the pattern useful for combinatorial enumeration:

```ts
type Margin = `margin-${'top' | 'right' | 'bottom' | 'left'}`;
// 4 valid margin properties, named without typos
```

You could write these out by hand. The template-literal version updates automatically when you add a direction.

## Intrinsic string types

Four built-ins do string-case manipulation in the type system:

```ts
type A = Uppercase<'hello'>;       // 'HELLO'
type B = Lowercase<'HELLO'>;       // 'hello'
type C = Capitalize<'hello'>;      // 'Hello'
type D = Uncapitalize<'Hello'>;    // 'hello'
```

These are most useful in mapped-type key remapping to build getter/setter names:

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

The `string & K` is a small trick — `K` is `keyof T`, which is `string | number | symbol`, and template literal types need a string. Intersecting with `string` narrows.

## Pattern-matching strings with `infer`

Conditional types meet template literal types. You can pull pieces *out* of a string literal type:

```ts
// Extract the param name from a route path:
type ExtractParam<S> = S extends `:${infer P}` ? P : never;

type A = ExtractParam<':id'>;        // 'id'
type B = ExtractParam<'/users'>;     // never
type C = ExtractParam<':userId'>;    // 'userId'
```

The `infer P` captures whatever's after the colon. The pattern says "if S looks like `:something`, P is the something."

### Recursive splitting — parse a path into a tuple

```ts
type Split<S, D extends string> = S extends `${infer Head}${D}${infer Tail}`
  ? [Head, ...Split<Tail, D>]
  : [S];

type A = Split<'a.b.c.d', '.'>;   // ['a', 'b', 'c', 'd']
type B = Split<'foo', '.'>;       // ['foo']
```

The recursion bottoms out when the input doesn't contain the delimiter. Each step peels off the first segment.

This is the engine behind **type-safe object paths**:

```ts
type PathValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<T[K], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

type User = {
  profile: {
    address: {
      city: string;
      zip: string;
    };
  };
};

type A = PathValue<User, 'profile.address.city'>;   // string
type B = PathValue<User, 'profile.address.zip'>;    // string
type C = PathValue<User, 'profile.nope'>;           // never
```

The recursion: split on the first `.`, look up the head key in the object, recurse on the rest with the resulting type. This is the type machinery behind libraries like [react-hook-form](https://react-hook-form.com/) (`useFormContext().getValues('user.profile.name')` is fully typed) and [Lodash's typed `get`](https://github.com/lodash/lodash/issues/4506).

## Real-world patterns

### Type-safe event names

```ts
type Domain = 'user' | 'message' | 'order';
type Action = 'created' | 'updated' | 'deleted';

type EventName = `${Domain}:${Action}`;
// = 'user:created' | 'user:updated' | ... | 'order:deleted'
// (12 valid event names; misspellings fail at compile time)

type EventPayloads = {
  'user:created': { userId: string };
  'user:updated': { userId: string; changes: Partial<User> };
  // ... etc.
};

declare function emit<E extends keyof EventPayloads>(
  event: E,
  payload: EventPayloads[E]
): void;

emit('user:created', { userId: '42' });    // ✅
emit('user:foobar', { userId: '42' });     // ❌ — invalid event
emit('user:created', { foo: 'bar' });      // ❌ — wrong payload
```

The win: misspell `'user:created'` and the compiler points at the call site. Add a new event → update one place (the payload map) and every site that needs it gets a type-error or autocomplete update.

### CSS unit-tagged strings

```ts
type CSSUnit = 'px' | 'rem' | 'em' | '%' | 'vh' | 'vw';
type CSSValue = `${number}${CSSUnit}`;

const margin: CSSValue = '10px';     // ✅
const padding: CSSValue = '1.5rem';  // ✅
const garbage: CSSValue = '10';      // ❌ — no unit
const wrong: CSSValue = '10foo';     // ❌ — invalid unit
```

This kind of tagged-string typing shows up in styled-components, Emotion, and CSS-in-JS systems. Whether you want this level of strictness depends on your tolerance for autocomplete benefits vs. ergonomic cost — it's *very* opinionated about what counts as a valid value.

### Route parameter extraction

```ts
type ExtractParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never;

type A = ExtractParams<'/users/:id'>;                       // 'id'
type B = ExtractParams<'/users/:id/posts/:postId'>;         // 'id' | 'postId'

type RouteParams<Path extends string> = {
  [K in ExtractParams<Path>]: string;
};

type UserPostParams = RouteParams<'/users/:id/posts/:postId'>;
// = { id: string; postId: string }
```

This is the heart of typed routers — Express-like APIs where the path string drives the params object's type. Notably used by [Hono](https://hono.dev/), [tRPC](https://trpc.io/), and TypeScript-flavored Express wrappers.

## When NOT to reach for template literal types

Three signs you're misusing the feature:

- **You're encoding business logic in strings.** "The first three chars are the country code, then a dash, then the user ID, then..." → use a branded type or a structured object, not a string format. The type system can verify the *shape*; it shouldn't be your parser.
- **You're recursing more than 2-3 levels deep.** Type recursion has limits (~50 by default), and the editor latency degrades sharply. If you need a regex-class operation, it doesn't belong in the type system.
- **Your error messages become incomprehensible.** Template literal type errors can produce 500-line single-line errors that say `Type '"foo"' is not assignable to type 'never'`. If that's happening, simplify.
  - The discipline: template literal types are great for **deriving small structured information from string-shaped inputs** (event names, paths, units). They're a bad fit for **string parsing as a general technique**.

## 🔍 Quick check (try before scrolling)

- **Q1**: What's the type of `type T = \`${'a' | 'b'}-${'x' | 'y'}\``?
- Show answer to Q1
  - `'a-x' | 'a-y' | 'b-x' | 'b-y'`. Cartesian product distribution — the union on the left side combines with the union on the right side. Each placeholder distributes independently, and the results are unioned.
  - **Q2**: Write `RemovePrefix<S, P>` that strips a prefix from a string literal type if present, otherwise returns `S` unchanged. So `RemovePrefix<'on_click', 'on_'>` is `'click'`, and `RemovePrefix<'hover', 'on_'>` is `'hover'`.
- Show answer to Q2

```ts

type RemovePrefix<S, P extends string> = S extends `${P}${infer Rest}` ? Rest : S;

```
  - The pattern `${P}${infer Rest}` matches "P followed by something." When it matches, `Rest` is the part after P. When it doesn't, fall through to the unchanged `S`.

**Q3**: Why is this `never`?

```ts
type Year = `20${0 | 1 | 2}${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;
type ValidYear = Year & '2020';
type Bad = Year & '1999';
```

- Show answer to Q3
  - `ValidYear` is `'2020'`. `Bad` is `never`. Reason: `Year` distributes to all valid year strings (`'2000'`, `'2001'`, ..., `'2299'`). Intersecting with `'1999'` finds no overlap → `never`. The intersection of two literal types is the empty type unless one is assignable to the other. This is a useful pattern for *validating* a string at compile time: if `Year & yourString` is `never`, the year is invalid.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: build typed getters from an object type

#### Worked example (read)

```ts
type Person = { name: string; age: number; email: string };

type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type PersonGetters = Getters<Person>;
// = {
//     getName: () => string;
//     getAge: () => number;
//     getEmail: () => string;
//   }
```

The trick is the `Capitalize<string & K>` — capitalize the key after coercing to string. Without `string & K`, TS complains because `K` is `string | number | symbol` and template literals don't accept `symbol`.

#### Faded — fill in the blanks

Build a `Setters<T>` type that produces `setName(v: string): void`, `setAge(v: number): void`, etc.

```ts
type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (v: _____) => void;
};
```

- Show the answer

```ts

- type Setters<T> = {
- [K in keyof T as `set${Capitalize<string & K>}`]: (v: T[K]) => void;
- };

```
  - `T[K]` is the original property's type — that's what the setter takes. Composing `Getters<T> & Setters<T>` gives you a `Person`-shaped accessor object.

#### From scratch

Implement `Join<T extends string[], D extends string>` — given a tuple of strings and a delimiter, produce the joined string at the type level. `Join<['a', 'b', 'c'], '-'>` should be `'a-b-c'`. Hint: recursive pattern matching on tuples, using `[infer Head, ...infer Tail]`.

### Worked → faded → blank: a typed `get` function

#### Worked example (read)

```ts
type PathValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<T[K], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

declare function get<T, P extends string>(obj: T, path: P): PathValue<T, P>;

const user = { profile: { name: 'A', age: 30 } };
const name = get(user, 'profile.name');   // string
const age = get(user, 'profile.age');     // number
const bad = get(user, 'profile.nope');    // never
```

The runtime implementation is just splitting on `.` and walking the object. The compile-time work is in `PathValue`. The combination gives a type-safe `get` with deep paths.

#### Faded — fill in the blanks

Implement `PathsOf<T>` — given an object type, produce a union of all valid dotted paths. For `{ a: { b: { c: number } } }`, the result should be `'a' | 'a.b' | 'a.b.c'`.

```ts
type PathsOf<T, P extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? P extends ''
          ? K | PathsOf<T[K], K>
          : `${P}.${K}` | PathsOf<T[K], `${P}.${K}`>
        : never;
    }[_______________]
  : never;
```

- Show the answer

```ts

- type PathsOf<T, P extends string = ''> = T extends object
- ? {
- [K in keyof T]: K extends string
- ? P extends ''
- ? K | PathsOf<T[K], K>
- : `${P}.${K}` | PathsOf<T[K], `${P}.${K}`>
- : never;
- }[keyof T]
- : never;

```
  - The `[keyof T]` at the end is the "collect all values" trick — indexing a mapped type by all its keys gives you a union of its values. The recursion accumulates the path as it descends.

### Debug-this

```ts
type Field = 'name' | 'age' | 'email';
type Handler = `on${Field}`;
```

What's the type of `Handler`? What did the author probably want?

- Show the bug
  - `Handler` is `'onname' | 'onage' | 'onemail'`. The author probably wanted `'onName' | 'onAge' | 'onEmail'` (camelCase). Fix: use `Capitalize<Field>` in the template: `\`on${Capitalize<Field>}\``. Without explicit capitalization, the literal strings stay lowercased. A common slip — TS doesn't auto-capitalize for you.

### Teach-it-back

Without notes, in ~5 sentences:

> *"A teammate is using string union types for event names: `type Event = 'user:created' | 'user:updated' | 'user:deleted' | 'message:sent' | ...`. The list has 30 entries and they have to update it manually when adding actions. Explain how template literal types can derive this list from a `Domain` union and an `Action` union, what they gain, and where this pattern would stop being worth it."*

If you can't, the "deriving instead of enumerating" framing didn't stick.

---

## 🎴 Flashcards (for daily review, not the first read)

- What's a **template literal type**? #card #ts/template-literals
  - A string-shaped type using backticks and `${...}` placeholders. Acts like a JS template literal but at the type level. Used to compose string literal types and match them with `infer`.
- {{cloze Template literal types **distribute** over unions, producing the **cartesian product** when there are multiple union placeholders.}} #card #ts/template-literals
- Four intrinsic string types? #card #ts/template-literals
  - `Uppercase<S>`, `Lowercase<S>`, `Capitalize<S>`, `Uncapitalize<S>`. Built-in case-manipulation at the type level. Common use: key remapping in mapped types to produce getter/setter names.
- Why does `Capitalize<string & K>` show up when remapping keys? #card #ts/template-literals
  - `K` is `keyof T` which is `string | number | symbol`. Template literals don't accept `symbol` directly. Intersecting with `string` narrows to just string keys, satisfying the constraint.
- How do you extract a substring with `infer`? #card #ts/template-literals #infer

```ts

type ExtractParam<S> = S extends `:${infer P}` ? P : never;

```
  - The `infer P` captures whatever fills the placeholder in the pattern. Used to pull route params, prefixes, suffixes, segments.

- Write `Split<S, D>` to split a string literal type by a delimiter. #card #ts/template-literals
  - ```ts
    type Split<S, D extends string> = S extends `${infer Head}${D}${infer Tail}`
      ? [Head, ...Split<Tail, D>]
      : [S];
    ```

Recursive. The base case is "no more delimiter," wrapping the leftover in a single-element tuple.

- One real-world use case for template literal types beyond event names? #card #ts/template-literals
  - **Type-safe object paths** (`get(user, 'profile.name')` infers `string`). Or route parameter extraction (`/users/:id` → params have `id`). Both are about deriving structured information from a string shape.
- Sign you should NOT reach for template literal types? #card #ts/template-literals
  - You're using them to *parse* a string with non-trivial syntax (regex-class operations, deep nesting, error-prone format). The type system is the wrong tool for general string parsing — performance and readability tank.
- How do template literal types interact with conditional types? #card #ts/template-literals
  - They compose naturally. The conditional's `extends` clause can include a template literal pattern with `infer` to pattern-match the string. This is how `ExtractParam`, `Split`, `PathValue` all work.
- {{cloze The expression `Type & 'specific-string'` evaluates to **never** when `'specific-string'` doesn't match any member of the template type — useful for compile-time validation.}} #card #ts/template-literals
- Why might a long template-literal-typed identifier produce slow editor responses? #card #ts/template-literals
  - The TS server evaluates the template type lazily, but inference and "go to type" actions force evaluation. Deep recursion or large unions produce exponential type sizes. Symptom: typing in the file becomes laggy; `tsc` build time grows.

---

## ✅ Self-check before moving on

Can I read `\`${'a' | 'b'}-${'x' | 'y'}\`` and predict the result is the 4-way cartesian product?

Can I write `Split`, `Join`, and `RemovePrefix` from scratch using `infer`?

Can I explain when template literal types stop being worth it (string parsing as a feature)?

Can I describe one real library that leans on this pattern (react-hook-form's paths, Hono's routes, tRPC's procedures)?

If any "no", do one practice exercise above. If all "yes", move to [[Learning/TypeScript/Branded-Types]].

## 🔗 Related

Up: [[Learning/TypeScript]]

Prev: [[Learning/TypeScript/Mapped-Types]]

Next: [[Learning/TypeScript/Branded-Types]]

Related: [[Learning/TypeScript/Conditional-Types]] (the `infer` keyword), [[Learning/TypeScript/Mapped-Types]] (key remapping uses templates)

Practice problems: [[Learning/TypeScript/Exercises]]
