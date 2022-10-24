import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'
import { Services } from '../app.services'
import { Global } from '../global'

declare var cytoscape: any

@Component({
    selector: 'app-graph',
    templateUrl: './graph.component.html',
    styleUrls: ['./graph.component.scss']
})

export class GraphComponent implements OnInit {

    currentActive: any
    layout: any = {
        directed: 0
    }
    graph_options: any = {
        num_compare: 3,
        edge_list : "",
        node_property : "",
        graph_name: "mutag" // mutag | ba2m
    }
    graphs: Array<any> = [{value: 'mutag', name: 'Mutag'}, {value: 'ba2m', name:'BA-2motifs'}]
    mutag_labels: Array<String> = ['C', 'O', 'Cl', 'H', 'N', 'F', 'Br', 'S', 'P', 'I', 'Na', 'K', 'Li', 'Ca']
    colors: Array<String> = ['orange','#fd8dff','lime','#5cb85c','#06b8ff','orchid','darksalmon','#5cbaba','gold','bisque','tan','lightseagreen','indigo','navy']
    className : Array<String> = ['Positive', 'Negative']
    prob_threshold: Number = 0.5
    
    graphData: Array<any> = [] // from server response    
    cy_containers: Array<any> = []
    selectedEdges: Array<any> = []

    constructor(public _globalConfig: Global, private _elementRef: ElementRef, private _service: Services,
        private _router: Router, private _route: ActivatedRoute) {
        this._globalConfig.setMenu("graph")
    }

    ngOnInit(): void {
        this.reloadData()
    }

    edgeProcess(e: any): void {
        let self = this
        let reader = new FileReader()
        let file = e.target.files[0]
        reader.readAsText(file)
        reader.onload = () => {
            self.graph_options.edge_list = reader.result
            if (file.name.includes('ba')) self.graph_options.graph_name = 'ba2m'
            else self.graph_options.graph_name = 'mutag'
        }
    }

    nodeProcess(e: any): void {
        let self = this
        let reader = new FileReader()
        reader.readAsText(e.target.files[0])
        reader.onload = () => {
            self.graph_options.node_property = reader.result
        }
    }

    convertServerGraph(edges: any, eprobs: any, indices: any, label: any) : any {
        let data = []
        for (let i = 0; i < indices.length; i++) {
            let lbi = 0
            if (label.length != 0) lbi = label[i]

            data.push({
                "group": "nodes",
                "data": {
                    "id": i,
                    "label": lbi,
                    "cls": label[i]
                }
            })
        }
        for (let i = 0; i < edges.length; i++) {
            let e = edges[i]
            data.push({
                "group": "edges",
                "data": {
                    "id": "e" + i,
                    "source": e[0],
                    "target": e[1],
                    "p": eprobs[i]
                }
            })
        }
        return data
    }

    reloadData(): void {
        let cy_container = this._elementRef.nativeElement.querySelector("#cy")
        let cy_container1 = this._elementRef.nativeElement.querySelector("#cy1")
        let cy_container2 = this._elementRef.nativeElement.querySelector("#cy2")
        let cy_container3 = this._elementRef.nativeElement.querySelector("#cy3")
        let cy_container4 = this._elementRef.nativeElement.querySelector("#cy4")
        let containers = [cy_container, cy_container1, cy_container2, cy_container3, cy_container4]
        this._service.explainGraph(this.graph_options).subscribe((res: any) => {
            let graphs = res["graphs"]
            this.graphData = graphs
            let i = 0
            let z = 1
            for (let res of graphs) {
                let edges = res['edges']
                let eprobs = res['eprobs']
                let indices = res['indices']
                let label = res['labels']
                let data = this.convertServerGraph(edges, eprobs, indices, label)
                if (i != 0)
                    z = 0.5
                let cy = this.initGraph(data, containers[i], z)
                this.cy_containers.push(cy)
                i += 1
            }
        })
    }

