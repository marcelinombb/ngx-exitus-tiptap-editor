---
name: tiptap-angular-nodeview
description: >
  Use this skill whenever you need to create or modify custom Tiptap extensions that require 
  an interactive Angular Component (NodeView) or a Floating Menu (Bubble Menu) in this project. 
  It provides the exact architecture, boilerplate, and dependency injection patterns used in the ngx-exitus-tiptap-editor.
---

# Tiptap Angular NodeView & Floating Menu Implementation Guide

This project uses a custom integration to map Angular components to Tiptap nodes (`AngularNodeViewRenderer`). When tasked with building an interactive Tiptap node with an Angular Component and/or a dynamic Floating Menu, follow these architectural rules and patterns closely.

## 1. Creating the Angular NodeView Component

NodeViews allow you to render complex interactive UI for a ProseMirror node, using standard Angular Components.

### Key Rules for Components:

- The component **must** implement the `AngularNodeViewComponent` interface from `ngx-tiptap`.
- It **should** be a Standalone Component (`standalone: true`).
- Input properties like `node` and `editor` should ideally use Angular Signals (`input.required<ProseMirrorNode>()`, `input.required<Editor>()`) since the custom `AngularNodeViewRenderer` supports `setInput`.
- If the node allows nested editable content (e.g., paragraphs inside a box), include an element with the `data-node-view-content` attribute in your template where the content should be rendered.

### Component Template Example (`my-node.component.ts`):

```typescript
import { Component, input } from '@angular/core';
import { AngularNodeViewComponent } from 'ngx-tiptap';
import { Editor } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

@Component({
  selector: 'app-my-node',
  standalone: true,
  template: `
    <div class="my-node-wrapper">
      <div class="header">
        <button (click)="increment()">Contador: {{ node().attrs['count'] }}</button>
      </div>
      <!-- ProseMirror will inject nested editable content here: -->
      <div data-node-view-content></div>
    </div>
  `,
  styles: [\`
    .my-node-wrapper { border: 1px solid #ccc; padding: 1rem; }
  \`]
})
export class MyNodeComponent implements AngularNodeViewComponent {
  node = input.required<ProseMirrorNode>();
  editor = input.required<Editor>();
  // Other properties from AngularNodeViewComponent:
  // updateAttributes!: (attrs: Record<string, any>) => void; // Available if extending AngularNodeViewComponent base class or injected.

  // NOTE: If using Angular 14+ signals, you might just call editor commands directly
  // to update the current node attributes instead of relying on updateAttributes shortcut.

  increment() {
    // Standard way to update attrs of the current node if you know its position
    // Or dispatch a transaction.
  }
}
```

## 2. Registering the NodeView in the Tiptap Extension

The extension must expose a way to receive the Angular `Injector`, which is required by `AngularNodeViewRenderer`.

### Key Rules for the Extension:

- Define an interface for options that includes `injector?: Injector`.
- In `addOptions()`, default `injector` to `undefined`.
- In `addNodeView()`, return `AngularNodeViewRenderer(MyNodeComponent, { injector: this.options.injector! })`.

### Extension Example (`my-extension.ts`):

```typescript
import { Node, mergeAttributes } from '@tiptap/core';
import { AngularNodeViewRenderer } from '../../utils/angular-node-view-renderer'; // Adjust path
import { MyNodeComponent } from './my-node.component';
import { Injector } from '@angular/core';

export interface MyNodeOptions {
  HTMLAttributes: Record<string, any>;
  injector?: Injector;
}

export const MyExtension = Node.create<MyNodeOptions>({
  name: 'myExtension',
  group: 'block',
  content: 'block+', // if it holds content

  addOptions() {
    return {
      HTMLAttributes: {},
      injector: undefined,
    };
  },

  addAttributes() {
    return {
      count: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="my-extension"]', contentElement: '[data-node-view-content]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'my-extension' }),
      0,
    ];
  },

  addNodeView() {
    return AngularNodeViewRenderer(MyNodeComponent, { injector: this.options.injector! });
  },
});
```

