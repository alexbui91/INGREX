import {Injectable} from "@angular/core";

@Injectable()
export class Global {
    active_menu: string = ''
    fullFrame: boolean = false
    help: boolean = false
    colors: any = {
        'cora': {
            nodeColor: ['#3b5999', '#0084ff', '#ff7338', '#ffba1a', '#3aaf85', "#9948ff", "#21759b"],
            boderColor: ['#072d7c', '#0056a6', '#c83b00', '#d89700', '#04a068', '#7100ff', '#006491']
        },
        'TRG' : {
            nodeColor: ['#0084ff', '#3aaf85'],
            boderColor: ['#0056a6', '#04a068']
        }
    }

    className: any = {
        "cora": ["Theory","Reinforcement Learning","Genetic Algorithms", "Neural Networks", "Probabilistic Methods", "Case Based", "Rule Learning"],
        "TRG": ["Tree Node", "Grid Node"]
    }
    
    setMenu(menu: string) {
        this.active_menu = menu
    }

    showHelp() { 
        this.help = !this.help
    }
}