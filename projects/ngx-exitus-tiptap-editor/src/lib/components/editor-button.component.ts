import { Component, input, output } from '@angular/core';

@Component({
    standalone: true,
    imports: [],
    selector: 'editor-button',
    template: `
        <button 
        [class] = "['ex-toolbar-button', 'btn', 'btn-' + icon()]"
        [class.ex-button-active]="active()"
        [title]="title()"
        (click)="onClick.emit($event)"
        >
            <ng-content></ng-content>
        </button>
    `,
    styleUrls: ["editor-button.component.scss", "../assets/icons/icons.css"]
})

export class EditorButtonComponent {
    icon = input.required<string>();
    title = input.required<string>();
    active = input(false);
    onClick = output<Event>();
}