---
title: Foundations
tags: [learning, typescript, foundations]
lastUpdated: 2026-05-15
---
# Foundations — beyond the basics

> **Convention on this page**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

You can write TypeScript that compiles. That's not the same as writing TypeScript that *catches things at compile time*. The gap is filled by understanding four things the language does that are different from what your Java/C#/C++ instincts expect:

- **Structural typing** — TypeScript matches on shape, not on name. Two unrelated types with the same fields are interchangeable.
- **Inference** — most types you write down are types the compiler could have figured out. The trick is knowing which ones to write anyway.
- **Widening** — `const x = 'hello'` and `let x = 'hello'` give `x` different types. The compiler is making a guess about what you meant.
- **Narrowing** — once you check a value's type with `typeof` or `if`, TS rewrites your variable's type inside that branch.
  - Get these four right and you stop fighting the compiler. Get them wrong and TypeScript feels like Java with extra paperwork.

## A tiny worked example

Two structurally identical types, used interchangeably:

```ts
type Point2D = { x: number; y: number };
interface Coord { x: number; y: number }

function distance(p: Point2D): number {
  return Math.sqrt(p.x ** 2 + p.y ** 2);
}

const c: Coord = { x: 3, y: 4 };
distance(c);  // works — Coord and Point2D have the same shape
```

`Coord` was never declared to "extend" or "implement" `Point2D`. They aren't related by name. They're related by **structure**: both have an `x: number` and a `y: number`. That's all TypeScript needs.

### Why this surprises people from nominal-typed languages

In Java, `Point2D` and `Coord` would be unrelated classes — `distance(c)` would be a type error unless `Coord implements Point2D`. In TypeScript, *implements* doesn't exist for type-compatibility purposes. **The type system asks "does this thing have the right shape?", not "what's its name?"**

This is sometimes called **duck typing at compile time** — if it walks like a `Point2D` and quacks like a `Point2D`, it *is* one as far as the type checker cares. Once you've internalized it, you stop writing unnecessary explicit `implements` clauses and start designing types around the *shape* of the data flowing through your program.

### When structural typing bites you

Structural compatibility goes further than you might want sometimes. Consider:

```ts
type UserId = string;
type Email = string;

function sendEmail(to: Email) { /* ... */ }

const id: UserId = 'user_42';
sendEmail(id);  // compiles — both are just `string`
```

That's a real bug waiting to happen. The fix isn't to abandon structural typing — it's to break the structural compatibility deliberately using **branded types**. We cover that on [[Learning/TypeScript/Branded-Types]].

## `type` vs `interface` — which to reach for

This is one of the first decisions a new TS programmer has to make, and almost every codebase makes it inconsistently. There's a defensible default.

```ts
// Same thing, two syntaxes:
interface User { id: string; name: string }
type User = { id: string; name: string };
```

The differences in capability:

| Feature | `type` | `interface` |
|---|---|---|
| Object shapes | ✅ | ✅ |
| Union types (`A \| B`) | ✅ | ❌ |
| Intersection (`A & B`) | ✅ | ✅ (via `extends`) |
| Mapped / conditional / template literal types | ✅ | ❌ |
| Declaration merging (auto-merge across declarations) | ❌ | ✅ |
| `implements` on a class | ✅ | ✅ |
| Extends from another | ✅ | ✅ |

- **My default: use `type`.** Reach for `interface` in two specific cases:

You're declaring a public API that consumers might want to **augment** later (e.g., extending `Window` or a library's options object). Declaration merging is the killer feature for this — see [[Learning/TypeScript/Modules-And-Declarations]].

You're modeling a class-like contract that gets `implements`-ed in many places, and the editor's error messages on `interface` constraints are slightly more readable.

Reasons to default to `type`:

Unions are by far the most powerful modeling tool in TS, and they don't fit in `interface`. If you start with `interface` and later need to add a union variant, you have to convert. Starting with `type` avoids that flip.

Mapped types, conditional types, template literal types — none of which work on `interface` — are the engine of the more advanced sections of this curriculum.

The error messages from `type` aliases are now equivalent in modern TS versions. The historical "interface is better for errors" advice is out of date.

The previous canonical advice was "use interface for objects, type for everything else." That's still defensible. Just pick one rule and apply it consistently — codebases that mix freely have the worst of both worlds.

For the full syntactic detail: [Handbook: Type Aliases vs Interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces).

## Inference — let the compiler do the work

You don't need to annotate everything. The compiler is good at figuring out types from context. Three rules of thumb:

```ts
// Annotate function parameters and return types of exported functions:
export function parseDate(input: string): Date { /* ... */ }

// Skip annotating local variables when inference is obvious:
const today = new Date();          // inferred Date
const message = `Hello, ${name}`;  // inferred string

// Annotate when the inferred type is too wide or too narrow for the use case:
const config: Record<string, unknown> = loadConfig();  // tell TS what to expect
```

The general principle: **annotate at module boundaries; let inference work inside**. Exported function signatures are the contract — they should be explicit. Internal variables almost never need annotation; over-annotating is noise.

