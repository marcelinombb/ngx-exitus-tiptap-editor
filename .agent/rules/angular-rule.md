---
trigger: model_decision
description: when working with angular
---

# Quick Guide — AI Agent as Senior Angular Developer

## Mindset

- Think **architecture before code**
- Prioritize **clarity, predictability, and scale**
- Understand the cost of **Change Detection**
- Use **modern Angular** (v18+)
- Always **explain decisions and trade-offs**

### ❌ Never:

- Use `any` without justification
- Create giant services
- Mix domain logic with UI
- Use RxJS out of habit when signals suffice

---

## Mandatory Patterns

**Always use:**
- Standalone Components
- Signals
- `inject()` when appropriate
- `@if`, `@for`, `@switch`
- `OnPush` strategy
- Lazy loading by default

### ❌ Avoid:

- Creating new NgModules
- `subscribe()` in components
- Pipes with business logic

---

## Architecture

**Organize by domain, not by file type:**
```
features/   → business logic
shared/     → reusable components
core/       → infrastructure
```

---

## Signals

**Use for local state and UI:**
- Derive state with `computed()`
- Use `effect()` only for lightweight side effects
- Never duplicate state

---

## RxJS vs Signals

**Clear separation:**
- **Signals** → synchronous state / UI
- **RxJS** → async operations, HTTP, complex streams

> **Rule of thumb:** HTTP is Observable, state is Signal

---

## Components

**Principles:**
- Small and focused
- Reactive inputs/outputs
- Always `OnPush`
- Components = pure functions of state

### ❌ Never:

- Direct DOM manipulation
- HTTP calls in components
- Giant "smart" components

---

## Templates

**Best practices:**
- Use `@if`, `@for` (with `track`), `@switch`
- Keep templates declarative
- Minimize logic in templates

---

## State Management

**Guidelines:**
- Services as boundaries
- Store per feature
- Signals whenever possible
- Avoid unnecessary global state

---

## Performance

**Critical optimizations:**
- `OnPush` always
- `trackBy` mandatory for lists
- Avoid unnecessary re-renders
- Use signals to reduce Change Detection cycles

---

## Communication

**The agent MUST:**
- Explain why signals or RxJS was chosen
- Make impacts and alternatives clear
- Never copy legacy patterns out of inertia

---

## Decision Framework

| Scenario | Solution |
|----------|----------|
| Local UI state | Signals |
| HTTP request | Observable → Signal |
| Complex async flow | RxJS |
| Derived state | `computed()` |
| Side effect | `effect()` (sparingly) |
| Component communication | Signals + `input()`/`output()` |

---

## Code Quality Checklist

Before delivering code, verify:

- ✅ All components use `OnPush`
- ✅ No `subscribe()` in component classes
- ✅ Signals used for reactive state
- ✅ `@for` loops have `track`
- ✅ Business logic is in services
- ✅ No `any` types without justification
- ✅ Architecture decisions are explained

---

## Guiding Principle

> "In modern Angular, reactivity flows through signals and observables.  
> Components render. Services orchestrate. State is explicit."

---

## Common Pitfalls to Avoid

1. **Over-engineering with RxJS** when simple signals suffice
2. **Under-engineering with signals** when complex async logic needs RxJS
3. **Mixing patterns** without clear boundaries
4. **Premature optimization** before understanding the actual bottleneck
5. **Copying old patterns** just because "it worked before"

---

**BUT:** Always document why you're deviating and what the migration path is.