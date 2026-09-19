import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { SpecialCharactersComponent } from './special-characters.component';

describe('SpecialCharactersComponent', () => {
  let component: SpecialCharactersComponent;
  let fixture: ComponentFixture<SpecialCharactersComponent>;
  let editor: Editor;

  beforeEach(async () => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text],
      content: '<p></p>',
    });

    await TestBed.configureTestingModule({
      imports: [SpecialCharactersComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecialCharactersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('editor', editor);
    fixture.detectChanges();
  });

  afterEach(() => {
    editor.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default category and characters', () => {
    expect(component.currentCategory).toBe('Letras Gregas');
    expect(component.displayedChars.length).toBeGreaterThan(0);
    expect(component.previewChar).toBe('Ω');
  });

  it('should change category when selectCategory is called', () => {
    component.selectCategory('Setas');
    expect(component.currentCategory).toBe('Setas');
    expect(component.displayedChars.length).toBeGreaterThan(0);
    expect(component.displayedChars.includes('←')).toBeTrue();
  });

  it('should filter characters when handleSearch is called', () => {
    component.searchQuery = 'grega';
    component.handleSearch();
    expect(component.displayedChars.length).toBeGreaterThan(0);
    expect(
      component.displayedChars.includes('α') || component.displayedChars.includes('Α'),
    ).toBeTrue();

    // Reset search
    component.searchQuery = '';
    component.handleSearch();
    expect(component.displayedChars.length).toBeGreaterThan(0);
  });

  it('should update preview on updatePreview', () => {
    component.updatePreview('β');
    expect(component.previewChar).toBe('β');
    expect(component.previewName).toContain('grega');
  });

  it('should insert character into editor and emit onSelect', () => {
    let emitted = '';
    component.onSelect.subscribe((char) => {
      emitted = char;
    });

    component.insertCharacter('π');
    expect(emitted).toBe('π');
    expect(editor.getHTML()).toContain('π');
  });

  it('should return code point fallback if character category is not matched in getCharName', () => {
    const unknownChar = '🚀';
    const name = component.getCharName(unknownChar);
    expect(name).toContain('U+');
  });
});
