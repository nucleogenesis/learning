---
title: Conditional-Types
tags: [topic/typescript, topic/type-system, kind/concept]
lastUpdated: 2026-05-15
---
# Conditional types — `T extends U ? X : Y`

> **Convention**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

Three problems that look unrelated, all solved by the same feature:

You have a function that *might* be async. `wait(): void` and `fetch(): Promise<User>`. You want a generic helper that "awaits the result if it's a Promise, otherwise just uses it." How do you write the return type?

A REST client. `get('/users/:id')` should infer that the response is `User`. `get('/posts')` should infer `Post[]`. The path is a literal string; the response type depends on it.

A form library. Each field has a different value type. The submit handler should get a typed object where the field name maps to its value type. **The shape of the output depends on the shape of the input** — that dependency is a relationship the type system needs to express.

All three need types that **react** to other types. That's what conditional types are: `T extends U ? X : Y` is the type-level `if`. Pair it with `infer` (pull a sub-type out) and you've got most of the heavy lifting behind libraries like Drizzle, tRPC, React Query, and Zod's inferred types.

These features are also where TS goes from "documentation that compiles" to "small programs that run in the type system." Used in moderation, they pay enormous dividends. Used everywhere, they tank your build time and turn your codebase into puzzle-box territory.

## A tiny worked example

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>;   // true
type B = IsString<42>;        // false
type C = IsString<string>;    // true
type D = IsString<string | number>;   // boolean   ← surprising
```

The first three are intuitive: `'hello'` extends `string`, `42` doesn't, `string` extends itself. The fourth is the first surprise of conditional types: **distribution over unions**.

### Naming the parts as they come up

- **Conditional type**: a type expression of the form `T extends U ? X : Y`. Type-level ternary.
- **`extends` here means "is assignable to"** — not OOP inheritance. `'hello' extends string` is true because `'hello'` is assignable to `string`.
- **Distributive conditional type**: when the type being tested (`T`) is a naked generic type parameter, the conditional distributes over each member of a union. `(A | B) extends X ? Y : Z` becomes `(A extends X ? Y : Z) | (B extends X ? Y : Z)`.
- **`infer`**: a keyword that introduces a new type variable inside the `extends` clause. Used to extract sub-types: `T extends Promise<infer U> ? U : never` extracts the wrapped type.
  - For the full syntactic detail: [Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html).

## Distribution — the surprising default

```ts
type IsString<T> = T extends string ? true : false;
type D = IsString<string | number>;
// Distributes:
//   IsString<string> | IsString<number>
//   = (string extends string ? true : false) | (number extends string ? true : false)
//   = true | false
//   = boolean
```

Distribution is **the most important conditional-type behavior to internalize**. It's why `Exclude<'a' | 'b' | 'c', 'b'>` gives `'a' | 'c'` instead of `never`:

```ts
type Exclude<T, U> = T extends U ? never : T;
// Distributes over T:
//   ('a' | 'b' | 'c') extends 'b' ? never : ('a' | 'b' | 'c')   ← what you'd think
//   becomes:
//   ('a' extends 'b' ? never : 'a')
//   | ('b' extends 'b' ? never : 'b')
//   | ('c' extends 'b' ? never : 'c')
//   = 'a' | never | 'c'
//   = 'a' | 'c'                       ← never is the identity of unions
```

Distribution is what makes the built-in `Exclude`, `Extract`, and `NonNullable` work. **It only happens when the checked type is a naked generic parameter**, which is to say `T extends U ?`, not `[T] extends [U] ?` and not `{ x: T } extends { x: U } ?`.

### Opting out of distribution with `[T] extends [U]`

Sometimes you want to test the whole union, not member-by-member. Wrap in single-element tuples:

```ts
type IsExactlyString<T> = [T] extends [string] ? true : false;

type E = IsExactlyString<string | number>;   // false  ← no distribution
type F = IsExactlyString<string>;             // true
```

The tuple wrapping defeats distribution by making `T` non-naked. Now `[string | number] extends [string]` is asked as one question (and the answer is no, because `number` isn't a `string`).

When to opt out: when you're asking a question about the whole type, not about each member. A common case: checking whether a type is exactly `never`.

```ts
// Distributes over T — so IsNever<never> distributes over zero members → never (vacuous):
type IsNever_Wrong<T> = T extends never ? true : false;
type W = IsNever_Wrong<never>;   // never  ← oops, not true

