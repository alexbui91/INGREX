import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Global } from '../global'

@Component({
    selector: 'app-feature',
    templateUrl: './feature.component.html',
    styleUrls: ['./feature.component.scss']
})
export class FeatureComponent implements OnInit {

    url: string = "http://147.47.236.89:31111/notebooks/feature_importance.ipynb";
    
    constructor(public config: Global, private _elementRef: ElementRef) { 
        this.config.fullFrame = true
    }
    ngOnInit(): void {

    }

}