_Note: The Injector is passed to the extension via `.configure({ injector: this.injector })` when the editor is instantiated in the main component._

## 3. Creating a Floating Menu (Bubble Menu) for the Extension

Floating menus provide contextual toolbars when a specific node is focused.

### Key Rules for Floating Menus:

- Create an Angular standalone component.
- Inject `FloatingMenuService`. In `ngOnInit`, call `this.floatingMenuService.registerMenu('myExtensionName')`.
- Listen to editor events (`transaction`, `selectionUpdate`, `focus`) to sync state from the active node's attributes to local Signals.
- Wrap your HTML in an element using the custom directive `[tiptapBubbleMenu]`.

### Floating Menu Example (`my-node-floating-menu.component.ts`):

```typescript
import { Component, input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Editor, findParentNode } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TiptapBubbleMenuDirective } from '../../directives/tiptap-bubble-menu.directive';
import { FloatingMenuService } from '../../services/floating-menu.service';

@Component({
  selector: 'my-extension-floating-menu',
  standalone: true,
  imports: [TiptapBubbleMenuDirective],
  template: \`
    <div class="bubble-menu-wrapper" tiptapBubbleMenu
      [editor]="editor()"
      [shouldShow]="shouldShow"
      [pluginKey]="'myExtensionBubbleMenu'"
      [getReferencedVirtualElement]="getReferencedVirtualElement"
      [options]="{ flip: true, placement: 'top', onShow }"
    >
      <div class="toolbar-items">
         <!-- Add inputs, selects, or editor-button components here -->
         <button (click)="doSomething()">Ação</button>
      </div>
    </div>
  \`,
  styles: [\`
    .bubble-menu-wrapper { background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 0.5rem; }
  \`]
})
export class MyExtensionFloatingMenuComponent implements OnInit, OnDestroy {
  editor = input.required<Editor>();
  private floatingMenuService = inject(FloatingMenuService);

  // Local state based on node attributes
  myValue = signal<string>('');

  ngOnInit() {
    this.floatingMenuService.registerMenu('myExtension');
    this.editor().on('transaction', () => this.syncState());
    this.editor().on('selectionUpdate', () => this.syncState());
    this.editor().on('focus', () => this.syncState());
    this.syncState();
  }

  ngOnDestroy() {
    this.editor().off('transaction', this.syncState);
    this.editor().off('selectionUpdate', this.syncState);
    this.editor().off('focus', this.syncState);
  }

  private syncState() {
    const attrs = this.editor().getAttributes('myExtension');
    if (Object.keys(attrs).length > 0) {
      this.myValue.set(attrs['myAttribute'] || '');
    }
  }

  shouldShow = ({ editor }: { editor: Editor }) => {
    if (!editor.isFocused) return false;
    return this.floatingMenuService.isMostSpecificNodeActive(editor, 'myExtension');
  };

  onShow = () => {
    requestAnimationFrame(() => this.editor().commands.setMeta('bubbleMenu', 'updatePosition'));
  };

  getReferencedVirtualElement = () => {
    const { state, view } = this.editor();
    const { selection } = state;

    let targetNode: { node: ProseMirrorNode; pos: number } | undefined;

    // Support NodeSelection (direct click on the node)
    if (selection instanceof NodeSelection && selection.node.type.name === 'myExtension') {
      targetNode = { node: selection.node, pos: selection.from };
    } else {
      // Support TextSelection (cursor inside the node)
      targetNode = findParentNode((node) => node.type.name === 'myExtension')(selection);
    }

    if (targetNode) {
      const dom = view.nodeDOM(targetNode.pos) as HTMLElement | null;
      if (!dom) return null;
      return { getBoundingClientRect: () => dom.getBoundingClientRect() };
    }
    return null;
  }

  doSomething() {
    // this.editor().chain().focus().updateAttributes('myExtension', { ... }).run();
  }
}
```

By following this precise sequence and utilizing the provided service (`FloatingMenuService`) and directives (`tiptapBubbleMenu` and `AngularNodeViewRenderer`), you ensure that node views render performantly and that the contextual menus appear precisely above the active node boundary without flickering.
