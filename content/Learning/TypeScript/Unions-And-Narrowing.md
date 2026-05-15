---
title: Unions-And-Narrowing
tags: [learning, typescript, unions, narrowing]
lastUpdated: 2026-05-15
---
# Unions and narrowing — the workhorse pattern

> **Convention**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

You're modeling the state of a network request. There are four phases:

- **Idle** — haven't fetched yet
- **Loading** — fetch in flight
- **Success** — got data, here it is
- **Error** — fetch failed, here's why
  - The naive shape is one object with optional everything:

```ts
type RequestState = {
  status: string;
  data?: User;
  error?: Error;
  startedAt?: Date;
};
```

This is a disaster, and it's a disaster in a way that the compiler can't help you with. Nothing stops you from reading `state.data` while `state.status === 'error'`. Nothing stops you from forgetting to handle the `'idle'` case. The optional fields say "maybe present" but say nothing about *when*. The runtime invariants live in your head and in code comments, not in the type system.

A **discriminated union** moves those invariants into types:

```ts
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading'; startedAt: Date }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

Now `state.data` is only accessible inside an `if (state.status === 'success')` block — the compiler enforces it. Forget to handle a case? The exhaustiveness check throws a compile error. The runtime invariants are now compile-time invariants. **This is the single most important pattern in TypeScript**, and the rest of this page is about wielding it well.

## A tiny worked example

A UI component that renders one of those four states:

```ts
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading'; startedAt: Date }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function render(state: RequestState<User>): string {
  switch (state.status) {
    case 'idle':
      return 'Click load';
    case 'loading':
      return `Loading since ${state.startedAt.toLocaleTimeString()}`;
    case 'success':
      return `Hello, ${state.data.name}`;
    case 'error':
      return `Failed: ${state.error.message}`;
  }
}
```

Inside each `case`, TypeScript **narrows** `state` to the variant matching that status. `state.data.name` is only legal in the `'success'` branch because TS knows `state.data` doesn't exist in the others. Try to access `state.data` in the `'loading'` branch — compile error.

### Naming the parts as they come up

- **Union type** — `A | B | C`. A value of this type is "one of these."
- **Discriminant** (or **tag**) — the common literal-typed field that lets TS tell variants apart. Above, it's `status`. Convention: use `status`, `kind`, `type`, or `_tag`. **String literals** are what makes the discrimination work — `status: 'idle'` is type `'idle'`, not `string`, so each variant has a unique tag.
- **Variant** — one of the alternatives in the union.
- **Narrowing** — the compiler's act of refining a value's type inside a conditional branch.
  - The pattern goes by several names: **discriminated union**, **tagged union**, **sum type**, **algebraic data type**. They're all the same shape.

## The narrowing techniques

TypeScript narrows on several signals. Mostly they're things you'd write in JavaScript anyway; the win is that the compiler *also* understands them.

### `typeof` — for primitives

```ts
function pad(value: string | number, width: number): string {
  if (typeof value === 'number') {
    return value.toFixed(2).padStart(width);
  }
  return value.padStart(width);
}
```

`typeof` returns `'string' | 'number' | 'boolean' | 'undefined' | 'object' | 'function' | 'bigint' | 'symbol'`. Limited but precise for primitives.

### `instanceof` — for class instances

```ts
function describe(err: Error | string): string {
  if (err instanceof Error) {
    return err.message;       // narrowed to Error
  }
  return err;                  // narrowed to string
}
```

`instanceof` checks prototype chain — works for classes you control, less useful for things-that-aren't-classes. Particularly handy with built-ins (`Error`, `Date`, `URL`, `RegExp`).

### `in` — for "this object has this property"

```ts
type Cat = { meow: () => void };
type Dog = { bark: () => void };

