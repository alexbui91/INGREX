# This is the official source code for INGREX: An Interactive Graph Neural Network Explanation Framework

Explanation methods used in this framework are proposed in [SCALE](https://arxiv.org/abs/2210.11094) - [Source Code](https://github.com/alexbui91/SCALE) and [PGX](https://arxiv.org/abs/2208.03075)

The project includes two components: frontend and backend. The frontend (./sc_viz) is implemented using Angular and CytoscapeJS. The backend (./web_server) uses flask as the webserver. Please checkout the README files of corresponding folders to build the web application and run the web server. Both of them need to be run.

Folder mutag_test_graphs contains some test graphs using for evaluating graph explanations.

[![Video Demo](https://res.cloudinary.com/marcomontalbano/image/upload/v1666665645/video_to_markdown/images/youtube--3T2TojvBs0w-c05b58ac6eb4c4700831b2b3070cd403.jpg)](https://youtu.be/3T2TojvBs0w "")

## Some screen captures:

***Global Visualization for Cora***
![Global Visualization for Cora](figures/capture1.PNG)

***Global Visualization for Tree-Grid***
![Global Visualization for Tree-Grid](figures/capture2.PNG)

***Local Explanation for a Node in Tree-Grid***
![Local Explanation for a Node in Tree-Grid](figures/capture3.PNG)

***Examining Node Feature Attributions in Amazon Dataset***
![Examining Node Feature Attributions in Amazon Dataset](figures/capture4.PNG)

***Examining Node Feature Attributions in Amazon Dataset***
![Graph Prediction Explanation for Mutag](figures/capture5.PNG)

***Graph Prediction Explanation for BA-2motifs***
![Graph Prediction Explanation for BA-2motifs](figures/capture6.PNG)