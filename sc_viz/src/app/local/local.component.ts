import { Component, ElementRef, OnInit } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { FileSaverService } from 'ngx-filesaver'
import { Services } from '../app.services'
import { Global } from '../global'

declare var cytoscape: any

@Component({
    selector: 'app-local',
    templateUrl: './local.component.html',
    styleUrls: ['./local.component.scss']
})

export class LocalComponent implements OnInit {

    title = 'Local Explanation'
    cy: any
    cy_container: any

    layout: any = {
        type: "fcose",
        displayed_nodes: 10,
        edge_prob: 0,
        edge_type: 'contrib', // prob & contrib,
        node_color: 'pr'
    }

    graph_options: any = {
        graph_name: 'cora',
        node_id: -1,
        top_nodes: 100
    }

    graphs: Array<any> = [
        {name: "Cora", value: "cora"},
        {name: "Tree-Grid", value: "TRG"}
    ]

    currentNode: any

    colors: any
    className: any
    rank: any = {}

    currentActive: any

    constructor(public _globalConfig: Global, public _elementRef: ElementRef, private _service: Services,
        private _router: Router, private _route: ActivatedRoute, private _fileSaver:FileSaverService) {
        this._globalConfig.setMenu("local")
        this.colors = this._globalConfig.colors
        this.className = this._globalConfig.className
    }

    ngOnInit(): void {
        this.cy_container = this._elementRef.nativeElement.querySelector("#cy")
        this.cy_container.style.height = window.innerHeight + "px"
        this._route.queryParams.subscribe(params => {
            this.graph_options.node_id = params['id']
            let gr = params['graph_name']
            if (!gr) gr = 'cora'
            if (gr == 'TRG')  {
                this.layout.displayed_nodes = 9
            } else {
                this.layout.displayed_nodes = 10
            }
            this.graph_options.graph_name = gr
            this.reloadData()
        })
    }

    resetView(): void {
        try {
            this.cy.center()
            this.cy.zoom(3)
        } catch (error) {

        }
    }

    reloadData(): void {
        if (!this.graph_options.node_id || this.graph_options.node_id < 0) return
        this._service.explain(this.graph_options).subscribe((res: any) => {
            let edges = res['edges']
            let eprobs = res['eprobs']
            let indices = res['indices']
            let probs = res['nprobs']
            let label = res['labels']
            let preds = res['preds']
            let pred_probs = res['pred_probs']
            let e_imps= res['e_imp']
            let data = []
            for (let i = 0; i < indices.length; i++) {
                let obj = {
                    "id": "n" + i,
                    "label": indices[i],
                    "p": probs[i],
                    "rank": i,
                    "lb": label[i],
                    "pr": preds[i],
                    "pred_prob": Math.round(pred_probs[i]*1000) / 10
                }
                data.push({
                    "group": "nodes",
                    "data": obj
                })
                if (indices[i] == this.graph_options.node_id) {
                    this.currentNode = obj
                }
                this.rank[indices[i]] = i
            }
            for (let i = 0; i < edges.length; i++) {
                let e = edges[i]
                let obj = {
                    "group": "edges",
                    "data": {
                        "id": "e" + i,
                        "source": "n" + e[0],
                        "target": "n" + e[1],
                        "p": eprobs[i],
                        "importance": e_imps[i]
                    }
                }
                data.push(obj)
            }
            this.initGraph(data)
        })
    }

    configLayout(): any {
        let layout_configs = null
        let self = this
        if (this.layout.type == 'concentric') {
            layout_configs = {
                name: this.layout.type,
                animate: false,
                concentric: (node: any) => {
                    let idx = node.data('label')
                    let level = self.graph_options.top_nodes - self.rank[idx]
                    return level
                },
                minNodeSpacing: 30,
                levelWidth: (node: any) => {
                    return 5
                },
                randomize: false
            }
        } else {
            layout_configs = {
                name: this.layout.type,
                animate: false,
            }
        }
        return layout_configs
    }

    highlightNode(node: any, edges: any): void {
        node.addClass('selected')
        if (edges && edges.length)
            edges.addClass('selected')
    }

