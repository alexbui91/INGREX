import {Injectable} from '@angular/core'
import  {HttpClient, HttpHeaders} from '@angular/common/http'
import { Observable } from 'rxjs';

const httpOptions = {
    headers: new HttpHeaders({'Content-Type': 'application/json'})
}

@Injectable({ providedIn: 'root' })
export class Services{
    private url = 'http://147.47.236.89:39500/api/v1'
    private headers: Headers = new Headers({'Content-Type': 'application/json'});
    constructor(private http: HttpClient){

    }

    explain(graph_options: Object) : Observable<any>{
        return this.http.post(this.url + "/explain", graph_options, {"headers": httpOptions.headers})
    }

    explainGraph(graph_options: Object) : Observable<any>{
        return this.http.post(this.url + "/explain_graph", graph_options, {"headers": httpOptions.headers})
    }

    
}