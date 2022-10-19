# Graph Pruner



This repository contains code for the development of a single page application intended to allow a user to upload a JSON file comprised of graph triplets in `<s,s_type,r,o,o_type>` format, render a graph and then perform deletion operations on the resulting graph. The modified graph is then able to be downloaded. This essentially constitutes error correction for triplet generation. Future work may allow CRU(D) operations.

## Basic Functionality
- [ ] User can upload a JSON file comprised of triplets that are converted into a graph format
- [ ] User can delete nodes and edges in the rendered graph
- [ ] User can download the resulting graph in JSON format

## Specifics
- [ ] Graph should be stored in local storage to ensure that it is not lost if an issue occurs with the browser