    initContextMenu(): void {
        let self = this
        this.cy.contextMenus({
            menuItems: [
                {
                    id: 'impacted_by',
                    content: 'Impacted By',
                    selector: 'node',
                    onClickFunction: function (event: any) {
                        let node = event.target
                        let inc = node.incomers()
                        let edges = null
                        if (inc && inc.length) {
                            edges = inc.edges()
                        }
                        self.highlightNode(node, edges)
                    },
                    hasTrailingDivider: true
                },
                {
                    id: 'local_explain',
                    content: 'Local Explanation',
                    selector: 'node',
                    onClickFunction: function (event: any) {
                        let node = event.target
                        let idx = node.data('label')
                        self._router.navigate(['local'], { queryParams: { id: idx, graph_name: self.graph_options.graph_name } })
                    },
                    hasTrailingDivider: true
                },
                {
                    id: 'hide_node',
                    content: 'Hide',
                    selector: 'node',
                    onClickFunction: function (event: any) {
                        let node = event.target
                        node.style({
                            display: "none"
                        })
                    },
                    hasTrailingDivider: true
                }
            ]
        })
    }

    initGraph(data: any): void {
        let self = this
        let getNodeSize = (ele: any) => {
            let idx = ele.data('label')
            let size = self.graph_options.top_nodes - self.rank[idx]
            if (size > 0)
                size = 15 + Math.log(size) / 2
            else
                size = 15
            return size + 'px'
        }
        let layoutConfig = this.configLayout()
        let getColor = (color: Array<string>, lb: any) => { return color[lb] }
        let border_width = (ele: any) => {
            let idx = ele.data('label')
            if (idx == self.graph_options.node_id) {
                return '3px'
            }
            return '1px'
        }
        this.cy = cytoscape({
            container: this.cy_container,
            boxSelectionEnabled: true,
            autounselectify: true,
            wheelSensitivity: 0.1,
            minZoom: 0.5,
            layout: layoutConfig,
            style: [
                {
                    selector: 'node',
                    style: {
                        'height': getNodeSize,
                        'width': getNodeSize,
                        'display': (ele: any) => {
                            let idx = ele.data('label')
                            if (self.rank[idx] < self.layout.displayed_nodes)
                                return "element"
                            return "none"
                        },
                        'background-color': (ele: any) => {
                            if (ele.data('label') == self.currentNode.label) {
                                return 'red'
                            }
                            return getColor(self.colors[self.graph_options.graph_name].nodeColor, ele.data(self.layout.node_color))
                        },
                        'border-width': border_width,
                        'border-color': (ele: any) => {
                            if (ele.data('label') == self.currentNode.label) {
                                return 'red'
                            }
                            return getColor(self.colors[self.graph_options.graph_name].boderColor, ele.data(self.layout.node_color))
                        }
                    }
                },
                {
                    "selector": "node[label]",
                    "style": {
                        "label": (ele: any) => {
                            let lb = ele.data('label')
                            let rank = self.rank[lb] + 1
                            return lb + "\n" + "R:" + rank
                        },
                        "text-valign": "center",
                        "text-halign": "center",
                        "color": "#FFF",
                        "font-size": "4px",
                        "text-wrap": "wrap",
                        "text-max-width": "30px"
                    }
                },
                {
                    selector: 'node.selected',
                    style: {
                        "border-width": "3x",
                        "border-color": "#ac1b69",
                        "border-opacity": "0.5",
                        "text-outline-color": "#dd4de2"
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': (ele: any) => {
                            let prob = ele.data('p')
                            if (self.layout.edge_type == 'contrib') {
                                prob = ele.data('importance')
                            }
                            let p = prob * 10
                            return p + 'px'
                        },
                        'opacity': 1,
                        'line-color': '#888',
                        'text-rotation': 'autorotate',
                        'text-background-color': '#fff',
                        'text-background-opacity': 0.5,
                        'text-background-padding': '2px',
                        'font-size': '8pt',
                        "color": "#000",
                        'target-arrow-color': '#888',
                        'curve-style': 'bezier',
                        // 'control-point-weights': 0.25,
                        'control-point-distance': -7,
                        'target-arrow-shape': 'triangle-backcurve',
                        'arrow-scale': 1
                    }
                },
                {
                    selector: 'edge.selected',
                    style: {
                        lineColor: "#de0000",
                        width: (ele: any) => {
                            let prob = ele.data('p')
                            if (self.layout.edge_type == 'contrib') {
                                prob = ele.data('importance')
                            }
                            let w = prob * 10
                            return w + "px"
                        },
                        'label': (ele: any) => {
                            let prob = ele.data('p')
                            // if (self.layout.edge_type == 'contrib') {
                            //     prob = ele.data('importance')
                            // }
                            let p = Math.round(prob * 1000) / 10
                            return p + '%'
                        },
                        opacity: "1",
                        "z-index": 9999,
                        'target-arrow-color': "#de0000"
                    }
                },
                {
                    selector: 'edge.contrib',
                    style: {
                        width: (ele: any) => {
                            let prob = ele.data('importance')
                            let w = prob * 10
                            return w + "px"
                        },
                    }
                },
                {
                    selector: 'edge.prob',
                    style: {
                        width: (ele: any) => {
                            let prob = ele.data('p')
                            let w = prob * 10
                            return w + "px"
                        },
                    }
                }

            ],
            elements: data
        })
        // this.cy.on('click', 'node', (ele: any) => {
        //     let node = ele.target
        //     if (this.currentActive && this.currentActive.data('label') != node.data('label'))
        //         this.currentActive.removeClass('selected')

