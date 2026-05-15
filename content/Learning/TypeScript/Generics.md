---
title: Generics
tags: [learning, typescript, generics]
lastUpdated: 2026-05-15
---
# Generics — true polymorphism vs disguised `any`

> **Convention**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

Two functions, both compile, both look generic — one is genuinely useful, the other is `any` in a trench coat:

```ts
// Genuine polymorphism — preserves the input type:
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
const n = first([1, 2, 3]);     // n: number | undefined
const s = first(['a', 'b']);    // s: string | undefined

// Disguised `any` — `T` appears once and tells the compiler nothing:
function log<T>(x: T): void {
  console.log(x);
}
log('anything');   // T inferred as string, but who cares?
```

The first function uses `T` in both the input *and* the output, so calling it preserves type information from caller through callee. The second uses `T` once — there's no relationship to preserve. The generic adds complexity without buying type safety.

- **This page is about the rules for when generics actually earn their keep**, plus the specific features (constraints, defaults, multiple parameters, variance) that turn generics from a syntax curiosity into a leverage point.

The leverage is real:

- **Reusable type-safe utilities** — write `pick`, `map`, `partition`, `groupBy` once; get correct types for every call site.
- **Container-shaped abstractions** — `Map<K, V>`, `Promise<T>`, `Result<T, E>` are all generics doing the same job: "I hold something; whatever you put in, you get out."
- **Library author leverage** — the entire React, RxJS, and Express type story is generics behind the scenes; users get autocomplete because library authors did the generic work.

## A tiny worked example

A real workhorse generic: `pick`, which selects a subset of keys from an object.

```ts
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

const user = { id: '42', name: 'Alice', age: 30, email: 'a@x' };
const summary = pick(user, ['id', 'name']);
// summary: { id: string; name: string }
```

Three things this generic does that a non-generic `pick(obj, keys): unknown` couldn't:

- **The result type tracks the chosen keys.** `summary` has only `id` and `name`. Try to access `summary.email` → compile error.
- **Misspelled keys fail at compile time.** `pick(user, ['nme'])` errors because `'nme'` isn't `keyof T`. The `K extends keyof T` constraint enforces it.
- **The original object's value types flow through.** `summary.id` is `string`, not `unknown`, because `T`'s type is preserved.

### Naming the parts as they come up

- **Type parameter** — `T` in `<T>`. A placeholder for a type the caller chooses (or that gets inferred).
- **Constraint** — `K extends keyof T` says "the type parameter `K` must be assignable to `keyof T`." Constraints prevent overly-broad type parameters and unlock methods on `T`.
- **Default type parameter** — `<T = string>` means "if the caller doesn't specify `T`, use `string`."
- **Multiple type parameters** — `<T, U>`, `<K, V>` — totally fine, and often the cleanest way to model relationships.
- **Inference** — usually the caller doesn't write the type arguments; the compiler figures them out from the value arguments. `pick(user, ['id'])` infers `T = typeof user` and `K = 'id'`.
  - For the full syntactic detail: [Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html).

## When generics actually earn their keep

A diagnostic for "should this be generic?" — count how often the type parameter appears in the signature.

```ts
// Appears 2+ times → genuine generic. The relationship matters.
function identity<T>(x: T): T { return x; }
function swap<A, B>(pair: [A, B]): [B, A] { return [pair[1], pair[0]]; }
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> { /* ... */ }

// Appears once in input only → the generic is doing nothing.
// You probably want `unknown`, not `<T>(x: T)`.
function log<T>(x: T): void { console.log(x); }   // anti-pattern

// Appears once in output only → the generic is "trust me" — caller picks T freely.
// Often a sign you're disguising `any`.
function parse<T>(input: string): T { return JSON.parse(input); }   // anti-pattern
```

The third case is a particularly common smell. `parse<User>(input)` looks safe, but there's no runtime check — the function lies about producing a `User`. Either use `unknown` and force the caller to validate, or build the validation in (and return `Result<T, Error>`).

- **Default rule**: if a type parameter doesn't appear at least twice in your signature, it's probably not doing useful work.

### When `unknown` beats `<T>`

