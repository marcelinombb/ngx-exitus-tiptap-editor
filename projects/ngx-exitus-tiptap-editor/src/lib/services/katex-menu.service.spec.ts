import { KatexMenuService } from './katex-menu.service';

describe('KatexMenuService', () => {
  let service: KatexMenuService;

  beforeEach(() => {
    service = new KatexMenuService();
  });

  it('should initialize with forceOpen set to false', () => {
    expect(service.forceOpen).toBeFalse();
  });

  it('should update forceOpen signal when setForceOpen is called', () => {
    service.setForceOpen(true);
    expect(service.forceOpen).toBeTrue();

    service.setForceOpen(false);
    expect(service.forceOpen).toBeFalse();
  });
});