// Non-distributive — works:
type IsNever<T> = [T] extends [never] ? true : false;
type X = IsNever<never>;   // true
type Y = IsNever<string>;  // false
```

`never` is the empty union. Distribution over zero members produces zero terms — which collapses back to `never`. This trap catches everyone the first time.

## The `infer` keyword — extracting type pieces

`infer` is the conditional-type version of "destructure but for types." It says "introduce a new type variable here and let TS figure out what it is."

```ts
// Extract the return type of a function:
type ReturnType<F> = F extends (...args: any[]) => infer R ? R : never;

type A = ReturnType<() => string>;            // string
type B = ReturnType<(x: number) => boolean>;  // boolean
type C = ReturnType<string>;                  // never (string isn't a function)

// Extract the element type of an array:
type ElementOf<T> = T extends (infer E)[] ? E : never;

type D = ElementOf<number[]>;       // number
type E = ElementOf<string[]>;       // string
type F = ElementOf<[1, 2, 3]>;      // 1 | 2 | 3

// Extract the resolved type of a Promise:
type Unpromise<T> = T extends Promise<infer U> ? U : T;

type G = Unpromise<Promise<User>>;  // User
type H = Unpromise<number>;          // number (already not a Promise)
```

The pattern: `T extends [some shape with infer X somewhere] ? X : fallback`. The `infer` declares what you want to extract; the rest of the pattern describes the shape you expect.

`infer` can extract function parameters, array element types, Promise values, tuple elements, the keys of objects, generic type parameters from other types — basically anywhere a type variable could be, you can ask `infer` to pull it out.

## The built-in conditional utility types — your daily drivers

You'll almost never write `ReturnType` from scratch in real code — TS ships with it. Same for these workhorses:

```ts
// From a function type, get its return type:
type R = ReturnType<typeof fetch>;  // Promise<Response>

// From a function type, get its parameter tuple:
type P = Parameters<typeof fetch>;  // [input: RequestInfo, init?: RequestInit | undefined]

// Unwrap arbitrarily-nested Promises (handles thenable chains):
type A = Awaited<Promise<Promise<string>>>;   // string

// Filter a union — keep members assignable to U:
type Strings = Extract<string | number | boolean, string>;   // string

// Filter a union — remove members assignable to U:
type NonStrings = Exclude<string | number | boolean, string>;   // number | boolean

// Remove null and undefined from a union:
type NN = NonNullable<string | null | undefined>;   // string
```

A real-world pattern: derive the return type of a function you don't control, without naming it twice.

```ts
function createUser(input: CreateUserInput) {
  return { id: '42', name: input.name, createdAt: new Date() };
}

type User = ReturnType<typeof createUser>;
// User = { id: string; name: string; createdAt: Date }
```

If `createUser`'s return shape changes, `User` updates automatically. No drift between the function and the type. This pattern is everywhere in modern TS codebases — Drizzle's `InferModel`, tRPC's `inferRouterOutputs`, Zod's `z.infer`, and your own `typeof` + `ReturnType` are all variants of the same idea: **let the type system derive types from values, not the other way around.**

## Real-world patterns

### Awaitable helper

```ts
async function awaitIfPromise<T>(value: T): Promise<Awaited<T>> {
  return await value;
}

const a = await awaitIfPromise(42);                 // a: number
const b = await awaitIfPromise(Promise.resolve(42)); // b: number
```

`Awaited<T>` handles the "T might or might not be a Promise" case. It also handles nested promises (`Promise<Promise<T>>` → `T`), thenables, and the historical edge cases that used to require hand-rolling.

### Type-safe event emitter

```ts
type Events = {
  'user:login': { userId: string };
  'user:logout': { userId: string };
  'message:sent': { to: string; body: string };
};

type EventName = keyof Events;
type EventPayload<E extends EventName> = Events[E];

declare function emit<E extends EventName>(event: E, payload: EventPayload<E>): void;