One inference subtlety: TypeScript's inference is mostly *local* (one expression at a time), not bidirectional in the way some languages are. So `[]` infers to `never[]` until you push something into it; `[1, 2, 3]` infers to `number[]` not `[number, number, number]`. The next section is partly about how to nudge inference in the direction you want.

## Widening: `let` vs `const`

```ts
const x = 'hello';  // type: 'hello' (literal type)
let y = 'hello';    // type: string  (widened)
```

The compiler reasons: `const x` will never change, so its type can be the *narrowest* thing — the literal `'hello'`. `let y` might be reassigned, so its type is widened to `string` to be useful.

Why care? Because narrow types are powerful:

```ts
const direction = 'left';  // type: 'left'

function move(d: 'left' | 'right' | 'up' | 'down') { /* ... */ }
move(direction);  // works — 'left' is assignable to the union
```

If `direction` had been declared with `let`, its type would have widened to `string`, and `move(direction)` would have errored. The const-ness *carries through to the type system*.

### `as const` — telling TS not to widen, even on objects

```ts
const config1 = { mode: 'production', port: 8080 };
// type: { mode: string; port: number }  ← widened

const config2 = { mode: 'production', port: 8080 } as const;
// type: { readonly mode: 'production'; readonly port: 8080 }  ← literal everything
```

`as const` says "I mean this literally, all the way down — don't widen, and make everything readonly." It composes with arrays:

```ts
const colors = ['red', 'green', 'blue'] as const;
// type: readonly ['red', 'green', 'blue']  ← a tuple of literals, not string[]

type Color = typeof colors[number];  // 'red' | 'green' | 'blue'
```

That last trick — deriving a union type from a const array — is one of the most common real-world `as const` patterns. You declare the values once; the type follows automatically. No drift between "the list of valid colors" and "the type of a color."

## Narrowing — the warm-up

We'll cover narrowing in depth on [[Learning/TypeScript/Unions-And-Narrowing]]. The intuition you need now:

```ts
function lengthOf(x: string | string[]): number {
  if (typeof x === 'string') {
    return x.length;       // here TS knows x is string
  }
  return x.length;          // here TS knows x is string[]
}
```

Inside the `if`, TypeScript **narrows** `x` from `string | string[]` to just `string` based on the `typeof` check. After the early return, it narrows the remaining case to `string[]`. This is the engine that makes union types ergonomic — without narrowing, you'd be writing type assertions everywhere.

The full taxonomy of narrowing techniques — including custom type guards and exhaustiveness checking with `never` — lives on the next page.

## 🔍 Quick check (try before scrolling)

- **Q1**: Given these two declarations, which (if either) is a type error?

```ts
interface Animal { name: string }
class Dog { name: string = 'Rex'; }

const d: Animal = new Dog();  // ???
```

- Show answer to Q1
  - **Not an error.** `Dog` has a `name: string` field, which is structurally compatible with `Animal`. The fact that `Dog` doesn't `implements Animal` is irrelevant — TS only cares about shape. This is a classic point of confusion for Java/C# folks expecting an explicit relationship.
  - **Q2**: Why does `const x = 'hello'` get type `'hello'` but `let y = 'hello'` get type `string`?
- Show answer to Q2
  - `const` declarations can never be reassigned, so the compiler can infer the narrowest possible type (the literal `'hello'`). `let` declarations might be reassigned, so TS widens to `string` to keep them useful — a literal `'hello'` type for a `let` would error on any reassignment. Const-ness is information the type checker exploits.
  - **Q3**: Convert this to use `as const` so `MODES` ends up as a tuple of three string literals and `Mode` ends up as a union of those literals:

```ts
const MODES = ['development', 'staging', 'production'];
type Mode = ???;
```

- Show answer to Q3

```ts

const MODES = ['development', 'staging', 'production'] as const;

type Mode = typeof MODES[number];

```
  - Without `as const`, `MODES` would be `string[]` and `typeof MODES[number]` would be `string` — useless. With `as const`, `MODES` becomes a `readonly ['development', 'staging', 'production']` tuple, and indexing by `number` distributes over the tuple to give the union of its element types. This is the canonical pattern for "the list of valid X is also the type of X."

If those three clicked, you've got the foundations. Move to practice when you have time.

---

## 💪 Practice (a separate session, not your first read)

These are for *after* your first read. Don't try to do them in the same session — that's cramming.

### Worked → faded → blank: deriving a union from a const array

#### Worked example (read)

```ts
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;
type HttpMethod = typeof HTTP_METHODS[number];
// HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

function isMethod(s: string): s is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(s);
}
```

The `as readonly string[]` widens the tuple back to a string array so `.includes` doesn't complain about its argument being too narrow. We'll see the cleaner version in [[Learning/TypeScript/Unions-And-Narrowing]].

#### Faded — fill in the blanks

Given a const array of role names, produce a union type *and* a runtime list, both from the same source:

```ts
const ROLES = ['admin', 'editor', 'viewer'] _________;
type Role = typeof ROLES[_________];
const ROLE_NAMES: readonly string[] = ROLES;
```

- Show the answer

