import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";
import { Grid, Paper, Skeleton, lighten } from "@mui/material";
import { alpha } from "@mui/material";
import * as d3 from "d3";
import { colorShade, getFontColor } from "../../shared/utils";
import { NODE_RADII } from "../../shared/constants";
import { GraphContext } from "../../shared/context";
import {
  drawNodeDiamondHalf,
  drawNumber,
  drawEdgeTriangle,
} from "../../shared/canvas";

import { reviewItem, deactivateItem } from "../../shared/api";
import { SnackbarContext } from "../../shared/snackbarContext";
import { grey } from "@mui/material/colors";

// Makes the lines around aggregated nodes rotate.
// Very necessary.
var lineDashOffset = 0;
window.setInterval(function () {
  lineDashOffset -= 0.1;
}, 1);

const Graph = () => {
  const [state, dispatch] = useContext(GraphContext);
  const { openSnackbar } = useContext(SnackbarContext);
  const [data, setData] = useState({
    nodes: [
      ...Object.values(state.data.nodes).map((n) => ({ ...n, id: n._id })),
    ], // TODO: Make _id "id" in API
    links: [...Object.values(state.data.links)],
  });

  const NODE_RADIUS = NODE_RADII[state.settings.graph.node_size];

  const errorFillColor = lighten(state.settings.colors.error, 0.75);
  const errorStrokeColor = state.settings.colors.error;
  const suggestionFillColor = lighten(state.settings.colors.suggestion, 0.75);
  const suggestionStrokeColor = state.settings.colors.suggestion;

  useEffect(() => {
    // Reset the graph data when the centralNodeId changes...
    setData({
      nodes: [
        ...Object.values(state.data.nodes).map((n) => ({ ...n, id: n._id })),
      ], // TODO: Make _id "id" in API
      links: [...Object.values(state.data.links)],
    });
  }, [state.centralNodeId]);

  useEffect(() => {
    setData((prevData) => {
      let newGraphNodes = prevData.nodes.map((n) => ({
        ...n,
        ...state.data.nodes[n._id],
        color:
          state.ontologyId2Detail?.nodes[state.data.nodes[n._id].type].color ??
          n.color,
      }));

      let newGraphLinks = [
        ...prevData.links.map((l) => ({
          ...l,
          source: typeof l.source === "string" ? l.source : l.source._id,
          target: typeof l.target === "string" ? l.target : l.target._id,
          color:
            state.ontologyId2Detail?.edges[state.data.links[l._id].type]
              .color ?? l.color,
          ...state.data.links[l._id],
        })),
      ];

      return {
        nodes: newGraphNodes,
        links: newGraphLinks,
      };
    });
  }, [state.data]);

  const [graphLoaded, setGraphLoaded] = useState(false);
  const [initialCenter, setInitialCenter] = useState(true);
  const [height, setHeight] = useState();
  const [width, setWidth] = useState();
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  const graphBoxRef = useCallback((node) => {
    if (node !== null) {
      const height = node.offsetHeight;
      const width = node.offsetWidth;
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

  const handleSetFocus = (isNode = null, item = null) => {
    const id = item && state.currentItemId === item._id ? null : item?._id;
    dispatch({
      type: "SET_CURRENT_ITEM",
      payload: {
        id: id,
        isNode: id ? isNode : null,
      },
    });
  };

  const handleReviewItem = async (isNode, item) => {
    try {
      const response = await reviewItem(isNode, item._id, false);
      if (response.status === 200) {
        if (response.data.item_reviewed) {
          dispatch({
            type: "REVIEW_ITEM",
            payload: {
              isNode: isNode,
              itemId: item._id,
              reviewAll: false,
              neighbours: null,
            },
          });
        } else {
          throw new Error();
        }
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", "Failed to review item.");
    }
  };

  const handleItemActivation = async (isNode, item) => {
    try {
      const response = await deactivateItem(isNode, item._id);
      if (response.status === 200) {
        if (response.data.item_updated) {
          dispatch({
            type: "TOGGLE_ITEM_ACTIVATION",
            payload: {
              itemId: item._id,
              isActive: !item.is_active,
              updatedNodeIds: response.data.updated_node_ids,
              updatedEdgeIds: response.data.updated_edge_ids,
            },
          });
        } else {
          throw new Error();
        }
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar(
        "error",
        "Error",
        "Failed to update activation state of item."
      );
    }
  };

  const handleNodeDrag = (node) => {
    highlightNodes.clear();
    highlightLinks.clear();

    if (node) {
      highlightNodes.add(node._id);
      state.data.neighbours[node._id].nodes.forEach((neighbour) =>
        highlightNodes.add(neighbour)
      );
      state.data.neighbours[node._id].links.forEach((link) =>
        highlightLinks.add(link)
      );
    }

    setHighlightNodes(highlightNodes);
    setHighlightLinks(highlightLinks);
  };

  const handleNodeDragEnd = (node) => {
    setHighlightLinks(new Set());
    setHighlightNodes(new Set());

    // Freezes node position - TODO: review, laggy.
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

  if (!state.data || state.loading) {
    return <Skeleton variant="rectangular" width="100%" height="100%" />;
  } else {
    return (
      <Grid
        container
        sx={{
          height: "100vh",
          backgroundSize: "25px 25px",
          backgroundImage: `
            radial-gradient(grey 1px, transparent 1px),
            radial-gradient(grey 1px, transparent 1px)
        `,
          backgroundPosition: "0 0",
        }}
        component={Paper}
        justifyContent="center"
        alignItems="center"
        ref={graphBoxRef}
        square
        elevation={0}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={!width ? 600 : width - 10}
          height={!height ? 600 : height - 10}
          cooldownTicks={100}
          onEngineStop={() => {
            if (graphLoaded) {
              setInitialCenter(false);
            }
            dispatch({ type: "SET_LOADING", payload: false });
          }}
          onBackgroundClick={handleSetFocus}
          onNodeDrag={handleNodeDrag}
          onNodeDragEnd={handleNodeDragEnd}
          onNodeClick={(n, event) =>
            event.shiftKey ? handleReviewItem(true, n) : handleSetFocus(true, n)
          }
          onNodeRightClick={(n) => handleItemActivation(true, n)}
          onLinkRightClick={(l) => handleItemActivation(false, l)}
          onLinkClick={(l, event) =>
            event.shiftKey
              ? handleReviewItem(false, l)
              : handleSetFocus(false, l)
          }
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.2}
          d3AlphaMin={0.05}
          d3AlphaTarget={0.9}
          nodeVisibility={(node) => nodeIsHighlighted(node._id)}
          nodeRelSize={NODE_RADIUS}
          nodeVal={(node) => node.value}
          nodeLabel={(node) =>
            `Name: ${node.name}<br/>
            Type: ${state.ontologyId2Detail.nodes[node.type].name}<br/>
            Value: ${node.value}<br/>
            Reviewed: ${node.is_reviewed ? "Yes" : "No"}<br/>
            Active: ${node.is_active ? "Yes" : "No"}<br/>
            Properties: ${node?.properties && node.properties.length}`
          }
          linkVisibility={(link) => linkIsHighlighted(link._id)}
          linkCurvature="curvature"
          linkLabel={(link) =>
            `Source: ${link.source.name}<br/>
            Relation: ${state.ontologyId2Detail.edges[link.type].name}<br/>
            Target: ${link.target.name}<br/>
            Value: ${link.value}<br/>
            Reviewed: ${link.is_reviewed ? "Yes" : "No"}<br/>
            Active: ${link.is_active ? "Yes" : "No"}<br/>
            Properties: ${link?.properties && link.properties.length}`
          }
          linkWidth={(l) => Math.min(6, l.value * 2)}
          linkDirectionalParticles={4}
          linkDirectionalParticleWidth={(l) =>
            state.currentItemId === l._id ? 10 : 0
          }
          linkColor={(l) =>
            !l.is_active
              ? state.settings.colors.deactivated
              : state.settings.graph.display_edge_labels
              ? grey[800]
              : l.color
          }
          linkDirectionalArrowColor={(l) =>
            !l.is_active
              ? state.settings.colors.deactivated
              : state.settings.graph.display_edge_labels
              ? grey[800]
              : l.color
          }
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowLength={30}
          linkLineDash={(l) => !l.is_reviewed && [6, 8]} //(!l.is_active || l.is_reviewed) && [6, 8]}
          enableNodeDrag={true}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const errorCount =
              node?.errors?.filter((e) => !e.acknowledged).length || 0; // Not acknowledged
            const hasErrors = errorCount > 0;

            const suggestionCount =
              node?.suggestions?.filter((e) => !e.acknowledged).length || 0;
            const hasSuggestions = suggestionCount > 0;

            const fontSize = (14 * Math.cbrt(node.value)) / globalScale ** 0.6;

            const nodeSize = NODE_RADIUS * Math.cbrt(node.value);

            // Create outer node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.is_active
              ? lighten(node.color, 0.5)
              : colorShade(node.color, 90);
            ctx.fill();

            // Draw solid focus halo
            if (state.currentItemId === node._id) {
              ctx.save();
              ctx.setLineDash([5, 5]);
              ctx.strokeStyle = alpha(node.color, 0.75);
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeSize * 1.2, 0, 2 * Math.PI, false);
              ctx.lineWidth = nodeSize * 0.1;
              ctx.lineDashOffset = lineDashOffset;
              ctx.stroke();
            }
            ctx.restore();

            // Draw node border circle
            if (!node.is_reviewed) {
              ctx.setLineDash([8, 10]);
            }

            ctx.strokeStyle = node.is_active
              ? node.color
              : state.settings.colors.deactivated;
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize - 0.5, 0, 2 * Math.PI, false);
            ctx.lineWidth = node.is_active ? 3 : 5;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            if (hasSuggestions || hasErrors) {
              const triangleSize = 30;
              const triangleHeight = (Math.sqrt(3) / 2) * triangleSize;
              const lineWidth = 2;

              // Draw top half of the diamond
              if (hasErrors && state.settings.display_errors) {
                drawNodeDiamondHalf(
                  ctx,
                  triangleSize,
                  triangleHeight,
                  node.x,
                  node.y,
                  nodeSize,
                  true,
                  errorStrokeColor,
                  errorFillColor,
                  lineWidth
                );
                drawNumber(
                  ctx,
                  errorCount,
                  node.x + nodeSize + triangleSize / 2,
                  node.y - nodeSize - triangleHeight / 3,
                  triangleHeight
                );
              }

              if (hasSuggestions && state.settings.display_suggestions) {
                // Draw bottom half of the diamond
                drawNodeDiamondHalf(
                  ctx,
                  triangleSize,
                  triangleHeight,
                  node.x,
                  node.y,
                  nodeSize,
                  false,
                  suggestionStrokeColor,
                  suggestionFillColor,
                  lineWidth
                );
                drawNumber(
                  ctx,
                  suggestionCount,
                  node.x + nodeSize + triangleSize / 2,
                  node.y - nodeSize + triangleHeight / 2,
                  triangleHeight
                );
              }
            }

            // Text
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = getFontColor(
              node.is_active
                ? lighten(node.color, 0.5)
                : colorShade(node.color, 90)
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
            const fontSize = 18 / globalScale ** 0.6;

            // TODO: Determine whether links need to be curved to avoid overlap
            // const startNode = link.source;
            // const endNode = link.target;

            // const sameLinks = Object.values(state.data.links).filter(
            //   (l) =>
            //     (l.source === startNode._id && l.target === endNode._id) ||
            //     (l.source === endNode._id && l.target === startNode._id)
            // );

            // const linkIndex = sameLinks.indexOf(link);
            // const numLinks = sameLinks.length;
            // const offset = (linkIndex - numLinks / 2) / (numLinks + 1);
            // const curvature = 0.2; // Adjust curvature as needed
            // const dx = end.x - start.x;
            // const dy = end.y - start.y;
            // const l = Math.sqrt(dx*dx + dy*dy);

            // // Normal vector
            // const nx = (dy/l) * offset;
            // const ny = -(dx/l) * offset;

            // // Control point
            // const cx = (start.x + end.x) / 2 + curvature * nx;
            // const cy = (start.y + end.y) / 2 + curvature * ny;

            // // Draw the link
            // ctx.beginPath();
            // ctx.moveTo(start.x, start.y);
            // ctx.quadraticCurveTo(cx, cy, end.x, end.y);
            // ctx.stroke();

            const errorCount =
              link?.errors?.filter((e) => !e.acknowledged).length || 0;
            const hasErrors = errorCount > 0;

            const suggestionCount =
              link?.suggestions?.filter((e) => !e.acknowledged).length || 0;
            const hasSuggestions = suggestionCount > 0;

            // Calculate the distance between the source and target nodes
            const dx = link.target.x - link.source.x;
            const dy = link.target.y - link.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Calculate the normalized direction vector
            const dirX = dx / dist;
            const dirY = dy / dist;

            // Adjust the position of the source and target nodes by their radii
            const sourceRadius = NODE_RADIUS * Math.cbrt(link.source.value);
            const targetRadius = NODE_RADIUS * Math.cbrt(link.target.value);
            const startX = link.source.x + dirX * sourceRadius;
            const startY = link.source.y + dirY * sourceRadius;
            const endX = link.target.x - dirX * targetRadius;
            const endY = link.target.y - dirY * targetRadius;

            // Calculate adjusted midpoint
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            if (hasErrors || hasSuggestions) {
              // Save the current context
              ctx.save();
              const triangleSize = 30; // adjust the size as needed
              const triangleHeight = (Math.sqrt(3) / 2) * triangleSize;
              const lineWidthOffset = 1;
              const rotation = hasErrors !== hasSuggestions ? Math.PI / 2 : 0; // rotate 90 degrees if only one of them is true

              // Move to the midpoint and rotate the context
              ctx.translate(midX, midY);
              const angle = Math.atan2(dy, dx);
              ctx.rotate(angle);

              // Offset the triangle and flip it if necessary
              const flip = angle > Math.PI / 2 || angle < -Math.PI / 2 ? -1 : 1;
              ctx.translate(0, flip * -0.25 * triangleHeight);

              if (flip === -1) {
                ctx.rotate(Math.PI); // rotate 180 degrees
              }

              if (hasErrors && state.settings.display_errors) {
                // Left equilateral triangle
                drawEdgeTriangle(
                  ctx,
                  -1,
                  lineWidthOffset,
                  triangleSize,
                  errorStrokeColor,
                  errorFillColor,
                  rotation
                );

                drawNumber(
                  ctx,
                  errorCount,
                  -triangleSize / 3,
                  -triangleHeight * (4 / 5),
                  triangleHeight
                );
              }

              if (hasSuggestions && state.settings.display_suggestions) {
                // Right equilateral triangle
                drawEdgeTriangle(
                  ctx,
                  1,
                  lineWidthOffset,
                  triangleSize,
                  suggestionStrokeColor,
                  suggestionFillColor,
                  rotation
                );

                drawNumber(
                  ctx,
                  suggestionCount,
                  triangleSize / 3,
                  -triangleHeight * (4 / 5),
                  triangleHeight
                );
              }
              // Revert the context to the state before the first drawing operation
              ctx.restore();
            }

            // Draw link labels
            let textPos = { x: midX, y: midY };
            let textAngle = 0;
            if (state.settings.graph.display_edge_labels) {
              // calculate label position
              const relLink = { x: endX - startX, y: endY - startY };

              // displacement to move the label below the line
              const displacement = -15;

              textAngle = Math.atan2(relLink.y, relLink.x);
              // maintain label vertical orientation for legibility
              if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
              if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

              // offset the label position along the perpendicular direction
              textPos.x += displacement * Math.sin(textAngle);
              textPos.y -= displacement * Math.cos(textAngle);

              // Draw link label
              ctx.save();
              ctx.translate(textPos.x, textPos.y);
              ctx.rotate(textAngle);
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = grey[800]; //link.color;
              ctx.fillText(
                state.ontologyId2Detail?.edges[link.type].name,
                0,
                0
              );

              ctx.restore();
            }

            // Restore the context to its original state
            ctx.restore();
          }}
        />
      </Grid>
    );
  }
};

export default Graph;
