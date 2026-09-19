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
    unit: '93 tests passing (Demo: 2, Lib: 91)'
    target: 80% (Core Extensions) / 60% (UI)
    status: 100% pass rate

  infrastructure_health:
    linter_configured: true (0 errors)
    formatter_enforced: true (Prettier 100% compliant)
    ci_pipeline_gates: true (.github/workflows/ci.yml: test:ci + lint + format:check + build:lib)
```

### Problematic God Classes

```python
complex_files_tracker = {
    "Figure.ts": {"status": "Refactored into figure-commands, figure-plugins, figure-utils", "lines": 173},
    "ImageCropper.ts": {"status": "Decoupled into image-cropper-math and image-cropper-canvas", "lines": 333},
    "custom-column-resizing.ts": {"status": "Decoupled into table-resizing-math with typed properties", "lines": 391},
}
```

---

## 4. Prioritized Remediation Plan

### Quick Wins (High Value, Low Effort) - Concluído ✅

1. **Setup Linting & Prettier Gates** ✅
   - Configuração do ESLint saneada (161 erros eliminados -> 0 erros).
   - Formatação Prettier 100% aplicada e verificável via `npm run format:check`.
2. **Setup basic Testing Scaffold & Core Specs** ✅
   - Corrigido loader de SVG do Wiris MathType no runner de testes (`angular.json`).
   - Suíte de testes headless (`npm run test:ci`) executando com 100% de sucesso (67/67 testes passando).
   - Cobertura de testes unitários para as extensões essenciais:
     - `Figure` ([figure.spec.ts](file:///home/marcelino/Documentos/ngx-exitus-tiptap-editor/projects/ngx-exitus-tiptap-editor/src/lib/extensions/image/figure.spec.ts))
     - `AnswerBox` ([answer-box.spec.ts](file:///home/marcelino/Documentos/ngx-exitus-tiptap-editor/projects/ngx-exitus-tiptap-editor/src/lib/extensions/answer-box/answer-box.spec.ts))
     - `ColarQuestao` ([colar-questao.spec.ts](file:///home/marcelino/Documentos/ngx-exitus-tiptap-editor/projects/ngx-exitus-tiptap-editor/src/lib/extensions/colar-questao/colar-questao.spec.ts))
     - `TableExtensions` ([table.spec.ts](file:///home/marcelino/Documentos/ngx-exitus-tiptap-editor/projects/ngx-exitus-tiptap-editor/src/lib/extensions/table/table.spec.ts))
     - `Alternative` ([alternative.spec.ts](file:///home/marcelino/Documentos/ngx-exitus-tiptap-editor/projects/ngx-exitus-tiptap-editor/src/lib/extensions/alternatives/alternative.spec.ts))
     - `Association` ([association.spec.ts](file:///home/marcelino/Documentos/ngx-exitus-tiptap-editor/projects/ngx-exitus-tiptap-editor/src/lib/extensions/association/association.spec.ts))

### Medium-Term Improvements (Month 1-3)

1. **Refactor duplicated Logic in Extensions** ✅
   - Extracted node lookup logic into `utils/tiptap-selection.ts` (`findNodeFromSelection`, `findFigureNode`).
   - Covered `tiptap-selection.ts` with unit tests (`tiptap-selection.spec.ts`).
   - Replaced duplicate selection lookup in `figure-commands.ts`, `answer-box.ts`, `image-floating-menu.component.ts`, `answer-box-floating-menu.component.ts`, and `table-floating-menu.component.ts`.
   - Extracted duplicate button styles into shared partial `styles/_insert-paragraph-btn.scss` for `image`, `table`, and `answer-box`.
   - Suíte de testes atualizada: 70/70 testes passando com 0 erros de linting.

### Long-Term Initiatives (Quarter 2-4)

1. **Refactor God Classes** ✅
   - `Figure.ts` modularized into `Figure.ts`, `figure-commands.ts`, `figure-plugins.ts`, and `figure-utils.ts`.
   - `ImageCropper.ts` decoupled: extracted pure geometry calculation into `image-cropper-math.ts` and offscreen canvas operations into `image-cropper-canvas.ts`.
   - `custom-column-resizing.ts` decoupled: extracted table column resizing math into `table-resizing-math.ts`, eliminated loose `any` casts.
   - Criados testes unitários para a lógica de redimensionamento (`image-cropper-math.spec.ts` e `table-resizing-math.spec.ts`).
   - Suíte de testes expandida para 86/86 testes passando com 0 erros de linting e build limpo.
2. **Decouple Angular from Tiptap Core & Modularize Extension Factory** ✅
   - Modularized `extension-factory.ts` into individual feature bundle factories:
     - `createCoreExtensions()`
     - `createMathExtensions()`
     - `createImageExtensions(injector, imageConfig)`
     - `createQuestionExtensions(injector)`
     - `createTableExtensions()`
     - `createSpellCheckerExtensions(spellCheckerConfig)`
   - Created comprehensive unit tests in `extension-factory.spec.ts`.
   - Test suite updated: 93/93 tests passing with 0 ESLint errors and clean library build.
3. **Core Extension Testing, Sass Modernization & Dead Code Purge** ✅
   - Expanded unit test coverage across core extensions:
     - `CustomParagraph` & `normalizeEmptyIndentedParagraphs` (`paragraph.spec.ts`)
     - `Tab` atom node & keyboard shortcuts (`tab.spec.ts`)
     - `Indent` command calculations & list guards (`indent.spec.ts`)
     - `SpecialCharactersComponent` UI, search and insertion (`special-characters.component.spec.ts`)
   - Test suite reached **121 of 121 tests passing (100% success)**.
   - Refactored `tab.ts` command to eliminate ProseMirror transaction collision (`RangeError`).
   - Modernized Sass import rules (`@use './editor.scss' as *;`) removing Dart Sass 3.0 deprecation warnings.
   - Purged dead legacy CKEditor code (`SpecialCharactersPlugin.ts` and orphaned styles).
   - Enriched `public-api.ts` to export modular bundle factories, extensions, and helper utilities.

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
