---
title: Mapped-Types
tags: [topic/typescript, topic/type-system, kind/concept]
lastUpdated: 2026-05-15
---
# Mapped types — transforming object shapes

> **Convention**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

You have a `User` type:

```ts
type User = { id: string; name: string; age: number };
```

You want:

a `PartialUser` where every field is optional (for an update API)

a `ReadonlyUser` where every field is readonly (for a snapshot)

a `NullableUser` where every field could be `null` (for a partial DB read)

a `UserGetters` shape: `{ getId: () => string; getName: () => string; getAge: () => number }`

You could write all four out by hand. Then you change `User` and have to update four places — and probably miss one. Or: write one mapped type that builds each transformation, and they all stay in sync automatically.

```ts
type Partial<T>     = { [K in keyof T]?: T[K] };
type Readonly<T>    = { readonly [K in keyof T]: T[K] };
type Nullable<T>    = { [K in keyof T]: T[K] | null };
type Getters<T>     = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
```

That's the entire content of this page in four lines. The rest is variations, gotchas, and decision criteria for when reaching for a mapped type beats writing the explicit shape.

## A tiny worked example

The `Partial<T>` utility, traced through:

```ts
type User = { id: string; name: string };

type PartialUser = Partial<User>;
// = { [K in keyof User]?: User[K] }
// = { id?: string; name?: string }
```

The mapped type **iterates the keys** of `User` (`keyof User` is `'id' | 'name'`), binds each key to `K`, then constructs the new object type with that key mapped to `User[K]` — with `?` added.

### Naming the parts as they come up

- **Mapped type** — a type of the form `{ [K in T]: U }` where `T` is some type (usually `keyof Something`) and `U` is the value type for each key.
- **Index signature** vs **mapped type** — index signatures (`{ [k: string]: V }`) declare "any key of this type"; mapped types iterate a *specific* set of keys and produce one property per key.
- **Modifiers**: `readonly`, `?`. Mapped types can **add or remove** these with `+readonly`/`-readonly`, `+?`/`-?`.
- **Key remapping with `as`**: `{ [K in keyof T as NewKey]: ... }` — TS 4.1+. Lets you transform the key name (or filter keys out by mapping to `never`).
  - For the full syntactic detail: [Handbook: Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html).

## Modifiers — `readonly`, `?`, and their `+/-` variants

```ts
// Add readonly to every field:
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };

// Remove readonly from every field:
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

// Make every field required (strip the ?):
type MyRequired<T> = { [K in keyof T]-?: T[K] };

// Make every field optional (add ?):
type MyPartial<T> = { [K in keyof T]?: T[K] };
```

The `+` is the default (you can write `+readonly` for symmetry, but it's redundant). The `-` is the move that's usually missing from people's mental models: **you can remove modifiers, not just add them.**

A common real-world need: take a type with optional fields and produce one where they're required. `Required<T>` (built-in) does this with `-?`. The dual of `Partial`.

## Key remapping with `as` (TS 4.1+)

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type User = { id: string; name: string; age: number };
type UserGetters = Getters<User>;
// = {
//     getId: () => string;
//     getName: () => string;
//     getAge: () => number;
//   }
```

The `as` clause is a **second expression** that produces the new key for each iteration. Here we use a [template literal type](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) to build `getId`, `getName`, etc. — we'll cover those properly on [[Learning/TypeScript/Template-Literal-Types]].

### Filtering keys by mapping to `never`

A killer use of key remapping: **delete** keys.

```ts
type StringKeysOnly<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type User = { id: string; name: string; age: number; admin: boolean };
type Stringy = StringKeysOnly<User>;
// = { id: string; name: string }
```

When the remap clause produces `never`, that key is dropped from the result. Combined with conditional types, you can filter object shapes by any predicate.

Real-world patterns:

- **Pick by value type**: `StringKeysOnly`, `FunctionKeysOnly` (extract methods only).
- **Omit by predicate**: drop internal-prefixed keys like `_id`, `_meta`.
- **Rename systematically**: snake_case to camelCase, prefixed handlers (`onClick` → `Click`).

## Composing with conditional types

Mapped types and conditional types are the two main operations on object shapes; they compose naturally.

```ts
// Deep readonly — recurses into nested objects:
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly<T[K]>
    : T[K];
};

