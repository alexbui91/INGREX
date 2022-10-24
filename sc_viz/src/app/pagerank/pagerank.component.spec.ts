import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagerankComponent } from './pagerank.component';

describe('PagerankComponent', () => {
  let component: PagerankComponent;
  let fixture: ComponentFixture<PagerankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PagerankComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PagerankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
