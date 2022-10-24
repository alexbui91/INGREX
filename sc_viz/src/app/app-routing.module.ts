import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PagerankComponent } from './pagerank/pagerank.component';
import { LocalComponent } from './local/local.component';
import { GraphComponent } from './graph/graph.component';
import { FeatureComponent } from './feature/feature.component';

const routes: Routes = [
    {path: '', component: PagerankComponent, pathMatch: 'full'},
    {path: 'global', component: PagerankComponent, pathMatch: 'full'},
    {path: 'local', component: LocalComponent, pathMatch: 'full'},
    {path: 'graph', component: GraphComponent, pathMatch: 'full'},
    {path: 'feature', component: FeatureComponent, pathMatch: 'full'},
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