function speak(animal: Cat | Dog) {
  if ('bark' in animal) {
    animal.bark();   // narrowed to Dog
  } else {
    animal.meow();   // narrowed to Cat
  }
}
```

The `in` operator narrows when the property name is a unique key across variants. Useful when you don't control the types to add a discriminant tag.

### Equality narrowing

```ts
function example(x: 'a' | 'b' | 'c') {
  if (x === 'a') {
    // x is 'a' here
  } else {
    // x is 'b' | 'c' here
  }
}
```

The most common case — and what discriminated-union switches use. `switch` on the discriminant is just sugar for a chain of equality checks.

### Truthiness narrowing — careful

```ts
function trim(s: string | null | undefined): string {
  if (s) {
    return s.trim();   // s narrowed to string
  }
  return '';
}
```

A bare `if (s)` filters out `null`, `undefined`, *and* the empty string `''`, *and* `0`, *and* `NaN`. If you actually wanted to allow `''`, you'd need `if (s !== null && s !== undefined)` or `if (s != null)` (the loose-equals trick that catches both nulls).

Truthiness narrowing is the most common source of "narrowed the wrong thing" bugs. Be explicit when you can — and especially turn on the `noUncheckedIndexedAccess` and `strictNullChecks` flags (see [[Learning/TypeScript/Tsconfig-And-Escape-Hatches]]).

## Custom type guards — `x is T`

Built-in narrowers cover most cases. For your own predicates, write a **user-defined type guard**: a function whose return type is `x is T`.

```ts
type Cat = { kind: 'cat'; meow: () => void };
type Dog = { kind: 'dog'; bark: () => void };
type Animal = Cat | Dog;

function isCat(animal: Animal): animal is Cat {
  return animal.kind === 'cat';
}

function speak(animal: Animal) {
  if (isCat(animal)) {
    animal.meow();    // TS knows it's a Cat
  } else {
    animal.bark();    // TS knows it's a Dog
  }
}
```

The return type `animal is Cat` is a **type predicate**. When this function returns true, the compiler narrows the argument to `Cat`. When false, narrows to the complement (here, `Dog`).

A real-world place this is essential: runtime validators. You call `isUser(json)` on parsed JSON; the validator returns a type predicate; the rest of your code gets a properly-typed `User`. This is exactly what [Zod](https://zod.dev/), [io-ts](https://github.com/gcanti/io-ts), and friends do — their `.parse` methods are sophisticated type guards.

### Type guards lie — and the compiler trusts them

Critical caveat:

```ts
function isCat(animal: Animal): animal is Cat {
  return true;   // ← outright lie, compiler doesn't check
}
```

The compiler does **not** verify that the function body actually checks the type. It's a *promise* you're making. If you lie, undefined behavior at runtime. Type guards earn their keep when the runtime check is too complex for TS's built-in narrowers to follow but obviously correct to you — keep them short and audit them.

## Assertion functions — `asserts x is T`

A close cousin to type guards. Instead of returning a boolean, they **throw** if the assertion fails:

```ts
function assertIsUser(value: unknown): asserts value is User {
  if (typeof value !== 'object' || value === null || !('id' in value)) {
    throw new Error('Not a User');
  }
}

function greet(input: unknown) {
  assertIsUser(input);
  console.log(input.id);   // TS knows input is User from here on
}
```

The `asserts value is User` return type tells the compiler: "if this function returns at all, the value is `User`." After the call, the narrowing applies to the rest of the function — no need to put your code inside an `if` block.

When to use which:

- **Type guard (`x is T`)** when you want to *branch* on the result.
- **Assertion function (`asserts x is T`)** when you want to *fail loudly* and treat the success case as the only path forward.
  - Common assertion patterns: input validation at API boundaries, invariant checks, parsing functions that throw on failure.

## Exhaustiveness checking with `never`

You've added a fifth state — `'cancelled'` — to your `RequestState` union. You forgot to update the `switch` in `render`. TypeScript should yell at you. By default, it doesn't. You have to ask:

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function render(state: RequestState<User>): string {
  switch (state.status) {
    case 'idle':     return 'Click load';
    case 'loading':  return `Loading since ${state.startedAt.toLocaleTimeString()}`;
    case 'success':  return `Hello, ${state.data.name}`;
    case 'error':    return `Failed: ${state.error.message}`;
    default:
      return assertNever(state);   // ← compiler error if any case unhandled
  }
}
```

The `never` type is the type with no values. Inside the `default`, if you've handled every case, `state` has been narrowed to `never`. `assertNever(x: never)` accepts only `never`, so passing a not-narrowed `state` is a type error. Add `'cancelled'` to the union, run `tsc`, get an error pointing at the `default:` line. Find every switch over `RequestState` that needs updating with one compile.

- **This is the leverage point.** Discriminated unions + exhaustiveness checking = "the compiler tells me every place that needs updating when I add a state." It's a refactoring tool, not just a typing tool.

