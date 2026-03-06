import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExitusTiptapEditor } from './exitus-tiptap-editor';

describe('ExitusTiptapEditor', () => {
    let component: ExitusTiptapEditor;
    let fixture: ComponentFixture<ExitusTiptapEditor>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExitusTiptapEditor],
            providers: [provideZonelessChangeDetection()],
        }).compileComponents();

        fixture = TestBed.createComponent(ExitusTiptapEditor);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize the editor instance', () => {
        expect(component.editorInstance).toBeTruthy();
    });

    it('should set content correctly', () => {
        const content = '<p>Hello World</p>';
        fixture.componentRef.setInput('content', content);
        component.setContent(content);
        expect(component.editorInstance?.getHTML()).toContain('Hello World');
    });
});
