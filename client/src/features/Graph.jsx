import { useState, useEffect, useCallback, useContext } from "react";
import { ForceGraph2D } from "react-force-graph";
import { Grid, Paper, Skeleton } from "@mui/material";
import { orange } from "@mui/material/colors";
import { alpha } from "@mui/material";
import * as d3 from "d3";
import { colorShade, getFontColor } from "../shared/utils";
import {
  NODE_SIZE,
  DEACTIVATE_COLOR,
  DEACTIVATE_BORDER_COLOR,
  REVIEWED_BORDER_COLOR,
} from "../shared/constants";
import { GraphContext } from "../shared/context";

const Graph = () => {
  const [state, dispatch] = useContext(GraphContext);
  const [graphData, setGraphData] = useState(state.data);

  const [graphLoaded, setGraphLoaded] = useState(false);
  const [initialCenter, setInitialCenter] = useState(true);
  const [height, setHeight] = useState();
  const [width, setWidth] = useState();

  const [deactivatedNodeIds, setDeactivatedNodeIds] = useState(new Set());
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  const graphBoxRef = useCallback((node) => {
    if (node !== null) {
      const height = node.offsetHeight;
      const width = node.offsetWidth;
      // console.log("height", height, "width", width);
      setHeight(height);
      setWidth(width);
    }
  }, []);
  const graphRef = useCallback(
    (node) => {
      if (node !== null) {
        node.d3Force("link").distance(500);
        node.d3Force("charge").strength(-250);
        node.d3Force("charge").distanceMax(2500);
        node.d3Force("collide", d3.forceCollide(50));
      }
    },
    [initialCenter]
  );

  const handleNodeRemove = (node) => {
    console.log("Setting node for removal", node);
    const nodeId = node.id;

    const newNode = { ...node, active: !node.active };
    // console.log("newNode", newNode);

    let newNodes = graphData.nodes.map((n) => (n.id === nodeId ? newNode : n));

    // console.log("newNodes", newNodes);

    let newLinks = graphData.links.map((l) =>
      l.source.id === nodeId
        ? { ...l, source: newNode, active: !node.active }
        : l.target.id === nodeId
        ? { ...l, target: newNode, active: !node.active }
        : l
    );

    // console.log("newLinks", newLinks);

    // Check whether links are connected to nodes that will become stranded (have no other links)
    let strandedNodeIds = [];
    graphData.neighbours[node.id].nodes.forEach((nId) => {
      // console.log("nId", nId, state.data.neighbours[nId]);
      if (graphData.neighbours[nId].nodes.length === 1) {
        // Neighbour node is only connected to node being deactivated.
        strandedNodeIds.push(nId);
      }
    });

    // console.log("strandedNodeIds", strandedNodeIds);

    // Update active state for stranded nodes
    newNodes = newNodes.map((n) =>
      strandedNodeIds.includes(n.id) ? { ...n, active: !node.active } : n
    );

    // console.log("new nodes after updating stranded", newNodes);

    // Map mapping of strandedNodes so they are easily usable to update links - THIS IS TERRIBLE (Sorry future Tyler!)
    const strandedNodeMap = Object.assign(
      {},
      ...strandedNodeIds.map((id) => ({
        [id]: newNodes.filter((n) => n.id === id)[0],
      }))
    );

    // console.log("strandedNodeMap", strandedNodeMap);

    // Update links for stranded nodes (otherwise they become disconnected)
    newLinks = newLinks.map((l) =>
      strandedNodeIds.includes(l.source.id)
        ? { ...l, source: strandedNodeMap[l.source.id] }
        : strandedNodeIds.includes(l.target.id)
        ? { ...l, target: strandedNodeMap[l.target.id] }
        : l
    );

    // console.log("newLinks", newLinks);

    dispatch({
      type: "SET_VALUE",
      payload: {
        key: "data",
        value: {
          ...state.data,
          nodes: [
            ...state.data.nodes.filter(
              (n) => ![nodeId, ...strandedNodeIds].includes(n.id)
            ),
            ...newNodes.filter((n) =>
              [nodeId, ...strandedNodeIds].includes(n.id)
            ),
          ],
          links: [
            ...state.data.links.filter(
              (l) =>
                ![nodeId, ...strandedNodeIds].includes(l.source.id) &&
                ![nodeId, ...strandedNodeIds].includes(l.target.id)
            ),
            ...newLinks.filter(
              (l) =>
                [nodeId, ...strandedNodeIds].includes(l.source.id) ||
                [nodeId, ...strandedNodeIds].includes(l.target.id)
            ),
          ],
        },
      },
    });
  };

  const handleLinkRemove = (link) => {
    // Action for setting a single link/triplet for removal
    // If source or target are stranded after link removal, then they will be deactivated.
    console.log("Setting link for removal", link);
    const linkId = link.id;

    const sourceId = link.source.id;
    const targetId = link.target.id;
    console.log("sourceid", sourceId, "targetid", targetId);

    // Check if source and targets have more than the current link
    const sourceIsStranded =
      state.data.neighbours[sourceId].links.filter((l) => l !== linkId)
        .length === 0;
    const targetIsStranded =
      state.data.neighbours[targetId].links.filter((l) => l !== linkId)
        .length === 0;

    console.log(
      "sourceIsStranded",
      sourceIsStranded,
      "targetIsStranded",
      targetIsStranded
    );

    // This is whack...
    const strandedNodeIds = [
      ...(sourceIsStranded ? [sourceId] : []),
      ...(targetIsStranded ? [targetId] : []),
    ];

    console.log("strandedNodeIds", strandedNodeIds);

    const newNodes = state.data.nodes.map((n) =>
      strandedNodeIds.includes(n.id) ? { ...n, active: !link.active } : n
    );

    const strandedNodeMap = Object.assign(
      {},
      ...strandedNodeIds.map((id) => ({
        [id]: newNodes.filter((n) => n.id === id)[0],
      }))
    );

    // Update links for current link
    let newLinks = state.data.links.map((l) =>
      l.id === linkId ? { ...l, active: !link.active } : l
    );
    // Update links based on nodes being updated
    newLinks = newLinks.map((l) =>
      strandedNodeIds.includes(l.source.id) &&
      strandedNodeIds.includes(l.target.id)
        ? {
            ...l,
            source: strandedNodeMap[l.source.id],
            target: strandedNodeMap[l.target.id],
          }
        : strandedNodeIds.includes(l.source.id)
        ? { ...l, source: strandedNodeMap[l.source.id] }
        : strandedNodeIds.includes(l.target.id)
        ? { ...l, target: strandedNodeMap[l.target.id] }
        : l
    );

    dispatch({
      type: "SET_VALUE",
      payload: {
        key: "data",
        value: { ...state.data, nodes: newNodes, links: newLinks },
      },
    });
  };

  const handleNodeDrag = (node) => {
    highlightNodes.clear();
    highlightLinks.clear();

    if (node) {
      highlightNodes.add(node.id);
      state.data.neighbours[node.id].nodes.forEach((neighbour) =>
        highlightNodes.add(neighbour)
      );
      state.data.neighbours[node.id].links.forEach((link) =>
        highlightLinks.add(link)
      );
    }

    // console.log(highlightLinks);

    setHighlightNodes(highlightNodes);
    setHighlightLinks(highlightLinks);
  };

  const handleNodeDragEnd = (node) => {
    setHighlightLinks(new Set());
    setHighlightNodes(new Set());

    // node.fx = node.x;
    // node.fy = node.y;
    // node.fz = node.z;
  };

  const linkIsHighlighted = (linkId) =>
    (highlightLinks.size > 0 && highlightLinks.has(linkId)) ||
    highlightLinks.size === 0;

  const nodeIsHighlighted = (nodeId) =>
    (highlightNodes.size > 0 && highlightNodes.has(nodeId)) ||
    highlightNodes.size === 0;

  const sliceGraphData = (nodes, links, min, max) => {
    // Slices graph data based on min/max

    if (links.length < max) {
      return { nodes: nodes, links: links };
    } else {
      const slicedLinks = links.slice(min, max);
      // Get nodes corresponding to sliced links
      const slicedNodeIds = slicedLinks.flatMap((l) => [
        l.source.id === undefined ? l.source : l.source.id,
        l.target.id === undefined ? l.target : l.target.id,
      ]);

      // console.log("slicedNodeIds", slicedNodeIds);

      const slicedNodes = nodes.filter((n) => slicedNodeIds.includes(n.id));

      return { nodes: slicedNodes, links: slicedLinks };
    }
  };

  // useEffect(() => {
  //   if (state.selectedNodeId !== null) {
  //     const newNodeIds = [
  //       state.selectedNodeId,
  //       ...state.data.neighbours[state.selectedNodeId].nodes,
  //     ];
  //     const newLinkIds = state.data.neighbours[state.selectedNodeId].links;

  //     const newNodes = state.data.nodes.filter((n) =>
  //       newNodeIds.includes(n.id)
  //     );
  //     const newLinks = state.data.links.filter((l) =>
  //       newLinkIds.includes(l.id)
  //     );

  //     // Slice data
  //     const slicedData = sliceGraphData(
  //       newNodes,
  //       newLinks,
  //       state.sliceRange.min,
  //       state.sliceRange.max
  //     );

  //     dispatch({
  //       type: "SET_VALUE",
  //       payload: { key: "currentTripletCount", value: slicedData.links.length },
  //     });

  //     setGraphData({
  //       nodes: slicedData.nodes,
  //       links: slicedData.links,
  //       neighbours: state.data.neighbours,
  //     });
  //   } else if (state.data) {
  //     // Slice data
  //     const slicedData = sliceGraphData(
  //       state.data.nodes,
  //       state.data.links,
  //       state.sliceRange.min,
  //       state.sliceRange.max
  //     );

  //     console.log("slicedData", slicedData);

  //     dispatch({
  //       type: "SET_VALUE",
  //       payload: { key: "currentTripletCount", value: slicedData.links.length },
  //     });

  //     setGraphData({
  //       nodes: slicedData.nodes,
  //       links: slicedData.links,
  //       neighbours: state.data.neighbours,
  //     });
  //   }
  // }, [state.selectedNodeId, state.data, state.sliceRange]);

  if (!state.data || state.loading) {
    return <Skeleton variant="rectangular" width="100%" height="100%" />;
  } else {
    return (
      <Grid
        container
        sx={{ height: "100vh" }}
        component={Paper}
        justifyContent="center"
        alignItems="center"
        ref={graphBoxRef}
        square
        elevation={0}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={state.data}
          width={!width ? 600 : width - 10}
          height={!height ? 600 : height - 10}
          cooldownTicks={100}
          onEngineStop={() => {
            if (graphLoaded) {
              // console.log("centering graph");
              setInitialCenter(false);
            }
            dispatch({ type: "SET_LOADING", payload: false });
          }}
          onBackgroundClick={(e) => {
            console.log("clicked graph background");

            // Unselect any currently selected items
            dispatch({
              type: "SET_VALUE",
              payload: {
                key: "currentNode",
                value: null,
              },
            });
          }}
          onNodeDrag={handleNodeDrag}
          onNodeDragEnd={handleNodeDragEnd}
          // onNodeRightClick={handleNodeRemove}
          // onLinkRightClick={handleLinkRemove}
          onNodeClick={(n) => {
            dispatch({
              type: "SET_VALUE",
              payload: {
                key: "currentNode",
                value: state.currentNode?.id === n.id ? null : n,
              },
            });
          }}
          nodeOpacity={0.1}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.2}
          d3AlphaMin={0.05}
          d3AlphaTarget={0.9}
          nodeVisibility={(node) => nodeIsHighlighted(node.id)}
          nodeRelSize={NODE_SIZE}
          nodeVal={(node) => node.value}
          nodeLabel={(node) =>
            `<div style="text-align: center"><span>${node.name}</br>[${node.type}]</br>${node.value}</span></div>`
          }
          linkVisibility={(link) => linkIsHighlighted(link.id)}
          linkCurvature="curvature"
          linkLabel={(link) =>
            `(${link.source.name})-[${link.type}]->(${link.target.name})`
          }
          linkWidth={2}
          // linkColor={(link) =>
          //   link.is_reviewed
          //     ? alpha(REVIEWED_BORDER_COLOR, 0.5)
          //     : link.is_active
          //     ? link.color
          //     : DEACTIVATE_BORDER_COLOR
          // }
          linkDirectionalArrowColor={(link) =>
            link.is_active ? link.color : DEACTIVATE_BORDER_COLOR
          }
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowLength={30}
          linkLineDash={(l) => (!l.is_active || l.is_reviewed) && [6, 8]}
          enableNodeDrag={true}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const fontSize = (14 * Math.cbrt(node.value)) / globalScale ** 0.6;

            const nodeSize = NODE_SIZE * Math.cbrt(node.value);
            // Create outer node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.is_active
              ? alpha(colorShade(node.color, 25), 1)
              : colorShade(node.color, 90);
            ctx.fill();

            // Create inner node circle
            if (node.is_reviewed) {
              ctx.setLineDash([8, 10]);
              ctx.strokeStyle = alpha(REVIEWED_BORDER_COLOR, 0.75);
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeSize * 1.15, 0, 2 * Math.PI, false);
              ctx.lineWidth = nodeSize * 0.075;
              ctx.stroke();
              ctx.setLineDash([]);
            }
            if (state.currentNode?.id === node.id) {
              ctx.strokeStyle = alpha(node.color, 0.5);
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeSize * 1.3, 0, 2 * Math.PI, false);
              ctx.lineWidth = nodeSize * 0.075;
              ctx.stroke();
            }

            ctx.strokeStyle = node.is_active
              ? node.color
              : DEACTIVATE_BORDER_COLOR;
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize - 0.5, 0, 2 * Math.PI, false);
            ctx.lineWidth = node.is_active ? 3 : 5;
            ctx.stroke();
            ctx.restore();

            // Draw triangle on top right corner
            const triangleSize = 40; // adjust the size of the triangle as needed
            const triangleHeight = (Math.sqrt(3) / 2) * triangleSize;

            ctx.beginPath();
            ctx.moveTo(
              node.x + nodeSize + triangleSize / 2,
              node.y - nodeSize - triangleHeight
            ); // top vertex
            ctx.lineTo(node.x + nodeSize, node.y - nodeSize); // bottom left vertex
            ctx.lineTo(node.x + nodeSize + triangleSize, node.y - nodeSize); // bottom right vertex
            ctx.closePath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = orange[700];
            ctx.stroke();
            ctx.fillStyle = orange[300]; // set the color of the triangle as needed
            ctx.fill();

            // Draw number in the center of the triangle
            const triangleCenterX = node.x + nodeSize + triangleSize / 2;
            const triangleCenterY = node.y - nodeSize - triangleHeight / 3;
            const triangleNumber = 5; // replace with the number you want to draw
            ctx.font = `${triangleSize * 0.5}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";
            ctx.fillText(triangleNumber, triangleCenterX, triangleCenterY);

            // Text
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = getFontColor(
              node.is_active ? node.color : colorShade(node.color, 90)
            );

            var maxNodeWordLen = 12;
            var nodeLabelLines = [];

            const node_words = node.name.split(" ");

            for (var i = 0; i < Math.min(4, node_words.length); i++) {
              var word = node_words[i];
              if (word.length > maxNodeWordLen) {
                word = word.slice(0, maxNodeWordLen) + "...";
              }
              nodeLabelLines.push(word);
            }

            var yStart = -(fontSize / 2) * (nodeLabelLines.length - 1);
            for (var i = 0; i < nodeLabelLines.length; i++) {
              ctx.fillText(
                nodeLabelLines[i],
                node.x,
                yStart + node.y + (fontSize + 2) * i
              );
            }
          }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link, ctx, globalScale) => {
            const lineWidth = (14 * Math.cbrt(link.value)) / globalScale ** 0.6;

            // Calculate the distance between the source and target nodes
            const dx = link.target.x - link.source.x;
            const dy = link.target.y - link.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Calculate the normalized direction vector
            const dirX = dx / dist;
            const dirY = dy / dist;

            // Adjust the position of the source and target nodes by their radii
            const sourceRadius = NODE_SIZE * Math.cbrt(link.source.value);
            const targetRadius = NODE_SIZE * Math.cbrt(link.target.value);
            const startX = link.source.x + dirX * sourceRadius;
            const startY = link.source.y + dirY * sourceRadius;
            const endX = link.target.x - dirX * targetRadius;
            const endY = link.target.y - dirY * targetRadius;

            // Calculate adjusted midpoint
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            // Draw the line
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = link.is_reviewed
              ? alpha(REVIEWED_BORDER_COLOR, 0.5)
              : link.is_active
              ? link.color
              : DEACTIVATE_BORDER_COLOR;
            //  = link.color; //getLinkColor(link);
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // Draw the triangle on the midpoint
            const triangleSize = 40; // adjust the size as needed
            const triangleHeight = (Math.sqrt(3) / 2) * triangleSize;

            // Save the current context
            ctx.save();

            // Move to the midpoint and rotate the context
            ctx.translate(midX, midY);
            ctx.rotate(Math.atan2(dy, dx));

            // Offset the triangle
            ctx.translate(0, -0.25 * triangleHeight);

            // Draw the triangle
            ctx.beginPath();
            ctx.moveTo(triangleSize / 2, -triangleHeight); // top vertex
            ctx.lineTo(0, 0); // bottom left vertex
            ctx.lineTo(triangleSize, 0); // bottom right vertex
            ctx.closePath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = orange[700];
            ctx.stroke();
            ctx.fillStyle = orange[300]; // set the color as needed
            ctx.fill();

            // Draw number in the center of the triangle
            const triangleNumber = 5; // replace with the number you want to draw
            ctx.font = `${triangleSize * 0.5}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";
            ctx.fillText(triangleNumber, triangleSize / 2, -triangleHeight / 3);

            // Restore the context to its original state
            ctx.restore();
          }}
        />
      </Grid>
    );
  }
};

export default Graph;