```ts
// Bad — looks safe, isn't:
function fromJSON<T>(s: string): T { return JSON.parse(s); }
const user = fromJSON<User>(payload);   // no runtime guarantee at all

// Good — forces the caller to validate:
function fromJSON(s: string): unknown { return JSON.parse(s); }
const raw = fromJSON(payload);
if (isUser(raw)) { /* use raw as User */ }
```

`unknown` is "I don't know what this is — narrow before using." It's `any` with a seatbelt. Reach for it when you genuinely don't know the type, instead of letting the caller pretend they know via a generic. See [[Learning/TypeScript/Tsconfig-And-Escape-Hatches]] for `any` vs `unknown` in depth.

## Constraints with `extends`

A type parameter without constraints is the universal type — it can be anything, so you can do almost nothing with it. Add a constraint and you unlock methods:

```ts
// Without constraint — can't access .length:
function loggedLength<T>(x: T): T {
  console.log(x.length);   // ❌ Property 'length' does not exist on 'T'
  return x;
}

// With constraint — TS knows T has .length:
function loggedLength<T extends { length: number }>(x: T): T {
  console.log(x.length);   // ✅ works
  return x;
}

loggedLength('hello');        // T = string (has .length)
loggedLength([1, 2, 3]);      // T = number[] (has .length)
loggedLength({ length: 10 }); // T = { length: number }
loggedLength(42);             // ❌ number has no .length
```

The constraint says **"`T` must be assignable to this shape."** Inside the function, you can rely on that shape; outside, only callers passing things matching that shape can call you.

Critical subtlety: the function returns `T`, not the constraint shape. So `loggedLength('hello')` returns `string`, not `{ length: number }`. **The constraint is a lower bound; `T` keeps its full identity.** This is what makes the `pick` example work — the constraint `K extends keyof T` doesn't widen `K` to `keyof T`, it just requires it.

### `keyof` constraints — the most common case

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: '42', name: 'Alice', age: 30 };
const id = getProp(user, 'id');      // id: string
const age = getProp(user, 'age');    // age: number
getProp(user, 'xxx');                // ❌ 'xxx' is not a key of user
```

`K extends keyof T` is the bedrock of type-safe object access. The return type `T[K]` is an **indexed access type** — "the type of `T`'s property at key `K`." If `K = 'id'`, then `T[K] = T['id'] = string`.

This pattern alone is responsible for half the type safety in modern React, Express, and Drizzle/Prisma. Every "I want a function that takes an object and a key into it" call is this generic.

## Default type parameters

```ts
type ApiResponse<T = unknown> = {
  status: number;
  data: T;
};

const a: ApiResponse = { status: 200, data: 'anything' };       // T defaults to unknown
const b: ApiResponse<User> = { status: 200, data: { /* ... */ } }; // T = User
```

Use defaults when:

Most callers want a specific type (e.g., `unknown`, `Error`, `{}`).

You want to make a generic *backward-compatible* when adding a new type parameter to an existing utility.

Don't use defaults to "make the type parameter optional and conveniently default to `any`" — that's almost always a sign you should be using `unknown` explicitly.

## Multiple type parameters

```ts
function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  const result: [A, B][] = [];
  for (let i = 0; i < Math.min(as.length, bs.length); i++) {
    result.push([as[i], bs[i]]);
  }
  return result;
}

const pairs = zip(['a', 'b'], [1, 2]);  // [string, number][]
```

Each type parameter tracks an independent piece of information. The compiler infers each separately from the corresponding argument. This is just generics doing what they were designed to do — preserving multiple type relationships at once.

A common stumble: don't unify type parameters that aren't actually related. Two array arguments don't need to be the same `T` if your function doesn't require it.

```ts
// Wrong — forces both arrays to have the same element type:
function zip<T>(as: T[], bs: T[]): [T, T][] { /* ... */ }

// Right — independent type parameters:
function zip<A, B>(as: A[], bs: B[]): [A, B][] { /* ... */ }
```

## Variance — a brief but important detour

When are two generic types compatible? "A subtype of B" gets subtle once generics are involved. The rules:

- **Covariance**: if `A` is a subtype of `B`, then `F<A>` is a subtype of `F<B>`. Applies to *return types* and (in TS by default, dangerously) to *array elements*.
- **Contravariance**: if `A` is a subtype of `B`, then `F<B>` is a subtype of `F<A>`. Applies to *parameter types* in function types (with `strictFunctionTypes`).
- **Invariance**: neither direction works. The types must match exactly.
  - Why this matters in practice — two concrete cases:

### Array variance is bivariant (and that's a bug)

```ts
class Animal { name = ''; }
class Dog extends Animal { bark() {} }