```ts

const ROLES = ['admin', 'editor', 'viewer'] as const;

type Role = typeof ROLES[number];

```
  - The pattern: declare the array once, get both a runtime value (for iteration, validation, dropdown population) and a compile-time type (for parameter constraints) without duplication. Adding a fourth role means changing exactly one line.

#### From scratch

Write a `createEnum<T extends readonly string[]>(values: T)` function that returns an object with each value as both key and value (so `createEnum(['a', 'b'])` returns `{ a: 'a', b: 'b' }`), with the return type *precisely* `{ a: 'a', b: 'b' }`, not `Record<string, string>`. Hint: you'll need a mapped type. We'll see how on [[Learning/TypeScript/Mapped-Types]] — try it first, even if you fail.

### Debug-this

The function below is supposed to take a config object and return a hardened version. There's a subtle bug — the returned type is wider than the author intended.

```ts
function freeze<T>(obj: T): Readonly<T> {
  return Object.freeze(obj);
}

const settings = freeze({ host: 'localhost', port: 8080 });
// What's the type of settings.host?
```

- Show the bug
  - The type of `settings.host` is `string`, not `'localhost'`. `freeze` accepts `T`, which gets inferred as `{ host: string; port: number }` from the object literal — widening kicks in *at the function call site* because the parameter is mutable from the function's perspective. Wrapping in `Readonly<T>` makes it readonly but doesn't recover the lost literal types. Fix: use `<const T>` generic syntax (TS 5.0+) or have the caller pass `as const`. The `<const T>` version: `function freeze<const T>(obj: T): Readonly<T>` — this opts the call into const-narrowing for the inference of `T`.

### Teach-it-back

Without notes, in 3–4 sentences:

> *"Your colleague comes from a Java background and asks why this TypeScript code works without an explicit `implements`. Explain structural typing and one place it bites you."*

If you can't, the structural-typing section didn't land. Re-read the worked example, then try again.

---

## 🎴 Flashcards (for daily review, not the first read)

These get surfaced by Logseq's flashcard queue. **Don't drill on first read — that's cramming.**

- TypeScript's type system matches on... #card
  - **Structure (shape)**, not name. Two unrelated types with the same fields are interchangeable. This is "structural typing" or sometimes "duck typing at compile time."
- {{cloze TypeScript uses **structural** typing; Java/C# use **nominal** typing.}} #card
- One real bug that structural typing fails to catch on its own? #card
  - Mixing up two string-aliased types that are semantically distinct (e.g., `UserId` vs `Email`). Both reduce to `string`, so they're interchangeable. Fix: branded types ([[Learning/TypeScript/Branded-Types]]).
- Default choice: `type` or `interface`? #card
  - **`type`**. It supports unions, mapped types, conditional types, template literals. Reach for `interface` when you specifically want declaration merging (extending third-party types or `Window`).
- One thing `interface` can do that `type` can't? #card
  - **Declaration merging**: multiple `interface User { ... }` declarations in the same scope auto-merge. Essential for module augmentation.
- One thing `type` can do that `interface` can't? #card
  - **Union types** (`type X = A | B`), plus mapped, conditional, and template literal types. The most common reason to default to `type`.
- Why does `const x = 'hello'` get type `'hello'` but `let y = 'hello'` get type `string`? #card
  - `const` can never be reassigned, so the type is narrowed to the literal. `let` might be reassigned, so it widens to the base type to stay useful.
- {{cloze `as const` tells the compiler to **not widen** — literals stay literal, arrays become readonly tuples, objects become readonly with literal fields.}} #card
- Idiom: derive a union type from a const array of strings? #card

```ts

const COLORS = ['red', 'green', 'blue'] as const;

type Color = typeof COLORS[number];

```
  - Both the values and the type come from one source. Add a color → change one line.

- {{cloze Inside `if (typeof x === 'string') { ... }`, TypeScript **narrows** `x` to `string`.}} #card

- Rule of thumb: when to annotate types explicitly? #card
  - At module boundaries (exported function signatures, public APIs, return types of complex functions). Skip annotation for local variables when inference is obvious. Annotating everything is noise.

- The `<const T>` generic syntax (TS 5.0+) does what? #card
  - Opts into const-like inference for the type parameter. Without it, a generic over `T` widens literal arguments. With it, literals stay narrow at the call site without the caller needing `as const`.

---

## ✅ Self-check before moving on

- Can I explain structural typing to someone coming from Java, and name a case where it fails to catch a real bug?
- Can I justify a default choice between `type` and `interface` in one sentence?
- Do I know why `as const` exists and at least two patterns where it earns its keep?
- Can I read `const COLORS = [...] as const; type Color = typeof COLORS[number]` without having to think about it?

If any "no", do one practice exercise above. If all "yes", move to [[Learning/TypeScript/Unions-And-Narrowing]].

## 🔗 Related

- Up: [[Learning/TypeScript]]
- Next: [[Learning/TypeScript/Unions-And-Narrowing]]
- Related: [[Learning/TypeScript/Branded-Types]] (the fix for structural-typing's accidental compatibility)
- Practice problems: [[Learning/TypeScript/Exercises]]
