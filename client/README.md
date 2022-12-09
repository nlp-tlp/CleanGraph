# Graph Pruner
Performing error correction on machine generated triplets is arduous using spreadsheet software. This application intends to overcome this in a more native format.


This repository contains code for the development of a single page application intended to allow a user to upload a JSON file comprised of graph triplets in `<s,s_type,r,o,o_type>` format, render a graph and then perform deletion operations on the resulting graph. The modified graph is then able to be downloaded. This essentially constitutes error correction for triplet generation. Future work may allow CRU(D) operations.

## Basic Functionality
- [ ] User can upload a JSON file comprised of triplets that are converted into a graph format
- [ ] User can delete nodes and edges in the rendered graph
- [ ] User can download the resulting graph in JSON format

## Specifics
- [ ] Graph should be stored in local storage to ensure that it is not lost if an issue occurs with the browser
- [x] subject and object entities must be coloured based on their types


## Wishlist
- [ ] merge central nodes of subgraphs into other nodes; for example if a subgraph centred on `a/c` has centarlity of 20 and another centred on `air conditioner` has 50, it is desirable to merge `a/c` into the node `air conditioner` as this would act as a normalisation. In this instance, any duplicate triplets would be pruned e.g. any that already exist on the target subgraph.
- [ ] Alllow user to set patterns in `Settings` and then detect violations to them. This will allow them to modify or prune out bad triplets.


## Notes
- Subgraph central node must be included within the ranged slider. 