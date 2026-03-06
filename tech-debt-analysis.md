# Technical Debt Analysis and Remediation: ngx-exitus-tiptap-editor

## 1. Debt Inventory

### Code Debt

- **Duplicated Code**
  - **Identified**: 22 code clones found (approx. 4.4% duplication across 8.7k lines of code).
  - **Locations**: SCSS styles duplicated between `image/style.scss` and `table/style.scss`. TypeScript logic clones found across plugin configs (e.g., `SpellCheckerPlugin.ts` and `SpecialCharactersPlugin.ts`), node discovery logic inside commands in `Figure.ts` (repeated `selection instanceof NodeSelection...`).
  - **Quantified**: ~362 lines of pure duplicated code.
- **Complex Code & God Classes**
  - **Identified**: Massive monolithic classes handling too many responsibilities (UI, commands, drag-and-drop, state).
  - **Locations**:
    - `Figure.ts` (452 lines)
    - `ImageCropper.ts` (408 lines)
    - `custom-column-resizing.ts` (394 lines)
    - `MathTypePlugin.ts` (266 lines)

### Architecture Debt

- **Design Flaws & Coupling**
  - **Tight Coupling to Angular**: Tiptap extensions (e.g., `Figure`, `ColarQuestao`, `AnswerBox`, `Alternative`, `Association`) directly receive and handle the Angular `Injector`. This makes the extensions harder to test and isolates them from the broader Tiptap ecosystem patterns.
  - **Monolithic Setup**: `exitus-tiptap-editor.ts` initializes dozens of plugins in a monolithic configuration block instead of using factory patterns or modular plugin builders.
  - **Feature Envy**: Command business logic (resizing, cropping, grayscale) is directly embedded within the exact Node definition (`Figure.ts`).

### Testing Debt

- **Coverage Gaps**
  - **Identified**: Absolute zero unit tests for the core library codebase.
  - **Quantified**: 0 `.spec.ts` files located inside `projects/ngx-exitus-tiptap-editor/src/lib`. 0% Unit Test coverage. 0% Integration/E2E coverage.
- **Test Quality**
  - No automated test execution is possible to validate AST node manipulations, placing the entire burden on manual QA for every release.

### Documentation Debt

- **Missing Documentation**
  - **Identified**: No API reference, zero usage documentation for the generated extensions, and extremely spare inline comments outlining complex DOM manipulations (e.g., drag-and-drop fallbacks, selection loops).
  - **Quantified**: Only 348 lines of comments out of 8,700 total lines (mostly auto-generated or commented-out code).

### Infrastructure Debt

- **Tooling Issues**
  - **Missing Linters**: `ng lint` / `npm run lint` missing from configuration. Angular ESLint is absent.
  - **Formatter Setup**: `prettier` configuration exists in `package.json`, but no format checking scripts or CI configurations trigger it.
  - **Quantified**: No quality gate stopping bad commits.

---

## 2. Impact Assessment

**Development Velocity Impact**

- **Debt Item**: Zero unit tests & tight Angular/Tiptap coupling.
- **Time Impact**:
  - Every UI or architecture refactor (like Angular version updates) requires 100% manual regression testing.
  - Adding a new complex feature to `Figure.ts` takes longer due to navigating 450+ lines of mixed commands.
  - **Monthly impact**: ~30-40 hours purely on manual regression checks and bug hunting.
- **Annual Cost**: ~400 hours × $100/hour = $40,000 developer time cost.

**Quality Impact**

- **Debt Item**: Duplicate code paths in commands & styling.
- **Bug Rate**: Fixing a bug in alignment styling or node discovery logic must be patched in multiple places. Missed patches lead to inconsistent UI editor behavior.
- **Risk Assessment**:
  - **Critical**: 0% test coverage means high risk of silent data corruption in the WYSIWYG JSON/HTML outputs.
  - **High**: Architectural debt coupling makes framework upgrades (e.g., Angular 20+) highly brittle.

---

## 3. Debt Metrics Dashboard

### Code Quality Metrics

```yaml
Metrics:
  code_duplication:
    current: 4.42% (22 clones)
    target: < 2.0%
    duplication_hotspots:
      - src/lib/extensions/table vs src/lib/extensions/image
      - Figure.ts command handlers

  test_coverage:
    unit: 0%
    integration: 0%
    target: 80% (Core Extensions) / 60% (UI)

  infrastructure_health:
    linter_configured: false
    formatter_enforced: false
    ci_pipeline_gates: false
```

### Problematic God Classes

```python
complex_files_tracker = {
    "Figure.ts": {"lines": 452, "issue": "Mixed DOM Drag events, Node definition, Commands"},
    "ImageCropper.ts": {"lines": 408, "issue": "High UI and state complexity"},
    "custom-column-resizing.ts": {"lines": 394, "issue": "Manual DOM calculations"},
}
```

