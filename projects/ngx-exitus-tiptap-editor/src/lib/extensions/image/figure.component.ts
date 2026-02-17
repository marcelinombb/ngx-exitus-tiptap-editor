import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  viewChild,
  signal
} from '@angular/core';
import { AngularNodeViewComponent } from 'ngx-tiptap';
import ImageCropper from './ImageCropper';

@Component({
  selector: 'ex-figure',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #wrapper
      class="ex-image-wrapper tiptap-widget {{ alignmentClass() }}"
      [class.ex-selected]="selected()"
      [style.width.px]="resizeWidth() ?? width()"
      (click)="onFigureClick($event)"
    >
      <!-- contentDOM: Tiptap will render the image and figcaption inside this element -->
      <figure data-node-view-content style="margin: 0; width: 100%;">
      </figure>

      <!-- Resize Handles -->
      <div
        class="resize-handle resize-handle-tl"
        (mousedown)="onMouseDown($event, 'tl')"
      ></div>
      <div
        class="resize-handle resize-handle-tr"
        (mousedown)="onMouseDown($event, 'tr')"
      ></div>
      <div
        class="resize-handle resize-handle-bl"
        (mousedown)="onMouseDown($event, 'bl')"
      ></div>
      <div
        class="resize-handle resize-handle-br"
        (mousedown)="onMouseDown($event, 'br')"
      ></div>

      <!-- Insert Paragraph Buttons -->
      <div
        class="insert-paragraph-btn insert-paragraph-before"
        title="Inserir parágrafo antes"
        (click)="insertParagraph($event, 'before')"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"
          />
        </svg>
      </div>
      <div
        class="insert-paragraph-btn insert-paragraph-after"
        title="Inserir parágrafo após"
        (click)="insertParagraph($event, 'after')"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"
          />
        </svg>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block!important;
        width: 100%;
      }
      .ex-image-wrapper {
        position: relative;
      }
    `,
  ]
})
export class FigureComponent extends AngularNodeViewComponent implements OnDestroy {
  // Inputs as Signals
  // Inherited from AngularNodeViewComponent

  readonly wrapperByRef = viewChild.required<ElementRef<HTMLElement>>('wrapper');

  private cropper: ImageCropper | null = null;
  private elementRef = inject(ElementRef<HTMLElement>);

  // Derived state
  readonly width = computed(() => this.node().attrs['width']);

  // Mutable state for temporary resizing
  readonly resizeWidth = signal<number | null>(null);

  readonly alignmentClass = computed(() => {
    const classes = (this.node().attrs['class'] || '').split(' ');
    return classes.filter((c: string) =>
      [
        'ex-image-block-align-left',
        'ex-image-block-align-right',
        'ex-image-block-middle',
        'ex-image-float-left',
        'ex-image-float-right',
        'ex-image-grayscale'
      ].includes(c)
    ).join(' ');
  });

  constructor() {
    super();
  }

  ngAfterViewInit() {
    // Expose toggleCropping on the DOM element for the command to call
    (this.elementRef.nativeElement as any).toggleCropping = () => this.toggleCropping();

    // Initialize Cropper
    const wrapperEl = this.wrapperByRef().nativeElement;
    const img = wrapperEl.querySelector('img') || document.createElement('img');
    const figcaption = wrapperEl.querySelector('figcaption');

    this.cropper = new ImageCropper({
      image: img as HTMLImageElement,
      imageWrapper: wrapperEl,
      figcaption: figcaption as HTMLElement,
      updateAttributes: (attrs) => this.handleCropUpdate(attrs)
    });
  }

  toggleCropping() {
    // Re-query elements as Tiptap might have rendered them by now
    const wrapperEl = this.wrapperByRef().nativeElement;
    const img = wrapperEl.querySelector('img');
    const figcaption = wrapperEl.querySelector('figcaption');

    if (this.cropper && img) {
      // Using type assertion to access private properties if ImageCropper doesn't expose them
      (this.cropper as any).target.image = img;
      (this.cropper as any).target.figcaption = figcaption;
      this.cropper.toggle();
    }
  }

  handleCropUpdate(attributes: Record<string, any>) {
    const getPosFn = this.getPos();
    if (typeof getPosFn !== 'function') return;

    const pos = getPosFn();
    if (pos === undefined || pos === null) return;

    const { view } = this.editor();
    let tr = view.state.tr;

    // Handle image src update on child node
    if (attributes['src']) {
      this.node().content.forEach((child, offset) => {
        if (child.type.name === 'image') {
          tr = tr.setNodeMarkup(pos + 1 + offset, undefined, {
            ...child.attrs,
            src: attributes['src']
          });
        }
      });
    }

    // Handle figure attributes (like width)
    const figureAttrs = { ...this.node().attrs };
    let figureChanged = false;
    if (attributes['width'] && attributes['width'] !== figureAttrs['width']) {
      figureAttrs['width'] = attributes['width'];
      figureChanged = true;
    }

    if (figureChanged) {
      tr = tr.setNodeMarkup(pos, undefined, figureAttrs);
    }

    if (tr.docChanged) {
      view.dispatch(tr);
    }
  }

  insertParagraph(event: Event, where: 'before' | 'after') {
    event.stopPropagation();
    const getPosFn = this.getPos();
    if (typeof getPosFn !== 'function') return;

    const pos = getPosFn();
    if (pos === undefined) return;

    const insertionPos = where === 'before' ? pos : pos + this.node().nodeSize;

    this.editor().chain()
      .insertContentAt(insertionPos, { type: 'paragraph' })
      .focus(where === 'before' ? insertionPos : insertionPos + 1)
      .run();
  }

  onFigureClick(event: Event) {
    const target = event.target as HTMLElement;
    const getPosFn = this.getPos();

    if (target.tagName === 'IMG' && typeof getPosFn === 'function') {
      const pos = getPosFn();
      if (pos !== undefined) {
        this.editor().commands.setNodeSelection(pos);
      }
    }
  }

  onMouseDown(event: MouseEvent, direction: 'tl' | 'tr' | 'bl' | 'br') {
    event.preventDefault();
    const startX = event.clientX;
    const wrapper = this.wrapperByRef().nativeElement;
    const startWidth = wrapper.offsetWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const diffX = currentX - startX;
      const multiplier = (direction === 'tl' || direction === 'bl') ? -1 : 1;
      const newWidth = Math.max(300, Math.min(700, startWidth + (diffX * multiplier)));

      // Use signal for temporary resize state
      this.resizeWidth.set(newWidth);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const finalX = upEvent.clientX;
      const diffX = finalX - startX;
      const multiplier = (direction === 'tl' || direction === 'bl') ? -1 : 1;
      const newWidth = Math.max(300, Math.min(700, startWidth + (diffX * multiplier)));

      // Commit change to Tiptap node
      this.updateAttributes()({ width: newWidth });

      // Reset temporary signal
      this.resizeWidth.set(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  ngOnDestroy() {
    if (this.cropper) {
      this.cropper.destroy();
    }
  }
}
