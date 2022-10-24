#!flask/bin/python

"""Alternative version of the ToDo RESTful server implemented using the
Flask-RESTful extension."""
import os
from flask import Flask
from flask_restful import Api, Resource, reqparse
from flask_cors import CORS

import torch, dgl, numpy as np
import torch.nn.functional as F
import pickle as pkl
from xgnn_src.shared_networks import OnlineKG, NaiveTeacher
from xgnn_src.graph.gcn import GCN, GCN_MLP
from xgnn_src.node.eval import edge_importance
from xgnn_src.node.utils import personalized_pagerank
from xgnn_src.graph.utils import load_data
from xgnn_src.graph.similarity import build_index, search, get_embeddings

app = Flask(__name__, static_url_path="")
app.config['SECRET_KEY'] = 'Snu2019!'
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})
api = Api(app)


def scaler(v): # for drawing only
    mn = v.min()
    mx = v.max()
    if mx != mn:
        v = (v - mn) / (mx - mn)
    return v * 0.5 + 0.05

def load_graph(path):
    with open(path, 'rb') as f:
        g = pkl.load(f)
    return g

def load_mutag_model():
    base = GCN(14, 64, 2, 5, 0.0, 'max', 'last')
    explainer = GCN_MLP(14, 64, 2, 5, 0.5, 64 * 2, 'max', 'last', 'sigmoid', False, 'bn', 0.0)
    teacher = NaiveTeacher(2, 'mean')
    online_mode = OnlineKG(base, explainer, teacher)
    model = torch.load('./ckpt/pgmutag_rand5.pt', map_location='cuda:0')
    online_mode.load_state_dict(model)
    return base, explainer

def load_ba_model():
    base = GCN(10, 64, 2, 5, 0.5, 'max', 'last')
    explainer = GCN_MLP(10, 64, 2, 5, 0.5, 64 * 2, 'max', 'last', 'sigmoid', False, 'bn')
    teacher = NaiveTeacher(2, 'mean')
    online_mode = OnlineKG(base, explainer, teacher)
    model = torch.load('./ckpt/ba_max_last_200_f5_kl4.pt', map_location='cuda:0')
    online_mode.load_state_dict(model)
    return base, explainer

def get_mask(g, base, explainer, undir=True, threshold=0.5):
    base.eval()
    explainer.eval()
    with torch.no_grad():
        with g.local_scope():
            pred, graph_emb = base(g, g.ndata['attr'])
            embedding = g.ndata['emb']
            edge_weight = explainer.edge_mask.compute_adj(g, embedding)
            edge_weight = explainer.edge_mask.edge_mlp(edge_weight)
            mask = explainer.edge_mask.concrete(edge_weight, beta=5.)
        cls = torch.argmax(pred).item()
        prob = torch.max(torch.softmax(pred, 1)).item()
    return mask.numpy(), graph_emb, cls, prob

def build_model_index(base, dataset):
    idx = list(range(len(dataset)))
    embeddings, _ = get_embeddings(base, dataset, idx)
    embedding_tensor = torch.vstack(embeddings)
    index = build_index(embedding_tensor, 50)
    return index

cora = load_graph('./data/cora_graph_noloop.g')
tree_grid = load_graph('./data/tree_grid.g')
graphs = {"cora": cora, "TRG": tree_grid}
transpose_graphs = {"cora": dgl.reverse(cora), "TRG": dgl.reverse(tree_grid)}

# load mutag
if os.path.exists("./data/mutag_cache.dat"):
    with open("./data/mutag_cache.dat", 'rb') as f:
        mutag_dataset, mutag_base, mutag_explainer, mutag_index = pkl.load(f)
else:
    mutag_dataset, _, _ = load_data('Mutagenicity', '../xgnn_src/graph/datasets/dgl_mutagenicity.pkl', neg_ratio=1.)
    mutag_base, mutag_explainer = load_mutag_model()
    mutag_index = build_model_index(mutag_base, mutag_dataset)
    with open("./data/mutag_cache.dat", 'wb') as f:
        pkl.dump((mutag_dataset, mutag_base, mutag_explainer, mutag_index), f)

mutag_neg_graphs, mutag_pos_graphs = [], []
for i, (g, l) in enumerate(mutag_dataset):
    if l == 1 and g.edata['edge_labels'].sum() == 0:
        mutag_neg_graphs.append(i)
    elif l == 0 and g.edata['edge_labels'].sum() > 0:
        mutag_pos_graphs.append(i)

mutag_node = {'C' : 0,'O' : 1,'Cl' : 2,'H' : 3,'N' : 4,'F' : 5,'Br' : 6,'S' : 7,'P' : 8,'I' : 9,'Na' : 10,'K' : 11,'Li' : 12,'Ca' : 13}

# load ba
if os.path.exists("./data/ba2motif_cache.dat"):
    with open("./data/ba2motif_cache.dat", 'rb') as f:
        ba_dataset, ba_base, ba_explainer, ba_index = pkl.load(f)
else:
    ba_dataset, _, _ = load_data('BA')
    ba_base, ba_explainer = load_ba_model()
    ba_index = build_model_index(ba_base, ba_dataset)
    with open("./data/ba2motif_cache.dat", 'wb') as f:
        pkl.dump((ba_dataset, ba_base, ba_explainer, ba_index), f)

ba_neg_graphs = list(range(500, 1000))
ba_pos_graphs = list(range(0, 500))

