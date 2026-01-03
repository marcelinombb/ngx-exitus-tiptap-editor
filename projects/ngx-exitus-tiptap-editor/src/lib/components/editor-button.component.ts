import { Component, input, output } from '@angular/core';

@Component({
    standalone: true,
    imports: [],
    selector: 'editor-button',
    template: `
        <button 
        [class]="buttonClasses()"
        [title]="title()"
        (click)="onClick.emit($event)"
        >
            <ng-content></ng-content>
        </button>
    `,
    styleUrls: ["editor-button.component.scss", "../assets/icons/icons.css"]
})

export class EditorButtonComponent {
    icon = input<string>();
    title = input.required<string>();
    active = input(false);
    onClick = output<Event>();

    buttonClasses() {
        return {
            "ex-toolbar-button": true,
            btn: this.icon(),
            ['btn-' + this.icon()!]: this.icon(),
            "ex-button-active": this.active()
        };
    }
}