        //     node.addClass('selected')

        //     if (!this.currentActive || this.currentActive.data('label') != node.data('label'))
        //         this.currentActive = node
        // })
        // this.cy.on('dblclick', 'node', (ele: any) => {
        //     let node = ele.target
        //     node.removeClass('selected')
        //     let inc = node.incomers()
        //     if (inc && inc.length) {
        //         let edges = inc.edges()
        //         edges.removeClass('selected')
        //     }
        //     this.currentActive = null
        // })
        this.cy.on('click', 'edge', (ele: any) => {
            let edge = ele.target
            edge.addClass('selected')
        })
        this.cy.on('dblclick', 'edge', (ele: any) => {
            let edge = ele.target
            edge.removeClass('selected')
        })

        this.initContextMenu()
        this.cy.zoom(3)
        this.cy.on("box", "node", (e: any) => {
            let nodes = e.target
            self.cy.center(nodes)
            let curz = self.cy.zoom()
            self.cy.zoom(curz + 0.5)
        })
    }

    changeLayout(e: any): void {
        if (this.cy) {
            let layout_configs = this.configLayout()
            let layo = this.cy.layout(layout_configs)
            layo.run()
        }
    }

    changeNodeDisplay(e: any): void {
        let self = this
        if (this.cy) {
            this.cy.nodes().css({
                display: (ele: any) => {
                    let idx = ele.data('label')
                    if (self.rank[idx] < self.layout.displayed_nodes)
                        return "element"
                    return "none"
                }
            })
        }
    }

    changeEdgeThreshold(ev: any): void {
        // this.cy.edges("[p < " + this.selected['edge_prob'] + " ]").css({ 'display': 'none' })
        // this.cy.edges("[p >= " + this.selected['edge_prob'] + " ]").css({ 'display': 'element' })
        let edges = this.cy.edges()
        edges.each((ele: any) => {
            let p = ele.data('p')
            if(p < this.layout['edge_prob'])
                ele.css({'display': 'none'})
            else {
                ele.css({'display': 'element'})
            }
        })
        // let nodes = this.cy.nodes()
        // nodes.each((ele: any) => {
        //     let e = ele.connectedEdges("[p >= " + this.layout.edge_prob + "]")
        //     let idx = ele.data('label')
        //     if (this.rank[idx] >= this.layout.displayed_nodes || e.length <= 0)
        //         ele.css({'display': 'none'})
        //     else {
        //         console.log(e.length)
        //         ele.css({'display': 'element'})
        //     }
        // })
    }

    changeGraph(): void {
        this.currentNode = null
        this.graph_options.node_id = null
        if (this.graph_options.graph_name == 'TRG')  {
            this.layout.displayed_nodes = 9
        } else {
            this.layout.displayed_nodes = 10
        }
        if(this.cy) {
            this.cy.destroy()
            this._router.navigate(['/local'])
        } 
    }

    changeEdgeType(): void {
        if (this.layout.edge_type == "contrib") {
            this.cy.edges().removeClass("prob")
            this.cy.edges().addClass("contrib")
        } else {
            this.cy.edges().removeClass("contrib")
            this.cy.edges().addClass("prob")
        }
            
    }

    changeNodeColor(): void {
        let self = this
        this.cy.nodes().each((ele: any) => {
            let bg = self.colors[self.graph_options.graph_name].nodeColor[ele.data(self.layout.node_color)]
            let bd = self.colors[self.graph_options.graph_name].boderColor[ele.data(self.layout.node_color)]
            if (ele.data('label') == self.currentNode.label) {
                bg = 'red'
                bd = 'red'
            }
            ele.style({
                'background-color': bg,
                'border-color': bd
            })
        })
    }

    saveImage(): void {
        let b64 = this.cy.svg({scale: 1, bg: '#ffffff', full: false})
        this._fileSaver.save(b64, 'graph.svg')
    }

}