emit('user:login', { userId: '42' });                 // ✅
emit('user:login', { to: 'bob' });                     // ❌ wrong payload shape
emit('user:foobar', { userId: '42' });                 // ❌ unknown event
```

The leverage: one source of truth (the `Events` map), and `emit`/`on` everywhere in the codebase get full type safety from it. The conditional-types story behind this is the indexed access `Events[E]` — strictly a feature of mapped types and generics, but conditional types appear when you start adding things like "is this event a `user:*` event?" Pre-RxJS / tRPC, this pattern was rare; today it's standard.

### Discriminated extraction

```ts
type Action =
  | { type: 'INCREMENT'; by: number }
  | { type: 'DECREMENT'; by: number }
  | { type: 'RESET' };

type ActionByType<T extends Action['type']> = Extract<Action, { type: T }>;

type IncAction = ActionByType<'INCREMENT'>;   // { type: 'INCREMENT'; by: number }
type ResetAction = ActionByType<'RESET'>;     // { type: 'RESET' }
```

`Extract<Action, { type: T }>` keeps only the union members assignable to `{ type: T }`. Useful for Redux-style action types, server-event types, message-types-over-WebSockets — anywhere you've got a discriminated union and you want to talk about one variant by its tag.

## Costs and when not to reach for conditional types

Conditional types are powerful enough to make a codebase incomprehensible. The signs you've gone too far:

Type errors that take 10 minutes to read. The reported type is 200 lines of nested conditionals.

The `tsc --noEmit` time goes from 3s to 60s after you added one "clever" utility type.

New contributors avoid touching anything near the type definitions.

The discipline: conditional types belong in **utility libraries and at API boundaries**, not sprinkled through application code. If you're writing a conditional type to model a domain entity, you've probably picked the wrong tool — a discriminated union or a few overloaded function signatures is usually clearer.

Default rule: reach for conditional types when you're transforming an existing type (`ReturnType`, `Awaited`, the inferred output of a parser) or when you're building a library helper. Reach for discriminated unions for domain modeling.

## 🔍 Quick check (try before scrolling)

- **Q1**: What does this evaluate to?

```ts
type T = ('a' | 'b' | 'c') extends 'a' | 'b' ? 'yes' : 'no';
```

- Show answer to Q1
  - `'no' | 'yes'`. Distribution over the union: each member is tested individually. `'a' extends 'a' | 'b'` is `'yes'`; `'b' extends 'a' | 'b'` is `'yes'`; `'c' extends 'a' | 'b'` is `'no'`. Union of those is `'yes' | 'no'`. If you wanted "does the whole union extend?", wrap in tuples: `[('a'|'b'|'c')] extends ['a'|'b']` → `'no'` because `'c'` doesn't fit.
  - **Q2**: Write a conditional type `Flatten<T>` that takes `T[]` and returns `T`, but if `T` is not an array, returns `T` unchanged. So `Flatten<number[]>` is `number`, and `Flatten<string>` is `string`.
- Show answer to Q2

```ts

type Flatten<T> = T extends (infer U)[] ? U : T;

```
  - The `infer U` extracts the element type when `T` matches the array shape. The `else` branch passes the type through unchanged. This is a one-level flatten — for deep flattening you'd recurse.

**Q3**: Why does `IsNever<T> = T extends never ? true : false` give `never` when called with `never`, instead of `true`?

- Show answer to Q3
  - The distribution rule says: when the checked type is a naked type parameter and the input is a union, distribute. `never` is the **empty union** — the union of zero types. Distribution over zero terms produces a union of zero results, which is `never`. So `IsNever<never>` distributes over nothing and returns `never`, not `true`.
  - Fix: wrap in tuples to defeat distribution. `[T] extends [never] ? true : false`. Now we're testing "is the single-element tuple `[never]` assignable to `[never]`?" — which is one question with answer yes.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: extract types from a record of functions

#### Worked example (read)

You have an API client:

```ts
const api = {
  getUser: (id: string) => Promise.resolve({ id, name: 'A' }),
  getPosts: (userId: string) => Promise.resolve([{ id: '1' }, { id: '2' }]),
};

