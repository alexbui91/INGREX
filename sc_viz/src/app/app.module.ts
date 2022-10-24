import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http'

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PagerankComponent } from './pagerank/pagerank.component';

import { Global } from './global';
import { LocalComponent } from './local/local.component';
import { GraphComponent } from './graph/graph.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule} from '@angular/material/select';

import { FileSaverModule } from 'ngx-filesaver';
import { FeatureComponent } from './feature/feature.component';

@NgModule({
  declarations: [
    AppComponent,
    PagerankComponent,
    LocalComponent,
    GraphComponent,
    FeatureComponent
  ],
  imports: [
    MatSliderModule,
    MatSelectModule,
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    BrowserAnimationsModule,
    FileSaverModule
  ],
  providers: [Global],
  bootstrap: [AppComponent]
})
export class AppModule { }
