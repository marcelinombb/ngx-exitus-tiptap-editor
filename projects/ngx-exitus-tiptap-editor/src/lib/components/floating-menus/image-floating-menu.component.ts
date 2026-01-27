import { Component, input, OnInit, signal, viewChild } from '@angular/core';
import { EditorButtonComponent } from '../editor-button.component';
import { EditorDropdownComponent } from '../editor-dropdown.component';
import { Editor } from '@tiptap/core';
import { BubbleMenuComponent } from '../bubble-menu.component';
import { findParentNode } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

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
          <editor-dropdown #imagesize [title]="'Tamanho da Imagem'" [icon]="'image-middle'" orientation="horizontal">
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
          </editor-dropdown>
          <editor-dropdown #imagesize [icon]="'image-size'" [title]="'Tamanho da Imagem'" [updateIcon]="false">
            <editor-button (onClick)="setWidth(300)" [title]="'Pequena'"
              >Pequena</editor-button
            >
            <editor-button (onClick)="setWidth(500)" [title]="'Média'"
              >Média</editor-button
            >
            <editor-button (onClick)="setWidth(700)" [title]="'Grande'"
              >Grande</editor-button
            >
          </editor-dropdown>
          <editor-dropdown [title]="'Alinhar imagem ao texto'" orientation="horizontal">
            <editor-button [icon]="'image-float-left'" (onClick)="setAlignment('inlineLeft')" [title]="'Esquerda'"
              ></editor-button>
            <editor-button [icon]="'image-float-right'" (onClick)="setAlignment('inlineRight')" [title]="'Direita'"
              ></editor-button>
          </editor-dropdown>
          <editor-button
            [icon]="'palette'"
            [title]="'Preto e Branco'"
            (onClick)="toggleGreyScale()"
          ></editor-button>
          @if (editor().isActive('figure')) {
            <editor-button
                [icon]="'image-crop'"
                [title]="'Recortar Imagem'"
                (onClick)="toggleCropping()"
            ></editor-button>
          }
        </div>
      </div>
    </bubble-menu>
  `,
  styles: [
    `
    .ex-toolbar-items {
        display: flex;
        align-items: center;
        flex-direction: row;
    }
    `
  ]
})
export class ImageFloatingMenuComponent implements OnInit {
  editor = input.required<Editor>();

  activeClasses = signal(new Set<string>());

  imageSizeDropdown = viewChild.required<EditorDropdownComponent>('imagesize');

  ngOnInit() {
    this.editor().on('transaction', () => {
      this.syncImageState();
    });
  }

  private syncImageState() {
    const view = this.editor().view;
    const { selection } = view.state;

    if (!this.editor().isActive('image') && !this.editor().isActive("figure")) {
      this.activeClasses.set(new Set());
      return;
    }

    let figureNode: { node: ProseMirrorNode; pos: number } | undefined;

    if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
      figureNode = { node: selection.node, pos: selection.from };
    } else {
      figureNode = findParentNode((node) => node.type.name === 'figure')(selection);
    }

    if (!figureNode) {
      this.activeClasses.set(new Set());
      return;
    }

    this.activeClasses.set(new Set((figureNode.node.attrs['class'] ?? '').split(' ').filter(Boolean)));
  }

  isButtonActive(className: string) {
    return this.activeClasses().has(className);
  }

  onHide = () => {
    this.imageSizeDropdown().open = false;
  };

  onShow = () => {
    requestAnimationFrame(() => this.editor().commands.setMeta('bubbleMenu', 'updatePosition'))
  };

  shouldShowImage = (props: any) => {
    return (this.editor().isActive('image') || this.editor().isActive("figure")) && this.editor().isFocused;
  };

  getReferencedVirtualElement = () => {
    const { state, view } = this.editor();
    const { selection } = state;

    let figureNode: { node: ProseMirrorNode; pos: number } | undefined;

    if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
      figureNode = { node: selection.node, pos: selection.from };
    } else {
      figureNode = findParentNode((node) => node.type.name === 'figure')(selection);
    }

    if (figureNode) {
      const dom = view.nodeDOM(figureNode.pos) as HTMLElement | null;
      if (!dom) return null;

      return {
        getBoundingClientRect: () => dom.getBoundingClientRect(),
      };
    }

    return null;
  };

  toggleCaption() {
    this.editor().chain().focus().toggleFigcaption().run();
  }

  setAlignment(target: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight') {
    this.editor().chain().focus().setImageAlignment(target).run();
  }

  setWidth(width: number | null) {
    this.editor().chain().focus().setImageWidth(width).run();
  }

  toggleCropping() {
    this.editor().chain().focus().cropImage().run();
  }

  toggleGreyScale() {
    this.editor().chain().focus().toggleGreyScale().run();
  }
}