// Extract the resolved response type of each endpoint:
type ApiResponses = {
  [K in keyof typeof api]: Awaited<ReturnType<typeof api[K]>>;
};
// ApiResponses = {
//   getUser: { id: string; name: string };
//   getPosts: { id: string }[];
// }
```

The mapped type iterates the keys; for each, `ReturnType` plucks the function's return type (a Promise); `Awaited` unwraps it. Zero manual typing of response shapes — they're derived from the implementations.

#### Faded — fill in the blanks

Implement `FirstParameter<F>` that extracts the type of the first parameter of a function, or `never` if the function takes no parameters:

```ts
type FirstParameter<F> = F extends (first: _____, ...rest: any[]) => any ? _____ : never;
```

- Show the answer

```ts

type FirstParameter<F> = F extends (first: infer P, ...rest: any[]) => any ? P : never;

```
  - The `infer P` pulls out the first parameter type. `...rest: any[]` swallows any remaining parameters. The whole pattern says: "if `F` is a function with at least one parameter, extract the first; otherwise `never`."

#### From scratch

Implement `Curry<F>` — given a function type `(a: A, b: B, c: C) => R`, produce its curried form `(a: A) => (b: B) => (c: C) => R`. Hint: you'll need recursive conditional types and tuple manipulation. This is medium difficulty on [type-challenges](https://github.com/type-challenges/type-challenges).

### Worked → faded → blank: a typed event emitter

#### Worked example (read)

```ts
type Events = {
  'message': { text: string };
  'user:joined': { userId: string };
};

type Listener<E extends keyof Events> = (payload: Events[E]) => void;

class Emitter {
  private listeners: { [E in keyof Events]?: Listener<E>[] } = {};

  on<E extends keyof Events>(event: E, listener: Listener<E>): void {
    (this.listeners[event] ??= []).push(listener as any);
  }

  emit<E extends keyof Events>(event: E, payload: Events[E]): void {
    this.listeners[event]?.forEach(l => l(payload));
  }
}

const e = new Emitter();
e.on('message', p => console.log(p.text));   // p inferred as { text: string }
e.emit('user:joined', { userId: '42' });      // payload checked
```

The single `as any` cast is unfortunately unavoidable — the listener array is `Listener<E>[]` for the specific `E`, but stored in a record keyed by general `keyof Events`. The cast is contained inside the class; users get full safety.

#### Faded — fill in the blanks

Add a `once<E>` method that auto-removes the listener after the first call:

```ts
once<E extends keyof Events>(event: E, listener: Listener<E>): void {
  const wrapper: _________ = (payload) => {
    // FILL: invoke the listener, then remove the wrapper
    ____________________
    ____________________
  };
  this.on(event, wrapper);
}

private off<E extends keyof Events>(event: E, listener: Listener<E>): void {
  // FILL: remove the listener from the array
  this.listeners[event] = this.listeners[event]?.filter(l => l !== listener) as any;
}
```

- Show the answer

```ts

- const wrapper: Listener<E> = (payload) => {
- listener(payload);
- this.off(event, wrapper);
- };

```
  - The closure captures `event` and `wrapper` to enable self-removal. The `Listener<E>` type comes from the generic `E`, so payload is correctly typed inside the wrapper.

### Debug-this

```ts
type ExtractUserActions<T> = T extends { user: any } ? T : never;

type Action =
  | { type: 'login'; user: { id: string } }
  | { type: 'logout'; user: { id: string } }
  | { type: 'page_view'; url: string };