const dogs: Dog[] = [];
const animals: Animal[] = dogs;     // ✅ TS allows this (covariant)
animals.push(new Animal());          // 🚨 now dogs[0] is an Animal, not a Dog
dogs[0].bark();                      // 💥 runtime crash
```

This is a known unsoundness in TS's type system, inherited from JavaScript. The fix in your own code: use `readonly Dog[]` when you don't intend to mutate. `readonly` is covariant *safely* because you can't push into it.

### Function parameters are contravariant

```ts
type Handler<T> = (input: T) => void;

function callHandler(h: Handler<Animal>) {
  h(new Animal());
}

const dogHandler: Handler<Dog> = (d: Dog) => d.bark();
callHandler(dogHandler);   // ❌ with strictFunctionTypes
```

A `Handler<Dog>` can't be used where a `Handler<Animal>` is expected — you'd be passing animals (some not dogs) to something that only knows how to handle dogs. Function parameters flow *backwards* through subtyping. Counterintuitive at first; correct on reflection.

- **Practical leverage**: turn on `strictFunctionTypes` (part of `strict`). When you hit "type is not assignable" errors involving function parameters, suspect variance, and consider whether `readonly` arrays or different parameter shapes would fix it.

For the full syntactic detail: [Handbook: Variance](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints) and the [strictFunctionTypes flag doc](https://www.typescriptlang.org/tsconfig#strictFunctionTypes).

## Higher-order generics — when the type parameter is a function

Sometimes you want a generic over function types. Common in middleware, decorators, and HOCs.

```ts
function withLogging<F extends (...args: any[]) => any>(fn: F): F {
  return ((...args: Parameters<F>) => {
    console.log('calling with', args);
    const result = fn(...args);
    console.log('returned', result);
    return result;
  }) as F;
}

const add = (a: number, b: number) => a + b;
const loggedAdd = withLogging(add);   // type preserved: (a: number, b: number) => number
loggedAdd(1, 2);                       // works, with logging
```

The constraint `F extends (...args: any[]) => any` is "this must be some kind of function." Inside the wrapper, we use built-in conditional-type helpers `Parameters<F>` and `ReturnType<F>` (which you'll meet on [[Learning/TypeScript/Conditional-Types]]) to talk about the function's argument and return types without committing to specifics.

The `as F` cast at the end is a small unavoidable lie — TS can't quite prove the wrapped function has the same callable shape. Keep it audited; it's the price of higher-order generics.

- **When to reach for higher-order generics**: middleware, decorators, function composition utilities, debouncing/throttling, retry wrappers. Anywhere "wrap this function and preserve its signature exactly" is the requirement.

## 🔍 Quick check (try before scrolling)

- **Q1**: Is `function log<T>(x: T): void` a useful generic? Why or why not?
- Show answer to Q1
  - **Not useful.** `T` appears exactly once — in the input. There's no relationship to preserve, so the generic does nothing the parameter type `unknown` (or even `any`, in this case) couldn't do. Generics earn their keep when a type parameter appears in *multiple* positions, tying inputs to outputs or parameters to each other. A one-position type parameter is a tell that you're disguising `unknown`/`any`.
  - **Q2**: Trace the types: what's the return type of `pick(user, ['id', 'age'])` where `user = { id: '1', name: 'A', age: 30 }`?
- Show answer to Q2
  - `{ id: string; age: number }`. The `K extends keyof T` constraint pins `K` to `'id' | 'age'` (the union of array element types, inferred from the literal array). `Pick<T, K>` then constructs an object type with just those keys, preserving their value types. The name and email are absent — the type *narrows* to exactly what was asked for. This is the "type tracks the value" leverage that makes `pick` a much better default than `keys.reduce((acc, k) => ({ ...acc, [k]: obj[k] }), {})`.
  - **Q3**: Why does this fail with `strictFunctionTypes` on?

```ts
type AnimalHandler = (a: Animal) => void;
type DogHandler = (d: Dog) => void;
const f: AnimalHandler = (d: Dog) => d.bark();
```

- Show answer to Q3
  - **Function parameters are contravariant.** `AnimalHandler` can be called with any `Animal`, not just `Dog`s. If you assigned a `Dog`-only handler to an `Animal` slot, calling the slot with a `Cat` would crash inside `d.bark()`. The compiler refuses the assignment to prevent that. The relationship is *backwards* from intuition: `Handler<Animal>` is the *subtype* (more usable), `Handler<Dog>` is the *supertype*. Memorize: parameters go opposite, return types go with.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: implement `groupBy`

#### Worked example (read)

```ts
function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  }
  return result;
}