`assertNever` is so common it's worth dropping into a `utils.ts` and importing everywhere. Some codebases also write it as an arrow function, or even spell it `unreachable` or `absurd`. The pattern is the standard, not the name.

For the syntactic detail of all these features: [Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html).

## Worked example — a `Result<T, E>` type

The other workhorse discriminated union, beyond UI state: typed error handling.

```ts
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

function parseJSON<T>(raw: string): Result<T, SyntaxError> {
  try {
    return ok(JSON.parse(raw) as T);
  } catch (e) {
    return err(e as SyntaxError);
  }
}

// Use site:
const result = parseJSON<User>(input);
if (result.ok) {
  console.log(result.value.name);    // value exists here
} else {
  console.error(result.error.message); // error exists here
}
```

What this buys you over `try/catch`:

- **Forgetting to handle the error is a type error.** `result.value` doesn't exist until you've checked `result.ok`. The compiler nudges you toward correctness.
- **Errors are typed.** `result.error` is `SyntaxError`, not `unknown` (which is what you get from `catch`). You can be specific about what kinds of failure modes a function returns.
- **Pipelines compose.** `flatMap`-style chaining works naturally — see the next-page conditional types for a fancier `Result` library.
  - Trade-offs:

More verbose at the call site than `try/catch` for the happy path.

Doesn't play perfectly with `async`/`await` (you have to choose between `Promise<Result<T, E>>` and rejecting promises).

The TS standard library doesn't have one, so you build or import (e.g., `neverthrow`, `ts-results`, or roll your own).

Used judiciously — at module boundaries, in parsing functions, at I/O edges — `Result` makes error paths first-class. The pattern is borrowed from Rust, OCaml, F#, and the broader ML family.

## 🔍 Quick check (try before scrolling)

- **Q1**: Given this union, can you access `s.name` inside the `if`? Why or why not?

```ts
type Shape = { kind: 'circle'; radius: number } | { kind: 'square'; side: number };

function area(s: Shape): number {
  if (s.kind === 'circle') {
    return Math.PI * s.radius ** 2;
  }
  // ...
}
```

- Show answer to Q1
  - You can access `s.radius` inside the `if`, but **not** `s.name` — `name` doesn't exist on either variant. The narrowing on `s.kind === 'circle'` refines `s` to `{ kind: 'circle'; radius: number }`, so `s.radius` is available. The fact that the *original* union had no `name` field means there's nothing to narrow to.
  - **Q2**: Why does the snippet below not narrow as you might expect?

```ts
function getId(x: { id: string } | { id: number }): string | number {
  return x.id;
}
```

- Show answer to Q2
  - It actually *does* work — `x.id` is typed as `string | number` because both variants have an `id` field. But there's no narrowing happening because there's no discriminant to narrow on. Both variants share the same field name; the only thing that differs is the field's type. To narrow, you'd need to inspect the type at runtime (`typeof x.id === 'string'`) or add a discriminant tag.
  - The deeper point: narrowing needs a **discriminant** — a field that's a *literal type* and differs between variants. `id: string` vs `id: number` is structurally a union, but it doesn't have a `kind` tag, so TS can't narrow by inspecting properties alone (other than checking the type of `id` itself).
  - **Q3**: Trace through this snippet — what does TypeScript flag when you add a new `'cancelled'` variant?

```ts
type State = { kind: 'on' } | { kind: 'off' };

function describe(s: State): string {
  switch (s.kind) {
    case 'on':  return 'on';
    case 'off': return 'off';
  }
}
```

- Show answer to Q3
  - **As written, TypeScript flags nothing when you add `'cancelled'`** — the function has no `default` case, and TS will only complain *if* you use the function's return value somewhere that expects a string (because the function might return `undefined`). The trap: if all your callers ignore the return value, the breakage is silent.
  - Fix: add a `default: return assertNever(s);` clause. Then adding `'cancelled'` to the union fails at the `default:` line with a clear error, and the call sites stay clean. Exhaustiveness is opt-in, not automatic — **always opt in for state machines.**

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: build a UI state machine

#### Worked example (read)

A typed-state-machine for a login form:

