import { Directive, Input, ElementRef, OnInit, OnChanges, OnDestroy, SimpleChange } from '@angular/core';
import { DragulaService } from './dragula.service';
import { DrakeWithModels } from '../DrakeWithModels';
import { DragulaOptions } from 'dragula';

@Directive({selector: '[dragula]'})
export class DragulaDirective implements OnChanges, OnDestroy {
  @Input() public dragula: string;
  @Input() public dragulaModel: any[];
  @Input() public dragulaOptions: DragulaOptions = {};
  @Input() dragulaLocalMirror: boolean = false;

  private container: any;
  private drake: DrakeWithModels;

  private el: ElementRef;
  private dragulaService: DragulaService;
  public constructor(el: ElementRef, dragulaService: DragulaService) {
    this.el = el;
    this.dragulaService = dragulaService;
    this.container = el.nativeElement;
  }

  public ngOnChanges(changes: {dragula?: SimpleChange, dragulaModel?: SimpleChange}): void {
    if (changes && changes.dragula) {
      const { previousValue: prev, currentValue: current, firstChange } = changes.dragula;
      let hadPreviousValue = !!prev;
      let hasNewValue = !!current;
      // something -> null       =>  teardown only
      // something -> something  =>  teardown, then setup
      //      null -> something  =>  setup only
      //
      //      null -> null (precluded by fact of change being present)
      if (hadPreviousValue) {
        this.teardown(prev);
      }
      if (hasNewValue) {
        this.setup();
      }
    } else if (changes && changes.dragulaModel) {
      // this code only runs when you're not changing the bag name
      // because if you're changing the bag name, you'll be doing setup or teardown
      // it also only runs if there is a bag name to attach to.
      const { previousValue: prev, currentValue: current, firstChange } = changes.dragulaModel;
      if (this.dragula && this.drake) {
        this.drake.models = this.drake.models || [];
        let prevIndex = this.drake.models.indexOf(prev);
        if (prevIndex !== -1) {
          // delete the previous
          this.drake.models.splice(prevIndex, 1);
          // maybe insert a new one at the same spot
          if (!!current) {
            this.drake.models.splice(prevIndex, 0, current);
          }
        } else if (!!current) {
          // no previous one to remove; just push this one.
          this.drake.models.push(current);
        }
      }
    }
  }

  // call ngOnInit 'setup' because we want to call it in ngOnChanges
  // and it would otherwise run twice
  public setup(): void {
    // console.log(this.bag);
    let bag = this.dragulaService.find(this.dragula);
    let checkModel = () => {
      if (this.dragulaModel) {
        if (this.drake.models) {
          this.drake.models.push(this.dragulaModel);
        } else {
          this.drake.models = [this.dragulaModel];
        }
      }
    };
    if (bag) {
      this.drake = bag.drake;
      checkModel();
      this.drake.containers.push(this.container);
    } else {
      if (this.dragulaLocalMirror) {
        this.dragulaOptions.mirrorContainer = this.el.nativeElement;
      }
      this.drake = this.dragulaService.drakeFactory.build(
        [this.container],
        { ... this.dragulaOptions }
      );
      checkModel();
      this.dragulaService.add(this.dragula, this.drake);
    }
  }

  public teardown(bagName: string): void {
    const bag = this.dragulaService.find(bagName);
    if (bag) {
      const itemToRemove = bag.drake.containers.indexOf(this.el.nativeElement);
      if (itemToRemove !== -1) {
        bag.drake.containers.splice(itemToRemove, 1);
      }
      if (this.dragulaModel && this.drake && this.drake.models) {
        let modelIndex = this.drake.models.indexOf(this.dragulaModel);
        if (modelIndex !== -1) {
          this.drake.models.splice(modelIndex, 1);
        }
      }
    }
  }

  public ngOnDestroy(): void {
    this.teardown(this.dragula);
  }

}