const users = [
  { name: 'Alice', team: 'eng' as const },
  { name: 'Bob',   team: 'eng' as const },
  { name: 'Carol', team: 'sales' as const },
];

const byTeam = groupBy(users, u => u.team);
// byTeam: Record<'eng' | 'sales', { name: string; team: 'eng' | 'sales' }[]>
```

The type-level trick: `K` is inferred from the *return type of `keyFn`*. If `keyFn` returns `'eng' | 'sales'` (which it does because of `as const`), the result is a `Record` over exactly those keys.

#### Faded — fill in the blanks

Implement `partition` — split an array into two by a predicate:

```ts
function partition<T, U extends T>(
  items: T[],
  predicate: (item: T) => item is U,
): [_____, _____] {
  const matched: _____ = [];
  const rest: _____ = [];
  for (const item of items) {
    if (predicate(item)) {
      matched.push(item);
    } else {
      rest.push(item);
    }
  }
  return [matched, rest];
}
```

- Show the answer

```ts

- function partition<T, U extends T>(
- items: T[],
- predicate: (item: T) => item is U,
- ): [U[], Exclude<T, U>[]] {
- const matched: U[] = [];
- const rest: Exclude<T, U>[] = [];
- // ...
- return [matched, rest];
- }

```
  - The predicate is a type guard (`item is U`), which lets the matched array be `U[]`. The rest is `Exclude<T, U>[]` — everything in `T` that isn't `U`. We'll see `Exclude` properly on [[Learning/TypeScript/Conditional-Types]]; for now, trust that it does what its name implies.

#### From scratch

Implement `keyBy<T, K extends string | number>(items: T[], keyFn: (item: T) => K): Record<K, T>` — like `groupBy` but assumes each key is unique, so each value is `T` not `T[]`. Test it preserves the literal types of the keys when `keyFn` returns a literal union.

### Worked → faded → blank: a constrained generic factory

#### Worked example (read)

```ts
function createMap<K extends string, V>(entries: readonly [K, V][]): Record<K, V> {
  const result = {} as Record<K, V>;
  for (const [k, v] of entries) {
    result[k] = v;
  }
  return result;
}

const config = createMap([
  ['host', 'localhost'],
  ['port', 8080],
] as const);
// config: Record<'host' | 'port', 'localhost' | 8080>
```

Without `as const`, the entries would be inferred as `(string | number)[][]` and the type would collapse to `Record<string, string | number>` — useless. With `as const`, the call site retains literal types, which propagate through the generic.

#### Faded — fill in the blanks

Implement `mapValues` — apply a function to every value of an object, preserving keys:

```ts
function mapValues<K extends string, V, R>(
  obj: ____________,
  fn: (value: ___) => R,
): Record<K, R> {
  const result = {} as Record<K, R>;
  for (const key in obj) {
    result[key] = fn(obj[key]);
  }
  return result;
}
```

- Show the answer

```ts

- function mapValues<K extends string, V, R>(
- obj: Record<K, V>,
- fn: (value: V) => R,
- ): Record<K, R> {
- // ...
- }

```
  - The input type is `Record<K, V>` — an object with keys of type `K` and values of type `V`. The function transforms each value from `V` to `R`. The output preserves the keys, swaps the value type. A real-world utility you reach for constantly.

### Debug-this

```ts
function firstAndLast<T>(arr: T[]): [T, T] {
  return [arr[0], arr[arr.length - 1]];
}

