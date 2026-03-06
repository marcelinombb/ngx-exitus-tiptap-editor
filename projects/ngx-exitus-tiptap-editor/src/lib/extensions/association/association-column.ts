import { Node, mergeAttributes } from '@tiptap/core';
import { AngularNodeViewRenderer } from 'ngx-tiptap';
import { Injector } from '@angular/core';
import { AssociationColumnComponent } from './association-column.component';

export interface AssociationColumnOptions {
  HTMLAttributes: Record<string, any>;
  injector?: Injector;
}

export const AssociationColumn = Node.create<AssociationColumnOptions>({
  name: 'associationColumn',

  group: 'block',
  content: 'associationItem+',
  defining: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      injector: undefined,
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'colA', // 'colA' or 'colB'
        parseHTML: (element) => element.getAttribute('data-col-type'),
        renderHTML: (attributes) => {
          return {
            'data-col-type': attributes['type'],
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="association-column"]',
        contentElement: 'div.ex-association-col-content',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'association-column',
        class: 'ex-association-col-wrapper',
      }),
      ['div', { class: 'ex-association-col-content' }, 0],
    ];
  },

  addNodeView() {
    if (!this.options.injector) {
      console.warn('AssociationColumnExtension: Injector not provided.');
    }
    return AngularNodeViewRenderer(AssociationColumnComponent, {
      injector: this.options.injector!,
    });
  },
});
