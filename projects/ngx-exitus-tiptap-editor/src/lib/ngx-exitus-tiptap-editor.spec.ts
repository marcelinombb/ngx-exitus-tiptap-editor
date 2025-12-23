import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxExitusTiptapEditor } from './ngx-exitus-tiptap-editor';

describe('NgxExitusTiptapEditor', () => {
  let component: NgxExitusTiptapEditor;
  let fixture: ComponentFixture<NgxExitusTiptapEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxExitusTiptapEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxExitusTiptapEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