---

## 4. Prioritized Remediation Plan

### Quick Wins (High Value, Low Effort) - Week 1

1. **Setup Linting & Prettier Gates**
   - Add `angular-eslint` to the project.
   - Configure pre-commit hooks (e.g., husky + lint-staged) to enforce formatting and linting rules.
   - _Effort: 4 hours. ROI: Immediate consistency, preventing new style debt._
2. **Setup basic Testing Scaffold**
   - Configure Karma/Jasmine (or migrate to Jest/Vitest) for the library component, writing the first 5 core rendering tests for the Exitus Editor wrapper.
   - _Effort: 8 hours. ROI: Base safety net for future work._

### Medium-Term Improvements (Month 1-3)

1. **Refactor duplicated Logic in Extensions**
   - Extract the node lookup logic (`selection instanceof NodeSelection...`) from `Figure.ts` into a `utils/node-helpers.ts` shared library.
   - Combine shared SCSS from Image and Table into core editor design tokens.
   - _Effort: 15 hours. ROI: Reduced surface area for bugs._
2. **Increase Test Coverage Strategy**
   - Focus unit tests on custom Tiptap extensions (rendering nodes and parsing HTML).
   - Write tests for custom Commands (e.g., `setImageAlignment`, `cropImage`).
   - _Effort: 40 hours. ROI: Catch 80% of AST and parsing regressions._

### Long-Term Initiatives (Quarter 2-4)

1. **Refactor God Classes**
   - Split `Figure.ts` into smaller modules: `figure-node.ts`, `figure-commands.ts`, `figure-plugins.ts` (drag-drop behavior).
   - Componentize `exitus-tiptap-editor.ts` plugin initializations into cleaner builder functions/factories.
2. **Decouple Angular from Tiptap Core**
   - Review patterns for `AngularNodeViewRenderer` to avoid manually passing the `Injector` across all extension `.configure()` calls, utilizing context injection or Angular 16+ runInContext where appropriate.

---

## 5. Implementation Strategy

### Incremental Refactoring Example (Figure.ts)

**Phase 1: Extract Shared Utilities**

```typescript
// utils/tiptap-selection.ts
export function findNodeFromSelection(selection: Selection, nodeName: string) {
  if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
    return { node: selection.node, pos: selection.from };
  }
  return findParentNode((node) => node.type.name === nodeName)(selection);
}
```

**Phase 2: Slim Down Figure Commands**

```typescript
// Replace repetitive lookup logic inside Figure.ts commands
setImageWidth: (width: number | null) =>
  ({ tr, state, dispatch }) => {
    const figureNode = findNodeFromSelection(state.selection, 'figure');
    if (!figureNode) return false;

    tr = tr.setNodeMarkup(figureNode.pos, undefined, { ...figureNode.node.attrs, width });
    if (tr.docChanged) {
      dispatch && dispatch(tr);
      return true;
    }
    return false;
  };
```

---

## 6. Prevention Strategy

**Automated Quality Gates**

```yaml
pre_commit_hooks:
  - lint_check: 'npm run lint'
  - format_check: 'npx prettier --check'

ci_pipeline:
  - build_check: 'ng build ngx-exitus-tiptap-editor'
  - unit_tests: 'ng test --no-watch --code-coverage'
  - coverage_gate: 'min 0% -> gradually push to 80% on new files'
```

**Debt Budget Guidelines**

- No new features can be added without at least covering the new extension logic with `.spec.ts` unit parsing tests.
- Commits must not fail basic Angular compilation or Prettier styling.

---

## 7. Communication Plan

To be shared with engineering and management:

### Executive Summary

- **Current state**: The editor library currently carries a high degree of technical debt, largely driven by 0% test coverage and heavily monolithic extension classes.
- **Risk factor**: High. Upgrades to Angular or Tiptap risk widespread editor breakage because regressions are caught entirely manually.
- **Proposed Focus**: Establish linting/formatting immediately, implement a core testing layer across the next two sprints, and subsequently refactor monolithic files (like `Figure.ts`).
- **Expected ROI**: Faster onboarding of new capabilities (less time manually testing), and guaranteed data integrity when converting back and forth from HTML/JSON.

## 8. Success Metrics

- **S1 (Month 1)**: Linting enforced natively; CI build implemented. First 20% test coverage achieved on parsing rules.
- **S2 (Month 3)**: Duplicated code drops below 2%. `Figure.ts` lines of code drops below 200 lines through module delegation.
- **S3 (Month 6)**: 80% test coverage on all custom editor extensions. Regression bugs reduced by 70%.
