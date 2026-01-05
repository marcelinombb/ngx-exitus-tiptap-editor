import { Component, input, OnInit, signal, viewChild } from '@angular/core';
import { EditorButtonComponent } from '../../components/editor-button.component';
import { EditorDropdownComponent } from '../../components/editor-dropdown.component';
import { Editor, findParentNode, posToDOMRect } from '@tiptap/core';
import { BubbleMenuComponent } from '../../components/bubble-menu.component';
import { NodeSelection } from '@tiptap/pm/state';

@Component({
  standalone: true,
  imports: [EditorButtonComponent, EditorDropdownComponent, BubbleMenuComponent],
  selector: 'image-floating-menu',
  template: `
    <bubble-menu
      [editor]="editor()"
      [updateDelay]="0"
      [resizeDelay]="0"
      [shouldShow]="shouldShowImage"
      [getReferencedVirtualElement]="getReferencedVirtualElement"
      [options]="{ flip: true, onHide, placement: 'top', onShow }"
    >
      <div class="ex-toolbar-editor">
        <div class="ex-toolbar-items">
          <editor-button
            [icon]="'image-caption'"
            [title]="'Legenda da Imagem'"
            (onClick)="toggleCaption()"
          ></editor-button>
          <editor-button
            [icon]="'image-left'"
            [title]="'Alinhar à Esquerda'"
            [active]="activeClasses().has('ex-image-block-align-left')"
            (onClick)="setAlignment('left')"
          ></editor-button>
          <editor-button
            [icon]="'image-middle'"
            [title]="'Alinhar ao Centro'"
            [active]="activeClasses().has('ex-image-block-middle')"
            (onClick)="setAlignment('middle')"
          ></editor-button>
          <editor-button
            [icon]="'image-right'"
            [title]="'Alinhar à Direita'"
            [active]="activeClasses().has('ex-image-block-align-right')"
            (onClick)="setAlignment('right')"
          ></editor-button>
          <editor-dropdown #imagesize [icon]="'image-size'" [title]="'Tamanho da Imagem'">
            <editor-button (onClick)="updateAttributes({ width: 300 })" [title]="'Pequena'"
              >Pequena</editor-button
            >
            <editor-button (onClick)="updateAttributes({ width: 400 })" [title]="'Média'"
              >Média</editor-button
            >
            <editor-button (onClick)="updateAttributes({ width: 700 })" [title]="'Grande'"
              >Grande</editor-button
            >
          </editor-dropdown>
        </div>
      </div>
    </bubble-menu>
  `,
})
export class ImageFloatingMenuComponent implements OnInit {
  editor = input.required<Editor>();

  private pos: number | null = null;

  activeClasses = signal(new Set<string>());

  imageSizeDropdown = viewChild.required<EditorDropdownComponent>('imagesize');

  constructor() {}

  ngOnInit() {
    this.editor().on('selectionUpdate', () => {
      this.syncImageState();
    });

    this.editor().on('transaction', () => {
      this.syncImageState();
    });
  }

  private syncImageState() {
    const view = this.editor().view;
    const { selection } = view.state;
    const pos = selection.$anchor.pos;

    if (!this.editor().isActive('image')) {
      this.pos = null;
      this.activeClasses.set(new Set());
      return;
    }

    this.pos = pos;

    const node = view.state.doc.nodeAt(pos);
    if (!node) {
      this.activeClasses.set(new Set());
      return;
    }

    this.activeClasses.set(new Set((node.attrs['classes'] ?? '').split(' ').filter(Boolean)));
  }

  isButtonActive(className: string) {
    return this.activeClasses().has(className);
  }

  onHide = () => {
    this.imageSizeDropdown().open = false;
  };

  onShow = () => {
    requestAnimationFrame(()=> this.editor().commands.setMeta('bubbleMenu', 'updatePosition'))
  };

  shouldShowImage = (props: any) => {
    return this.editor().isActive('image') && this.editor().isFocused;
  };

  getReferencedVirtualElement = () => {
    const { state, view } = this.editor();
    const { selection } = state;

    if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
      const dom = view.nodeDOM(selection.from) as HTMLElement | null;
      if (!dom) return null;

      return {
        getBoundingClientRect: () => dom.getBoundingClientRect(),
      };
    }

    return null;
  };

  toggleCaption() {
    this.editor().commands.setMeta('bubbleMenu', 'updatePosition');
  }

  setAlignment(target: 'left' | 'middle' | 'right') {
    if (this.pos == null) return;

    const { view } = this.editor();
    const node = view.state.doc.nodeAt(this.pos);
    if (!node) return;

    const ALIGN = {
      left: 'ex-image-block-align-left',
      middle: 'ex-image-block-middle',
      right: 'ex-image-block-align-right',
    } as const;

    const classes = new Set((node.attrs['classes'] ?? '').split(' ').filter(Boolean));

    const targetClass = ALIGN[target];
    const isActive = classes.has(targetClass);

    Object.values(ALIGN).forEach((cls) => classes.delete(cls));

    classes.add(isActive ? ALIGN.middle : targetClass);

    this.updateAttributes({
      classes: [...classes].join(' '),
    });
  }

  updateAttributes(attributes: Record<string, any>) {
    if (this.pos !== null) {
      const { view } = this.editor();
      const node = view.state.doc.nodeAt(this.pos);

      if (!node) return;
      const transaction = view.state.tr;
      transaction.setNodeMarkup(this.pos, undefined, {
        ...node.attrs,
        ...attributes,
      });
      view.dispatch(transaction);
    }
  }
}
