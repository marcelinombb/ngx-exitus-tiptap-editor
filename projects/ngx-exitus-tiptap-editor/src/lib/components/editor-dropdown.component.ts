import { AfterContentInit, Component, ElementRef, contentChildren } from '@angular/core';
import { EditorButtonComponent } from './editor-button.component';

@Component({
    standalone: true,
    selector: 'editor-dropdown',
    template: `
        <div class="ex-toolbar-dropdown">
            <button 
                [class]="['ex-toolbar-button', 'btn', 'btn-' + currentIcon]"
                [title]="title"
                (click)="toggle()"
            >
                <span class="ex-btn-caret" [class.open]="open"></span>
            </button>
            @if(open) {
                <div class="ex-dropdown-menu">
                    <ng-content select="editor-button"></ng-content>
                </div>
            }
        </div>
    `,
    styleUrls: ["editor-dropdown.component.scss", "../assets/icons/icons.css"]
})
export class EditorDropdownComponent implements AfterContentInit {

    open = false;
    currentIcon = '';
    title = '';

    readonly buttons = contentChildren(EditorButtonComponent, { descendants: true });
    readonly buttonEls = contentChildren(EditorButtonComponent, { read: ElementRef, descendants: true });

    ngAfterContentInit(): void {
        const buttons = this.buttons();
        if (buttons && buttons.length > 0) {
            const first = buttons.at(0)!;
            this.setCurrentButton(first.icon(), first.title());
        }

        buttons.forEach(btn => {
            btn.onClick.subscribe(() => {
                this.setCurrentButton(btn.icon(), btn.title());
                this.open = false;
            })
        })
    }

    private setCurrentButton(icon: string, title: string) {
        this.currentIcon = icon;
        this.title = title;
    }

    toggle() { this.open = !this.open; }

}
