import {
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
  Injector,
  inject,
  AfterViewInit,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import { EditorToolbarComponent } from './components/editor-toolbar.component';
import { KatexFloatingMenuComponent } from './components/floating-menus/katex-floating-menu.component';
import { ImageFloatingMenuComponent } from './components/floating-menus/image-floating-menu.component';
import { TableFloatingMenuComponent } from './components/floating-menus/table-floating-menu.component';
import { AnswerBoxFloatingMenuComponent } from './components/floating-menus/answer-box-floating-menu.component';
import { ExtensionFactory } from './extension-factory';
import { EditorDropdownService } from './components/editor-dropdown.component';
import { KatexMenuService } from './services/katex-menu.service';
import { SpellCheckerConfig } from './extensions/spell-checker/spell-checker';

export interface EditorExtensionsConfig {
  spellChecker?: SpellCheckerConfig;
  proxyUrl?: string;
}

@Component({
  selector: 'exitus-tiptap-editor',
  imports: [
    EditorToolbarComponent,
    KatexFloatingMenuComponent,
    ImageFloatingMenuComponent,
    TableFloatingMenuComponent,
    AnswerBoxFloatingMenuComponent,
  ],
  template: `
    <div class="exitus-tiptap-editor">
      @if (editorInstance) {
        <editor-toolbar [editor]="editorInstance"></editor-toolbar>
        <katex-floating-menu [editor]="editorInstance"></katex-floating-menu>
        <image-floating-menu [editor]="editorInstance"></image-floating-menu>
        <table-floating-menu [editor]="editorInstance"></table-floating-menu>
        <answer-box-floating-menu [editor]="editorInstance"></answer-box-floating-menu>
      }
      <div class="editor-scroller">
        <div #editor class="editor-main" spellcheck="false"></div>
      </div>
    </div>
  `,
  styleUrls: ['./exitus-tiptap-editor.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [EditorDropdownService, KatexMenuService],
})
export class ExitusTiptapEditor implements OnDestroy, AfterViewInit {
  private editorElement = viewChild.required<ElementRef>('editor');
  private editor = signal<Editor | null>(null);
  private injector = inject(Injector);

  editable = input<boolean>(true);
  content = input<string>(``);
  extensionsConfig = input<EditorExtensionsConfig>();

  onContentChange = output<string>();
  onEditorReady = output<Editor>();

  setContent(newContent: string) {
    if (this.editor()) {
      this.editor()!.commands.setContent(newContent);
    }
  }

  get editorInstance(): Editor | null {
    return this.editor();
  }

  ngAfterViewInit() {
    this.initializeEditor();
  }

  private initializeEditor() {
    const newEditor = new Editor({
      element: this.editorElement().nativeElement,
      editable: this.editable(),
      extensions: this.getExtensions(),
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        this.onContentChange.emit(html);
      },
      onCreate: ({ editor }) => {
        editor.commands.setContent(this.content());
        this.onEditorReady.emit(editor);
      },
    });

    this.editor.set(newEditor);
  }

  private getExtensions() {
    return ExtensionFactory.createExtensions(this.injector, this.extensionsConfig());
  }

  ngOnDestroy(): void {
    this.editor()?.destroy();
  }
}