```ts
type LoginState =
  | { status: 'idle' }
  | { status: 'validating'; email: string; password: string }
  | { status: 'submitting'; email: string; password: string }
  | { status: 'success'; user: User }
  | { status: 'error'; reason: 'invalid' | 'network' | 'server'; message: string };

type LoginEvent =
  | { type: 'SUBMIT'; email: string; password: string }
  | { type: 'VALIDATED' }
  | { type: 'SUCCESS'; user: User }
  | { type: 'FAILURE'; reason: 'invalid' | 'network' | 'server'; message: string }
  | { type: 'RESET' };

function reduce(state: LoginState, event: LoginEvent): LoginState {
  switch (state.status) {
    case 'idle':
      if (event.type === 'SUBMIT') {
        return { status: 'validating', email: event.email, password: event.password };
      }
      return state;
    case 'validating':
      if (event.type === 'VALIDATED') {
        return { status: 'submitting', email: state.email, password: state.password };
      }
      if (event.type === 'FAILURE') {
        return { status: 'error', reason: event.reason, message: event.message };
      }
      return state;
    // ... other states
    default:
      return assertNever(state);
  }
}
```

The reducer is a 2D state machine: every (state, event) pair has a defined behavior or stays in the current state. The discriminated unions make invalid combinations *unreachable*.

#### Faded — fill in the blanks

Complete the `submitting` case in the reducer above:

```ts
case 'submitting':
  if (event.type === 'SUCCESS') {
    // FILL: transition to success state
    return _____________________________________;
  }
  if (event.type === 'FAILURE') {
    return { status: 'error', reason: event.reason, message: event.message };
  }
  return state;
```

- Show the answer

```ts

return { status: 'success', user: event.user };

```
  - Note `event.user` is only available inside the `event.type === 'SUCCESS'` narrow — TS would have errored if you tried to use `event.user` in the `'FAILURE'` branch. The reducer's correctness is guarded by narrowing at every level.

#### From scratch

Implement a `Result<T, E>` type and three helpers: `ok(value)`, `err(error)`, and `mapResult(result, fn)` where `fn` transforms the value if `ok` and leaves the error untouched. Bonus: implement `flatMap(result, fn)` where `fn` itself returns a `Result`. Test that exhaustiveness works.

### Worked → faded → blank: custom type guard for runtime validation

#### Worked example (read)

```ts
type User = { id: string; name: string; age: number };

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).name === 'string' &&
    typeof (value as any).age === 'number'
  );
}

const raw: unknown = JSON.parse(input);
if (isUser(raw)) {
  console.log(raw.name);  // TS knows raw is User
}
```

The `as any` casts inside the predicate are unavoidable — you're inspecting an `unknown` value, and TS won't let you index it. Keeping the guard short and audited is how you contain the lie.

#### Faded — fill in the blanks

Convert the type guard above to an **assertion function**:

```ts
function assertIsUser(value: unknown): _________________ {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as any).id !== 'string' ||
    typeof (value as any).name !== 'string' ||
    typeof (value as any).age !== 'number'
  ) {
    throw new Error('Not a User');
  }
}
```

- Show the answer

