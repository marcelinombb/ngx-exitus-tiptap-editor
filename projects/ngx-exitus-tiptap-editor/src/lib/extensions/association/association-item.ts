import { Node, mergeAttributes, findParentNode } from '@tiptap/core';
import { AngularNodeViewRenderer } from 'ngx-tiptap';
import { Injector } from '@angular/core';
import { AssociationItemComponent } from './association-item.component';

export interface AssociationItemOptions {
  HTMLAttributes: Record<string, any>;
  injector?: Injector;
}

export const AssociationItem = Node.create<AssociationItemOptions>({
  name: 'associationItem',

  group: 'block',
  content: 'paragraph block*',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      injector: undefined,
    };
  },

  addAttributes() {
    return {
      'data-marker': {
        default: '',
        parseHTML: (element) => element.getAttribute('data-marker'),
        renderHTML: (attributes) => {
          return {
            'data-marker': attributes['data-marker'],
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="association-item"]',
        contentElement: 'div.ex-association-item-content',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Tiptap's renderHTML doesn't natively expose the parent resolution easily without traversing the document.
    // For static rendering, Tiptap passes the `node` object, but not its position or parent.
    // To get the exact list marker on purely static export, we'd need a plugin or to store attrs on the item itself.
    // A common workaround is to ensure the angular component updates an attribute,
    // OR we can output an empty marker that is styled by CSS, but the user explicitly asked for no CSS pseudo-elements.
    // To truly embed the marker statically without CSS, we must pass the marker value from the component to the node attrs
    // OR write a custom HTML serializer rule.
    // For now, let's output the HTMLAttribute 'data-marker' if it exists.

    const markerLabel = HTMLAttributes['data-marker'] || '';

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'association-item',
        class: 'ex-association-item',
      }),
      ['div', { class: 'ex-association-item-marker' }, markerLabel],
      ['div', { class: 'ex-association-item-content' }, 0],
    ];
  },

  addNodeView() {
    if (!this.options.injector) {
      console.warn('AssociationItemExtension: Injector not provided.');
    }
    return AngularNodeViewRenderer(AssociationItemComponent, { injector: this.options.injector! });
  },
});