    initGraph(data: any, container: any, zoom: any): void {
        let self = this
        let cy = cytoscape({
            container: container,
            boxSelectionEnabled: true,
            autounselectify: true,
            wheelSensitivity: 0.1,
            zoom: 2,
            minZoom: 0.25,
            maxZoom: 10,
            layout: {
                name: 'fcose',
                animate: false,
                numIter: 100
            },
            style: [
                {
                    selector: 'node',
                    style: {
                        'height': 30,
                        'width': 30,
                        'background-color': (ele: any) => {
                            return self.colors[ele.data('label')]
                        },
                        'border-width': '1px',
                        'border-color': "#CCC"
                    }
                },
                {
                    "selector": "node[label]",
                    "style": {
                        "label": (ele: any) => {
                            if (self.graph_options.graph_name == 'mutag') {
                                let lb = self.mutag_labels[ele.data('label')]
                                return lb 
                            }
                            return ''
                        },
                        "text-valign": "center",
                        "text-halign": "center",
                        "color": "#FFF",
                        "font-size": "20px",
                        "text-wrap": "wrap",
                        "text-max-width": "20px"
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': (ele: any) => {
                            let p = ele.data('p')
                            if (p < 0.1) {
                                p = 1
                            } else {
                                p = ele.data('p') * 10
                            }
                            return p + 'px'
                        },
                        'opacity': 1,
                        'line-color': (ele: any) => {
                            let p = ele.data('p')
                            if (p >= self.prob_threshold) {
                                p = 'red'
                            } else {
                                p = "#ccc"
                            }
                            return p
                        },
                        'label': (ele: any) => {
                            let p = ""
                            if (ele.data('p') >= 0. && self.layout.directed) {
                                p = "" + Math.floor(ele.data('p') * 100) / 100
                            }
                            return p
                        },
                        'text-rotation': 'autorotate',
                        'text-background-color': '#fff',
                        'text-background-opacity': 0.5,
                        'text-background-padding': '2px',
                        'font-size': '16pt',
                        "color": "#000",
                        'arrow-scale': 1,
                        'curve-style': (ele: any) => {
                            if (!self.layout.directed) return 'straight'
                            return 'bezier'
                        },
                        'target-arrow-shape': (ele: any) => {
                            if (!self.layout.directed) return 'none'
                            return 'triangle-backcurve'
                        },
                        'target-arrow-color': (ele: any) => {
                            let p = ele.data('p')
                            if (p >= self.prob_threshold) {
                                p = 'red'
                            } else {
                                p = "#ccc"
                            }
                            return p
                        }
                    }
                },
                {
                    selector: 'edge.selected',
                    style: {
                        'line-color': 'green',
                        'target-arrow-color': 'green',
                        'label': (ele: any) => {
                            let p = ""
                            if (self.layout.directed) {
                                p = "" + Math.floor(ele.data('p') * 100) / 100
                            }
                            return p
                        },
                        'curve-style': (ele: any) => {
                            if (!self.layout.directed) return 'straight'
                            return 'bezier'
                        },
                    }
                },
            ],
            elements: data
        })

        cy.on('click', 'edge', (ele: any) => {
            self.selectedEdges.push({
                parent: ele.cy,
                obj: ele.target
            })
            let edge = ele.target
            edge.addClass('selected')
        })
        cy.on('dblclick', 'edge', (ele: any) => {
            let edge = ele.target
            edge.removeClass('selected')
        })
        cy.zoom(zoom)
        cy.on("box", "node", (e: any) => {
            let nodes = e.target
            cy.center(nodes)
            let curz = cy.zoom()
            cy.zoom(curz + 0.3)
        })
        return cy
    }

    roundScore(num: number) : number{
        return Math.floor(num * 1000) / 10
    }

    changeGraph(): void {
        this.graphData = []
        for (let cy of this.cy_containers){
            cy.destroy()
        }
    }

    reset(): void {
        for(let e of this.selectedEdges) {
            e.obj.removeClass('selected')
        }
        this.selectedEdges = []
    }
}