const [first, last] = firstAndLast([] as number[]);
console.log(first.toFixed(2));   // 💥
```

- What's wrong with the type signature?
- Show the bug
  - The function lies. `arr[0]` and `arr[arr.length - 1]` can be `undefined` if the array is empty, but the signature says `[T, T]` — no `undefined` in sight. At runtime, `first` is `undefined` and `first.toFixed(2)` crashes.
  - **Fix 1**: signature should be `[T | undefined, T | undefined]` or, better, `arr is [T, ...T[]]`-narrowed at the call site.
  - **Fix 2 (the real fix)**: turn on `noUncheckedIndexedAccess`. With that flag, `arr[0]` is `T | undefined` automatically, and the lie becomes a compile error. The flag is one of the most underused leverage points in TS — see [[Learning/TypeScript/Tsconfig-And-Escape-Hatches]].

### Teach-it-back

Without notes, in ~4 sentences:

> *"A teammate writes `function parseBody<T>(req: Request): T { return req.body; }` and uses it as `parseBody<User>(req)`. Explain why this is `any` in disguise, and what you'd write instead."*

If you can't, the "useful generic vs disguised `any`" diagnostic didn't land. Re-read the opening of "When generics earn their keep."

---

## 🎴 Flashcards (for daily review, not the first read)

- Diagnostic for whether a generic earns its keep? #card
  - Count the appearances of the type parameter in the signature. If it appears once, the generic is probably disguising `unknown`/`any`. If it appears 2+ times, it's preserving a real type relationship.
- {{cloze A type parameter appearing in **input only** is doing nothing; if it appears in input AND output, it's doing real work.}} #card
- What does `K extends keyof T` constrain? #card
  - It pins `K` to be one of the keys of `T`. Combined with an indexed access type `T[K]`, this is the foundation of type-safe property access (`pick`, `getProp`, etc.).
- What's an **indexed access type**? #card
  - `T[K]` — the type of `T`'s property at key `K`. `User['name']` = `string`. Works for unions of keys too: `User['name' | 'id']` = `string | string`.
- Default type parameter syntax? #card

```ts

function f<T = string>(x: T): T { ... }

type R<E = Error> = { ok: false; error: E };

```
  - Useful for unknown-like defaults, and for adding a new type parameter to an existing API without breaking callers.

- {{cloze Function parameter types are **contravariant**; function return types are **covariant**.}} #card

- Why are arrays unsoundly covariant in TS? #card
  - `Dog[]` is assignable to `Animal[]`, but then you can push a non-Dog `Animal` into the `Animal[]` (which is the same array), breaking `Dog[]`. The fix in your own code: use `readonly Dog[]` when you don't intend to mutate — that's covariant *safely*.

- Two reasons to prefer `unknown` over a single-position `<T>`? #card
  - (1) Forces callers to validate before use. (2) Doesn't lie about a runtime guarantee that doesn't exist. Generic returning `T` from `JSON.parse` is the canonical anti-example.

- The `Parameters<F>` and `ReturnType<F>` utility types do what? #card
  - Extract the parameter tuple type and the return type of a function type. Most useful inside generic constraints over functions (HOFs, middleware, decorators).

- One smell that suggests you should reach for a higher-order generic? #card
  - "Wrap this function and preserve its full signature." Logging, debouncing, retrying, caching, telemetry — all wrapper patterns where the wrapped function's parameters and return type must flow through unchanged.

- {{cloze A type parameter without a constraint is the universal type — you can pass anything in, but you can't call any methods on it.}} #card

---

## ✅ Self-check before moving on

- Can I look at a generic and tell whether it's earning its keep (parameter appears 2+ times)?
- Can I write `pick<T, K extends keyof T>(obj, keys): Pick<T, K>` from a blank file?
- Can I explain why arrays are unsoundly covariant and what to do about it (readonly arrays)?
- Can I explain when to use `unknown` instead of a single-position `<T>`?

If any "no", do one practice exercise above. If all "yes", move to [[Learning/TypeScript/Conditional-Types]].

## 🔗 Related

- Up: [[Learning/TypeScript]]
- Prev: [[Learning/TypeScript/Unions-And-Narrowing]]
- Next: [[Learning/TypeScript/Conditional-Types]]
- Related: [[Learning/TypeScript/Mapped-Types]] (generics over object shapes), [[Learning/TypeScript/Tsconfig-And-Escape-Hatches]] (`unknown` vs `any`)
- Practice problems: [[Learning/TypeScript/Exercises]]
