import { Component, ElementRef, OnInit } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { FileSaverService } from 'ngx-filesaver'
import { Services } from '../app.services'
import { Global } from '../global'

declare var cytoscape: any
// import cora_graph from "./data/cora.json"
// import cora_rank from "./data/cora_nrank.json"

import cora_graph from "./data/cora.json"
import cora_rank from "./data/cora_nrank2.json"
import trg_graph_kmd from "./data/tree_grid_kmd.json"
import trg_graph_emb from "./data/tree_grid.json"
// import trg_rank from "./data/trg_nrank.json"

@Component({
    selector: 'app-pagerank',
    templateUrl: './pagerank.component.html',
    styleUrls: ['./pagerank.component.scss']
})
export class PagerankComponent implements OnInit {

    cy: any
    cy_container: any
    top_nodes: any = {}
    selected: any = {
        top_nodes: 50,
        edge_prob: 0.3,
        remaining_edges: -1,
        positionType: 'embed',
        graph: 'cora',
        node_color: 'pr',
        node_id: null
    }
    activeNode: any
    // dark blue blue orange yellow green purple magista
    colors: any
    className: any
    edgeContent: any = { text: '', pos: { x: 100, y: 100 } }
    graphKeys: any = {"cora": 0, "TRG": 1}
    graphs: Array<any> = [
        {name: "Cora", value: "cora", data: cora_graph, rank: cora_rank, type: 'directed'},
        {name: "Tree-Grid", value: "TRG", data: trg_graph_emb, data2: trg_graph_kmd, rank: null, type: 'undirected'}
    ]

    constructor(public _globalConfig: Global, private _elementRef: ElementRef, private service_: Services,
                private _router: Router, private _fileSaver: FileSaverService) {
        this._globalConfig.setMenu('pagerank')
        this.colors = this._globalConfig.colors
        this.className = this._globalConfig.className
    }

    ngOnInit(): void {
        this.initGraph()
    }

    resetView(): void {
        this.cy.center()
        this.cy.fit()
    }

    changeGraph(): void {
        if (this.selected.graph == 'TRG') {
            this.selected.positionType = 'local'
            this.selected.edge_prob = 0
        } else {
            this.selected.positionType = 'embed'
            this.selected.edge_prob = 0.3
        }
        this.initGraph()
    }

    resetRank(): void {
        this.top_nodes = {}
        if (this.selected.graph == 'cora') {
            let graph = this.graphs[this.graphKeys[this.selected.graph]]
            for (let i = 0; i < this.selected['top_nodes']; i++) {
                this.top_nodes[graph.rank['nrank'][i]] = i + 1
            }
        }
        
    }

    highlightNode(node: any, edges: any): void {
        node.addClass('selected')
        node.css({"z-index": 999})
        if (edges && edges.length)
            edges.addClass('selected')
    }

    initNodeEvents(): void {
        let self = this
        this.cy.on('click', 'node', (e: any) => {
            let node = e.target
            let node_data = node.data()
            let idx = parseInt(node_data['id'])
            let content = ""
            if (self.top_nodes.hasOwnProperty(idx)) {
                content = "ID: " + node_data['id'] + "<br/> Rank: " + self.top_nodes[idx]
            } else {
                content = "ID: " + node_data['id']
            }
            node.qtip({ content: content, hide: { inactive: 3000 } })
            if (self.activeNode && self.activeNode.data('id') != node.data('id')) {
                self.activeNode.removeClass('selected')
                self.activeNode.css({"z-index": 2})
                let out = self.activeNode.outgoers()
                if (out && out.length) {
                    let edges = out.edges()
                    if (edges && edges.length)
                        edges.removeClass('selected')
                }
            }

            if (!self.activeNode || self.activeNode.data('id') != node.data('id')) {
                let out = node.outgoers()
                let edges = null
                if (out && out.length) {
                    edges = out.edges()
                }
                self.highlightNode(node, edges)

            }
            self.activeNode = node
            node.stop()
        })
        this.cy.on('dblclick', 'node', (e: any) => {
            let node = e.target
            node.removeClass('selected')
            node.outgoers().edges().removeClass('selected')
            let inc = node.incomers()
            if (inc && inc.length) {
                let edges = inc.edges()
                edges.removeClass('selected')
            }
            this.activeNode = null
        })
    }