type Nested = {
  user: { id: string; profile: { name: string } };
  count: number;
};

type FrozenNested = DeepReadonly<Nested>;
// = {
//     readonly user: {
//       readonly id: string;
//       readonly profile: { readonly name: string };
//     };
//     readonly count: number;
//   }
```

The recursive call is the conditional-type leverage: "if this property is an object, recurse; otherwise leave it alone." The mapped type provides the iteration.

A caveat: `T[K] extends object` matches arrays and functions too, which is rarely what you want. A real-world `DeepReadonly` typically excludes those — left as practice.

### Composing two mapped types

```ts
// Pick + Partial in one go:
type PartialPick<T, K extends keyof T> = { [P in K]?: T[P] };

type UpdateUser = PartialPick<User, 'name' | 'age'>;
// = { name?: string; age?: number }
```

Combinations like this are why writing custom mapped types pays off — `Partial<Pick<User, 'name' | 'age'>>` works too, but composing inline can be clearer for one-off shapes.

## Real-world patterns

### A form schema → field types

```ts
type FormSchema = {
  email: { type: 'email'; required: true };
  age: { type: 'number'; required: false };
  bio: { type: 'text'; required: false };
};

type FieldType = {
  email: string;
  number: number;
  text: string;
};

type FormValues<S> = {
  [K in keyof S]: S[K] extends { type: infer T; required: true }
    ? T extends keyof FieldType
      ? FieldType[T]
      : never
    : S[K] extends { type: infer T; required: false }
      ? T extends keyof FieldType
        ? FieldType[T] | undefined
        : never
      : never;
};

type Values = FormValues<FormSchema>;
// = { email: string; age: number | undefined; bio: string | undefined }
```

One source of truth (the schema); the runtime form library uses it for validation, the type system uses the same shape to type the form values. **No drift between the validator and the type** — adding a field is one place. This pattern shows up in [Zod](https://zod.dev/) (`z.infer`), [Yup](https://github.com/jquense/yup), [react-hook-form](https://react-hook-form.com/), and basically every modern form library.

### Routes → handler types

```ts
type Routes = {
  '/users': { method: 'GET'; response: User[] };
  '/users/:id': { method: 'GET'; response: User };
  '/users/create': { method: 'POST'; body: CreateUserInput; response: User };
};

type Handler<R extends keyof Routes> = (
  ...args: Routes[R] extends { body: infer B } ? [body: B] : []
) => Promise<Routes[R]['response']>;

type CreateHandler = Handler<'/users/create'>;
// = (body: CreateUserInput) => Promise<User>

type ListHandler = Handler<'/users'>;
// = () => Promise<User[]>
```

The conditional inside the mapped-like expression decides whether a handler takes a body argument based on the route's shape. This is the type machinery behind tRPC, Hono's client types, and similar router-as-type-source libraries.

## Costs and when not to reach

Mapped types are less prone to runaway complexity than conditional types — they iterate a fixed set of keys, so the result is bounded. The risks:

- **Deep recursion blows past the recursion limit** (default ~50, configurable but not infinitely). Deep types over deeply-nested object trees can hit this.
- **Inference through complex mapped types is slower**, sometimes by an order of magnitude. The `tsserver` editor experience suffers before the build does.
- **"What's the type here?" debugging gets hard.** When TS prints a complex mapped result, the output can be unreadable.
  - The discipline: write mapped types when you're doing **one transformation to multiple fields** (the four `Partial`/`Readonly`/`Nullable`/`Getters` cases). When you want different per-field handling, just write the object type explicitly. Don't conditional-type your way into a unique shape for each key.

## 🔍 Quick check (try before scrolling)

- **Q1**: What does `Mutable<T> = { -readonly [K in keyof T]: T[K] }` actually do?
- Show answer to Q1
  - Strips `readonly` from every property of `T`. The `-readonly` is the modifier-removal syntax — without it, `readonly` would carry through unchanged. Equivalent in the opposite direction to `Readonly<T>`'s `readonly` addition. The `-` modifier-removal also works on `?` (e.g., `Required<T>` does `-?`).
  - **Q2**: Write a mapped type `Nullable<T>` that makes every field `T[K] | null` — but leaves the optional-ness untouched.
- Show answer to Q2

```ts