class ExplanationAPI(Resource):
    def __init__(self):
        super(ExplanationAPI, self).__init__()
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument("graph_name", type=str, location='json', default='cora')
        self.reqparse.add_argument("node_id", type=int, location='json', default=10)
        self.reqparse.add_argument("top_nodes", type=int, location='json', default=100)

    def post(self):
        """Implement personalized pagerank for local explanation here
        """
        args = self.reqparse.parse_args()
        preferences = torch.LongTensor([args['node_id']])
        graph_name = args['graph_name']
        g = graphs[graph_name]
        gt = transpose_graphs[graph_name]
        d = 0.9
        with gt.local_scope():
            transition_matrix = g.edata['weight'].squeeze()
            personalized_pagerank(gt, 5, d, preferences, True, transition_matrix)
            nprobs = gt.ndata['pv'].detach()

        with g.local_scope():
            eprobs = edge_importance(g, nprobs)
            g.edata['epv'] = eprobs
            values, indices = torch.topk(nprobs, args['top_nodes'])
            sg = dgl.node_subgraph(g, indices)
            src, dst = sg.edges()
            orig_probs = sg.edata['weight'].squeeze().detach()
            eprobs = sg.edata['epv'].squeeze().detach()
            eprobs = scaler(eprobs)
            edges = []
            for s, d in zip(src, dst):
                edges.append((s.item(), d.item()))
            pred_probs = torch.max(torch.softmax(sg.ndata['emb'], 1), 1).values
            # features = sg.ndata['feat']
        return {"edges": edges,
                "nprobs": values.tolist(),
                "indices": indices.tolist(),
                # "features": features.tolist(),
                "eprobs": orig_probs.tolist(),
                "e_imp": eprobs.tolist(),
                "labels": sg.ndata['label'].tolist(),
                "preds": sg.ndata['pred'].tolist(),
                "pred_probs": pred_probs.tolist()}

class ExplanationGraphAPI(Resource):
    def __init__(self):
        super(ExplanationGraphAPI, self).__init__()
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument("num_compare", type=int, location='json', default=2)
        self.reqparse.add_argument("edge_list", type=str, location='json', default="")
        self.reqparse.add_argument("node_property", type=str, location='json', default="")
        self.reqparse.add_argument("graph_name", type=str, location='json', default="mutag") # mutag | ba2m

    def convert_format(self, g, graph_name='mutag'):
        src, dst = g.edges()
        edges = []
        for s, d in zip(src, dst):
            edges.append((s.item(), d.item()))
        if graph_name == 'mutag':
            edge_probs, graph_emb, pred, prob = get_mask(g, mutag_base, mutag_explainer)
        else:
            edge_probs, graph_emb, pred, prob = get_mask(g, ba_base, ba_explainer)
        node_labels = []
        if 'node_labels' in g.ndata:
            node_labels = g.ndata['node_labels'].tolist()
        graph_obj = {"edges": edges,
                    "eprobs": edge_probs.tolist(),
                    "indices": g.nodes().tolist(),
                    "labels": node_labels,
                    "pred": pred,
                    "pred_prob": prob} 
        return graph_emb, graph_obj

    def parse_edge_list(self, edge_list):
        raw_edges = edge_list.split("\n")
        src, dst = [], []
        for e in raw_edges:
            if e == "src,dst":
                continue
            e = e.replace("\r","").split(",")
            src.append(int(e[0]))
            dst.append(int(e[1]))
        return src, dst

    def parse_node_content(self, content):
        nodes = content.split("\n")
        first_el = nodes[0].replace("\r", "")
        if first_el.isdigit():
            node_content = [int(n.replace("\r","")) for n in nodes]
        else:
            node_content = [mutag_node[n.replace("\r","")] for n in nodes]
        return node_content

    def post(self):
        """Implement personalized pagerank for local explanation here
        """
        graphs = []
        args = self.reqparse.parse_args()
        graph_name = args['graph_name']
        edge_list = args['edge_list']
        try:
            if edge_list:
                num_compare = args['num_compare']
                src, dst = self.parse_edge_list(edge_list)
                g = dgl.graph((torch.tensor(src), torch.tensor(dst)))
                if graph_name == 'mutag':
                    node_labels = self.parse_node_content(args['node_property'])
                    node_labels = torch.LongTensor(node_labels)
                    g.ndata['attr'] = F.one_hot(node_labels, 14)
                    g.ndata['node_labels'] = node_labels
                    dataset = mutag_dataset
                    index = mutag_index
                else:
                    g.ndata['attr'] = (torch.ones((g.num_nodes(), 10)) / 10).type(torch.float32)
                    dataset = ba_dataset
                    index = ba_index
                g1_emb, g1 = self.convert_format(g, graph_name)
                pred = g1['pred']
                
                if graph_name == 'mutag':
                    if pred == 0:
                        neg_graphs = mutag_neg_graphs
                    else:
                        neg_graphs = mutag_pos_graphs
                else:
                    if pred == 0:
                        neg_graphs = ba_neg_graphs
                    else:
                        neg_graphs = ba_pos_graphs
                query = [g1_emb.squeeze().numpy()]
                res = search(query, index_flat=index, k=num_compare)[0]
                res = res[1:num_compare+1]
                graphs.append(g1)
                for r in res:
                    g2, _ = dataset[r]
                    _, g2 = self.convert_format(g2, graph_name)
                    graphs.append(g2)
                l = len(neg_graphs)
                for i in range(num_compare-1):
                    idx = int(np.random.randint(0, l))
                    g2, _ = dataset[neg_graphs[idx]]
                    _, g2 = self.convert_format(g2, graph_name)
                    graphs.append(g2)
        except Exception as e:
            print("Exception when processing graph info", e)
        return {"graphs": graphs}


api.add_resource(ExplanationAPI, '/api/v1/explain', endpoint='explain')
api.add_resource(ExplanationGraphAPI, '/api/v1/explain_graph', endpoint='explain_graph')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=39500)
