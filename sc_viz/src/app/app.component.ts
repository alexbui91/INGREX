import { Component } from '@angular/core';
import { Global } from './global';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})

export class AppComponent{
    constructor(public globalConfig: Global) {
        console.log(this.globalConfig)
    }
}
