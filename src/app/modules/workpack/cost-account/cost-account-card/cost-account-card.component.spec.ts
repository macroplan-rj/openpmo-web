import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostAccountCardInstrumentComponent } from './cost-account-card.component';

describe('CostAccountCardInstrumentComponent', () => {
  let component: CostAccountCardInstrumentComponent;
  let fixture: ComponentFixture<CostAccountCardInstrumentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostAccountCardInstrumentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CostAccountCardInstrumentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