type Nullable<T> = { [K in keyof T]: T[K] | null };

```
  - The key thing it does *not* do: it doesn't add `?` or change readonly status. If `T = { a: string; b?: number }`, then `Nullable<T> = { a: string | null; b?: number | null }`. The optional `b` stays optional. This is the right level of "only do one thing."

**Q3**: Trace through `Filter<T> = { [K in keyof T as T[K] extends Function ? K : never]: T[K] }` on `{ a: string; b: () => void; c: number }`.

- Show answer to Q3
  - For each key: `a` has value type `string`, not a function, so the remap clause is `never` → key dropped. `b` is `() => void`, a function, so the key stays as `b`. `c` is `number`, dropped. Result: `{ b: () => void }`. This is the "filter object by value type" pattern — used for extracting just methods from a class, just data fields from a model, etc.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: build `DeepPartial`

#### Worked example (read)

```ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? DeepPartial<T[K]>
    : T[K];
};

type Nested = {
  user: { id: string; profile: { name: string; age: number } };
  count: number;
};

type Updatable = DeepPartial<Nested>;
// = {
//     user?: {
//       id?: string;
//       profile?: {
//         name?: string;
//         age?: number;
//       };
//     };
//     count?: number;
//   }
```

The recursion is the magic. Each level adds `?` to every field; if the field is itself an object, recurse. Useful for "partial update" APIs over nested state.

#### Faded — fill in the blanks

Implement `DeepReadonly<T>` that recursively adds `readonly`, but does **not** recurse into arrays or functions (treats them as leaves):

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends ____________________
    ? T[K]
    : T[K] extends object
      ? DeepReadonly<T[K]>
      : T[K];
};
```

- Show the answer

```ts

- type DeepReadonly<T> = {
- readonly [K in keyof T]: T[K] extends Function | any[]
- ? T[K]
- : T[K] extends object
- ? DeepReadonly<T[K]>
- : T[K];
- };

```
  - Functions and arrays are technically `object` to TypeScript, so the naive `extends object` check would recurse into them — recursing into a function tries to make its parameter types readonly, which goes weird. Filtering them out first is the standard practice. Some teams add more exclusions (e.g., `Date`, `RegExp`, `Map`).

#### From scratch

Implement `Tuple<T, N extends number>` — a tuple type with `N` elements of type `T`. So `Tuple<string, 3>` is `[string, string, string]`. Hint: this is a recursive mapped type over a counter. Look up the type-challenges "Length of String" / "Tuple to Object" puzzles for similar shape. Medium difficulty.

### Worked → faded → blank: a custom `Pick`-variant

#### Worked example (read)

```ts
// Pick keys whose value type matches a predicate:
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

type User = { id: string; name: string; age: number; admin: boolean };
type Strings = PickByValue<User, string>;
// = { id: string; name: string }
type Bools = PickByValue<User, boolean>;
// = { admin: boolean }
```

`PickByValue` is the natural complement to the built-in `Pick<T, K>` (which picks by *key*). Useful when you want "all the fields of this kind."

#### Faded — fill in the blanks

Implement `OmitByValue<T, V>` — the dual that *removes* keys whose value type matches:

```ts
type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? _____ : _____]: T[K];
};
```

- Show the answer

```ts

- type OmitByValue<T, V> = {
- [K in keyof T as T[K] extends V ? never : K]: T[K];
- };

```
  - The conditional is flipped from `PickByValue`. When the value matches, the key becomes `never` (dropped); otherwise it survives. The pattern of "key → never to delete" is the workhorse trick of key remapping.

### Debug-this

```ts
type User = { id: string; name: string; age?: number };

type Validated<T> = {
  [K in keyof T]: T[K];
};

type Result = Validated<User>;
// What's the type? Does optional-ness carry through?
```

- Show the bug
  - **No bug, but a subtle behavior**: the result is `{ id: string; name: string; age?: number | undefined }`. Mapped types preserve the `?` modifier by default. The `T[K]` on the value side includes `undefined` for optional fields because that's how TS represents "missing." This is usually the right behavior, but it surprises people who expected `age` to become `string | undefined` (with no `?`).
  - **Real bug to watch for**: if you strip the `?` accidentally, e.g., by writing `[K in keyof T as K]: ...`, you don't always strip it — but if you use `Required<T>` first or `[K in keyof T]-?`, you do. Mapped types are precise; the modifiers carry through unless you act on them.