type UserActions = ExtractUserActions<Action>;
// What's the type? What did the author expect?
```

- Show the bug
  - The type is `{ type: 'login'; user: { id: string } } | { type: 'logout'; user: { id: string } }`. Which... is probably what the author wanted! So actually this works.
  - The subtle bug shows up if you change the test: `ExtractUserActions<Action[number]>` where `Action[number]` would be needed only if `Action` were an array — but here `Action` is already a union, so this is fine. Distribution kicks in correctly because `T` is a naked parameter and `Action` is a union.
  - **The real bug**: if you wrote `type X = ExtractUserActions<Action | string>`, you'd expect `string` to be excluded — but the conditional `T extends { user: any }` distributes, and `'string' extends { user: any }` is false, so `string` falls into the `never` branch. That's correct. So this snippet, despite looking error-prone, is actually OK. **The pedagogical point**: most "distribution bugs" come from a misunderstanding of what distribution does. Trace through case-by-case before suspecting the type system.

### Teach-it-back

Without notes, in ~5 sentences:

> *"A teammate writes `type IsAny<T> = T extends any ? 'yes' : 'no'` to check if a value is `any`. Explain why this doesn't work, what it actually evaluates to, and how you'd write a correct `IsAny<T>`."*

(Hint: `T extends any` is always true; the trick is that `any` distributes through unions in a way other types don't.) If you can't, the distribution discussion didn't fully click.

---

## 🎴 Flashcards (for daily review, not the first read)

- What's a **conditional type**? #card #ts/conditional-types
  - `T extends U ? X : Y` — a type-level ternary. Evaluates to `X` if `T` is assignable to `U`, otherwise `Y`. The `extends` here means "is assignable to," not OOP inheritance.
- {{cloze A conditional type **distributes** over a union when the checked type is a **naked** type parameter.}} #card #ts/conditional-types
- How does `Exclude<'a' | 'b' | 'c', 'b'>` give `'a' | 'c'`? #card #ts/conditional-types
  - Distribution. Defined as `T extends U ? never : T`. The union splits, each member is tested individually, the matching ones become `never`, the rest survive. `never` is the identity of unions, so it drops out of the result.
- How do you **opt out of distribution**? #card #ts/conditional-types
  - Wrap in single-element tuples: `[T] extends [U] ? X : Y`. The tuple wrapping makes `T` non-naked, so the conditional tests the whole type at once instead of distributing.
- Why does `T extends never ? true : false` give `never` when `T = never`? #card #ts/conditional-types
  - `never` is the empty union (the union of zero types). Distribution over zero members produces zero terms, which is `never`. The fix: wrap in tuples — `[T] extends [never] ? true : false`.
- What does `infer` do? #card #ts/conditional-types #infer
  - Introduces a new type variable inside an `extends` clause and lets TS figure out what it is. Used to extract sub-types: `T extends Promise<infer U> ? U : never` plucks the wrapped type out of a Promise.
- Write `ReturnType<F>` from scratch. #card #ts/conditional-types

```ts

type ReturnType<F> = F extends (...args: any[]) => infer R ? R : never;

```
  - `infer R` extracts the return type position from any callable. Falls back to `never` if `F` isn't a function.

- Write `ElementOf<T>` for arrays. #card #ts/conditional-types
  - ```ts
    type ElementOf<T> = T extends (infer E)[] ? E : never;
    ```

Works on arrays and tuples (tuples are arrays in the type system).

- What does `Awaited<T>` do? #card #ts/conditional-types
  - Recursively unwraps Promises, including thenables and nested Promises. `Awaited<Promise<Promise<string>>>` = `string`. Used everywhere there's a generic-over-async-or-sync need.
- One workflow pattern: derive a TypeScript type from a function's implementation? #card #ts/conditional-types
  - `type Result = ReturnType<typeof myFunction>`. The type updates automatically when the function's return shape changes. Eliminates duplication between value-level and type-level.
- {{cloze When in doubt, reach for **discriminated unions** for domain modeling and **conditional types** for type-level transformations of existing types.}} #card #ts/conditional-types #discriminated-unions
- One sign you've overused conditional types in your codebase? #card #ts/conditional-types
  - Error messages 100+ lines long, build times that grow nonlinearly with type-utility complexity, new contributors avoiding the types directory. Conditional types belong in libraries and API boundaries, not in application-domain modeling.

---

## ✅ Self-check before moving on

Can I read a conditional type aloud and predict its result, including distribution?

Can I write `ReturnType`, `Parameters`, and `Awaited` from scratch using `infer`?

Can I explain when to opt out of distribution and why `[T] extends [U]` is the way?

Can I explain when a problem wants conditional types vs when it wants a discriminated union?

If any "no", do one practice exercise above. If all "yes", move to [[Learning/TypeScript/Mapped-Types]].

## 🔗 Related

Up: [[Learning/TypeScript]]

Prev: [[Learning/TypeScript/Generics]]

Next: [[Learning/TypeScript/Mapped-Types]]

Related: [[Learning/TypeScript/Template-Literal-Types]] (string-level conditional patterns)

Practice problems: [[Learning/TypeScript/Exercises]]