    /* https://github.com/iVis-at-Bilkent/cytoscape.js-context-menus */
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
                        let idx = node.data('id')
                        self._router.navigate([]).then((res) => {
                            window.open("/local?id="+idx + "&graph_name=" + self.selected.graph, "_blank")
                        })
                        // self._router.navigate(['local'], { queryParams: { id: idx, graph_name: self.selected.graph } })
                    },
                    hasTrailingDivider: true
                },
            ]
        })
    }


    initGraph(): void {
        this.top_nodes = {}
        if (this.cy) {
            this.cy.destroy()
        }
        this.cy_container = this._elementRef.nativeElement.querySelector("#cy")
        let self = this
        let getColor = (color: Array<string>, lb: any) => { return color[lb] }
        let getNodeSize = (idx: number) => {
            let size = 10
            if (self.top_nodes.hasOwnProperty(idx)) {
                let rank = self.top_nodes[idx]
                let s = self.selected.top_nodes - rank + 1
                size = 10 + s
            }
            return size + 'px'
        }
        let node_style_orig = {
            // "color": (ele: any) => { return getColor(['#fff', '#fff', '#000', '#000', '#000', "#fff", "#fff"], ele.data('lb')) },
            'width': () => {
                if (self.selected.graph == 'cora') return '10px'
                else if (self.selected.positionType == 'embed') return '5px'
                return '2px'
            },
            'height': () => {
                if (self.selected.graph == 'cora') return '10px'
                else if (self.selected.positionType == 'embed') return '5px'
                return '2px'
            },
            'background-color': (ele: any) => {
                let color = self.colors[self.selected.graph].nodeColor[ele.data(self.selected.node_color)]
                return color
            },
            'border-width': '1px',
            'border-color': (ele: any) => { return getColor(self.colors[self.selected.graph].boderColor, ele.data(self.selected.node_color)) },
            "z-index-compare": "manual",
            "z-compound-depth": "top",
            "z-index": 2
        }
        let edge_style = {
            'curve-style': () => {
                if (self.selected.graph == 'cora') return 'bezier'
                return 'straight'
            },
            'target-arrow-shape': () => {
                if (self.selected.graph == 'cora') return 'triangle-backcurve'
                return 'none'
            },
            'haystack-radius': 0,
            'width': '0.3px',
            'opacity': '0.5',
            'line-color': '#999',
            'target-arrow-color': '#aaa',
            'arrow-scale': 1,
            "z-index-compare": "manual",
            "z-compound-depth": "top",
            "z-index": 1,
            'display': 'none'
        }
        let label_properties = {
            "text-halign": "center",
            "text-valign": "center",
            "text-wrap": "wrap",
            "font-size": "13px",
            "label": (ele: any) => {
                let idx = parseInt(ele.data('id'))
                if (self.top_nodes.hasOwnProperty(idx)) {
                    // let rank = self.top_nodes[idx]
                    return idx 
                }
                return ""
            }
        }
        let node_style = Object.assign(label_properties, node_style_orig)
        let graph = self.graphs[self.graphKeys[self.selected.graph]]
        let graphData = graph.data
        console.log(self.selected.positionType)
        if (self.selected.positionType == 'local') graphData = graph.data2
        this.cy = cytoscape({
            container: self.cy_container,
            layout: {
                name: 'preset',
                animate: false
            },
            boxSelectionEnabled: true,
            autounselectify: false,
            wheelSensitivity: 0.1,
            minZoom: 1,
            style: [
                {
                    selector: 'node',
                    style: node_style
                },
                {
                    selector: 'node.selected',
                    style: {
                        "border-width": "3x",
                        "border-color": "#ac1b69",
                        "border-opacity": "0.5",
                        "background-color": "#de0000",
                        "z-index": 999
                    }
                },
                {
                    selector: 'node.top',
                    style: {
                        'height': (ele: any) => {
                            let idx = parseInt(ele.data('id'))
                            return getNodeSize(idx)
                        },
                        'width': (ele: any) => {
                            let idx = parseInt(ele.data('id'))
                            return getNodeSize(idx)
                        },
                        'z-index': 5
                    }
                },
                {
                    selector: 'edge',
                    style: edge_style
                },
                {
                    selector: 'edge.selected',
                    style: {
                        lineColor: "#de0000",
                        width: (ele: any) => {
                            let w = 0.3 + Math.log(parseFloat(ele.data('p')) * 10)
                            if (w <= 0.1) w = 0.3
                            return w + "px"
                        },
                        opacity: "1",
                        "z-index": 998,
                        'target-arrow-color': "#de0000"
                    }
                }
            ],

            elements: graphData
        })
        this.initNodeEvents()
        this.initContextMenu()
        this.cy.on('click', 'edge', (e: any) => {
            self.edgeContent.pos = e.renderedPosition
            let edge = e.target
            let content = "p=" + Math.round(parseFloat(edge.data('p')) * 100) / 100
            self.edgeContent.text = content
            setTimeout(() => { self.edgeContent.text = "" }, 3000)
        })
        this.cy.on("box", "node", (e: any) => {
            let nodes = e.target
            self.cy.center(nodes)
            let curz = self.cy.zoom()
            self.cy.zoom(curz + 0.1)
        })
        setTimeout(() => {
            let edges = self.cy.edges("[p >= " + self.selected['edge_prob'] + " ]")
            self.selected.remaining_edges = edges.length
            edges.css({ 'display': 'element' })
            self.changeTopNodes(null)
        }, 100)
    }

    changeEdgeThreshold(ev: any): void {
        // this.cy.edges("[p < " + this.selected['edge_prob'] + " ]").css({ 'display': 'none' })
        // this.cy.edges("[p >= " + this.selected['edge_prob'] + " ]").css({ 'display': 'element' })
        let edges = this.cy.edges()
        let l = 0
        edges.each((ele: any) => {
            let p = ele.data('p')
            if(p < this.selected['edge_prob'])
                ele.css({'display': 'none'})
            else {
                l += 1
                ele.css({'display': 'element'})
            }
        })
        this.selected.remaining_edges = l
    }

    changeTopNodes(ev: any): void {
        this.resetRank()
        this.cy.nodes().each((ele: any) => {
            let idx = parseInt(ele.data('id'))
            if (!ele.hasClass('top') && this.top_nodes.hasOwnProperty(idx)) {
                ele.addClass('top')
            }else if(ele.hasClass('top') && !this.top_nodes.hasOwnProperty(idx)) {
                ele.removeClass('top')
            }
        })
    }

    changeNodeColor(): void {
        let self = this
        this.cy.nodes().each((ele: any) => {
            let bg = self.colors[self.selected.graph].nodeColor[ele.data(self.selected.node_color)]
            let bd = self.colors[self.selected.graph].boderColor[ele.data(self.selected.node_color)]
            ele.style({
                'background-color': bg,
                'border-color': bd
            })
        })
    }

    searchNodeID(): void {
        let self = this
        let animate = (e: any, w: any, h: any) => {
            let ani = e.animation({
                style: {
                    width: parseInt(w) * 2 + "px",
                    height: parseInt(h) * 2 + "px",
                    zIndex: 1000
                },
            },{
                duration: 1000
            })
            ani.reverse().play().promise('complete').then(() => animate(e, w, h))
        }
        this.cy.nodes().each((e: any) => {
            if (e.data('id') == this.selected.node_id) {
                e.addClass('selected')
                self.cy.center(e)
                let curz = self.cy.zoom()
                self.cy.zoom(curz + 0.5)
                let w = e.style('width')
                let h = e.style('height')
                animate(e, w, h)
            }
        })
    }

    saveImage(): void {
        let b64 = this.cy.svg({scale: 1, bg: '#ffffff', full: false})
        this._fileSaver.save(b64, 'graph.svg')
    }
}