### Teach-it-back

Without notes, in ~5 sentences:

> *"Your colleague writes out four object types by hand: PartialUser, ReadonlyUser, NullableUser, RequiredUser. Explain to them how mapped types replace these with one declaration each, and show them how key remapping (the `as` clause) takes it one step further — building shapes like `UserGetters` that change the key names."*

If you can't articulate the leverage, the opening "Why this matters" framing didn't stick. Re-read it.

---

## 🎴 Flashcards (for daily review, not the first read)

- What's a **mapped type**? #card #ts/mapped-types
  - A type of the form `{ [K in T]: U }` that iterates a set of keys (usually `keyof Something`) and produces one property per key. The way to transform every field of an object type at once.
- Difference between an **index signature** and a **mapped type**? #card #ts/mapped-types
  - Index signatures (`{ [k: string]: V }`) declare "any key of this type maps to V" — open-ended. Mapped types iterate a *specific* finite set of keys and produce one property per key — closed.
- Write `Partial<T>` from scratch. #card #ts/mapped-types

```ts

type Partial<T> = { [K in keyof T]?: T[K] };

```
  - The `?` adds optionality to every field. The built-in version is identical.

- Write `Readonly<T>` from scratch. #card #ts/mapped-types
  - ```ts
    type Readonly<T> = { readonly [K in keyof T]: T[K] };
    ```

- Write `Mutable<T>` (strip readonly). #card #ts/mapped-types

```ts

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

```
  - The `-readonly` removes the modifier. Same trick: `-?` strips optionality.

- {{cloze The `-` prefix on a mapped-type modifier (**`-readonly`** or **`-?`**) removes the modifier instead of adding it.}} #card #ts/mapped-types

- Key remapping syntax (TS 4.1+)? #card #ts/mapped-types
  - ```ts
    type Renamed<T> = { [K in keyof T as NewKey]: T[K] };
    ```

The `as NewKey` expression produces a new key for each iteration. If `NewKey` evaluates to `never` for a given iteration, that key is dropped.

- How do you **filter** keys out of an object via key remapping? #card #ts/mapped-types
  - Map the unwanted keys to `never`. Example: `[K in keyof T as T[K] extends Fn ? K : never]: T[K]` keeps only function-valued keys. The `never`-out-of-remap is the standard delete-a-key trick.
- One real-world pattern that uses mapped types? #card #ts/mapped-types
  - Deriving form-value types from a schema (Zod's `z.infer`, react-hook-form's `FieldValues`). The schema is one source of truth; the form runtime and the type system both consume it.
- How do you write a **recursive** mapped type for `DeepReadonly`? #card #ts/mapped-types

```ts

- type DeepReadonly<T> = {
- readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
- };

```
  - The recursive call inside the conditional handles nested objects. Filter out functions/arrays if you don't want to recurse into them.

- {{cloze Mapped types compose with **conditional types** — `T[K] extends X ? Y : Z` in the value position enables per-field transformations.}} #card #ts/mapped-types

- One gotcha when recursing on `T[K] extends object`? #card #ts/mapped-types
  - Functions and arrays satisfy `extends object`. The naive `DeepReadonly` recurses into them, which is rarely what you want. Filter them out first: `T[K] extends Function | any[] ? T[K] : T[K] extends object ? ...`.

---

## ✅ Self-check before moving on

- Can I write `Partial`, `Readonly`, `Mutable`, and `Required` from scratch using mapped-type modifiers?
- Can I use key remapping (`as`) to rename keys *and* to filter keys?
- Can I write `DeepReadonly` and explain why it should filter out functions/arrays?
- Can I name two real-world libraries that lean on mapped types as their type story?

If any "no", do one practice exercise above. If all "yes", move to [[Learning/TypeScript/Template-Literal-Types]].

## 🔗 Related

- Up: [[Learning/TypeScript]]
- Prev: [[Learning/TypeScript/Conditional-Types]]
- Next: [[Learning/TypeScript/Template-Literal-Types]]
- Related: [[Learning/TypeScript/Generics]] (mapped types are usually inside generics)
- Practice problems: [[Learning/TypeScript/Exercises]]
