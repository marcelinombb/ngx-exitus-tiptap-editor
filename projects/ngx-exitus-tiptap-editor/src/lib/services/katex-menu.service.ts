import { Injectable, signal } from '@angular/core';

@Injectable()
export class KatexMenuService {
    private _forceOpen = signal<boolean>(false);

    get forceOpen() {
        return this._forceOpen();
    }

    setForceOpen(value: boolean) {
        this._forceOpen.set(value);
    }
}