```ts

function assertIsUser(value: unknown): asserts value is User {

```
  - The condition is inverted from the boolean predicate (we throw on the *failure* case, so the check is the negation of `isUser`'s return). After calling `assertIsUser(raw)`, the rest of the function gets `raw: User` automatically — no `if` block needed.

### Debug-this

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(s: Shape): number {
  if (s.kind === 'circle') {
    return Math.PI * s.radius ** 2;
  }
  if (s.kind === 'rectangle') {
    return s.width * s.height;
  }
  // forgot exhaustiveness check
}

// Later, the union grew:
type Shape2 =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };
```

What goes wrong when you swap `Shape` for `Shape2`? How would `assertNever` have caught it?

- Show the bug
  - **Without exhaustiveness check**: `area` returns `undefined` for triangles silently. TS *might* complain at the call site that the return is `number | undefined`, but only if `noImplicitReturns` is on — and the call site sees `area(triangle).toFixed(2)` as a possible runtime crash via undefined.
  - **With `default: return assertNever(s)`**: adding `'triangle'` to the union causes a compile error at the `default:` line, pointing directly to the unhandled case. You learn about the breakage before the code ships.
  - Lesson: exhaustiveness checks are not paranoia; they're how discriminated unions earn their keep over the lifetime of a codebase. The variant set changes; the compiler should catch every site that needs updating.

### Teach-it-back

Without notes, in ~4 sentences:

> *"A junior developer is modeling a fetch result as `{ data?: T; error?: Error; loading: boolean }`. Convert their type to a discriminated union and explain to them what they gain — particularly in a codebase that's about to add a fifth state."*

If you can't, the "encoded invariants" framing didn't land. Re-read the opening "Why this matters" and the exhaustiveness section.

---

## 🎴 Flashcards (for daily review, not the first read)

- What's a **discriminated union**? #card
  - A union of object types that share a common literal-typed field (the discriminant). Narrowing on that field gives access to variant-specific fields. The workhorse pattern for state modeling in TS.
- What makes a field a valid **discriminant**? #card
  - It must be a **literal type** (e.g., `'idle'`, `'loading'`) and **unique per variant**. Without literal types, narrowing on equality doesn't work. Without uniqueness, narrowing is ambiguous.
- {{cloze The most common discriminant field names are **`kind`**, **`type`**, **`status`**, or **`_tag`**.}} #card
- TS narrows on `typeof x === 'string'` — what does it not narrow on? #card
  - It doesn't narrow on non-primitive checks like `Array.isArray` *without* the type guard signature. (Actually `Array.isArray` is a type guard in modern TS lib.d.ts.) The general principle: TS narrows on built-in operators (`typeof`, `instanceof`, `in`, equality) and on functions whose return type is a `x is T` predicate. Custom boolean returns *don't* narrow.
- Signature for a user-defined **type guard**? #card

```ts

function isCat(animal: Animal): animal is Cat

```
  - The `animal is Cat` return type is a type predicate. When the function returns true, the compiler narrows the argument to `Cat`.

- Signature for an **assertion function**? #card
  - ```ts
    function assertIsUser(value: unknown): asserts value is User
    ```

If the function returns at all (i.e., doesn't throw), the value is narrowed to `User` for the rest of the calling scope.

- Type guard vs assertion function — when to use which? #card
  - **Type guard** when you want to *branch* on the result (`if (isCat(x))`). **Assertion function** when failure should *throw* and the success case is the only path forward (`assertIsUser(input); use(input);`).
- One real-world place to use a custom type guard? #card
  - Validating parsed JSON / network response shapes. The body of the guard does the runtime check; the type predicate gives you a typed value for the rest of the code. This is what Zod/io-ts automate.
- What is the `never` type? #card
  - The type with no values. Appears as the type of unreachable code paths, exhausted discriminated unions, and the return type of functions that always throw.
- What does `assertNever(x: never): never` do? #card
  - Enforces exhaustiveness checks. Inside a fully-narrowed `default:` branch, the variable should be `never`. If a new union variant is added without handling, the call fails to type-check — pointing you at every site that needs updating.
- {{cloze Truthiness narrowing (`if (s)`) filters out `null`, `undefined`, `0`, `''`, and `NaN`. Use **`!= null`** or explicit checks when you want only the nullish ones.}} #card
- Two reasons to prefer `Result<T, E>` over `try/catch`? #card
  - (1) Forgetting to handle the error is a *compile* error, not a runtime crash. (2) The error type is specific (not `unknown`). Trade-off: more verbose for the happy path.
- The discriminated-union pattern is also called... #card
  - **Tagged union**, **sum type**, or **algebraic data type**. All the same shape; the names come from different language traditions (Rust calls them enums, Haskell calls them sum types, TS just calls them unions).

---

## ✅ Self-check before moving on

Can I model a 4-state UI request as a discriminated union from a blank file, without copying?

Can I write a user-defined type guard *and* an assertion function for the same predicate, and explain when I'd use each?

Can I write `assertNever` and explain what it catches that a switch without `default` doesn't?

Could I refactor a `{ data?, error?, loading }` shape into a discriminated union and explain the wins?

If any "no", do one practice exercise above. If all "yes", move to [[Learning/TypeScript/Generics]].

## 🔗 Related

Up: [[Learning/TypeScript]]

Prev: [[Learning/TypeScript/Foundations]]

Next: [[Learning/TypeScript/Generics]]

Related: [[Learning/TypeScript/Tsconfig-And-Escape-Hatches]] (strict-null and exhaustiveness flags)

Practice problems: [[Learning/TypeScript/Exercises]]
