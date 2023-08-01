import "./scrollbar.css";
import React, { useContext, useEffect, useState } from "react";
import { Tooltip } from "@mui/material";
import { useParams } from "react-router-dom";
import { GraphContext } from "../../shared/context";
import { getSubgraph } from "../../shared/api";
import { SnackbarContext } from "../../shared/snackbarContext";
import { FixedSizeList } from "react-window";
import SubgraphTextSearch from "./SubgraphTextSearch";
import SubgraphListItem from "./SubgraphListItem";
import SubgraphSort from "./SubgraphSort";

const Subgraphs = () => {
  const { graphId } = useParams();
  const [state, dispatch] = useContext(GraphContext);
  const { openSnackbar } = useContext(SnackbarContext);
  const [filteredData, setFilteredData] = useState(state.subgraphs);
  const [loadingSubgraphNodeId, setLoadingSubgraphNodeId] = useState();
  const [sortDescending, setSortDescending] = useState(true);

  const handleSubGraphFilter = async (nodeId) => {
    try {
      setLoadingSubgraphNodeId(nodeId);
      const response = await getSubgraph(graphId, nodeId);
      if (response.status === 200) {
        dispatch({
          type: "SET_SUBGRAPH",
          payload: response.data,
        });
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", "Failed to retrieve subgraph");
    } finally {
      setLoadingSubgraphNodeId(null);
    }
  };

  useEffect(() => {
    setFilteredData(state.subgraphs);
  }, [state.subgraphs]);

  // Current size: {filteredData.length}
  return (
    <>
      <SubgraphTextSearch data={state.subgraphs} setResults={setFilteredData} />
      <SubgraphSort
        setFilteredData={setFilteredData}
        sortDescending={sortDescending}
        setSortDescending={setSortDescending}
      />
      <FixedSizeList
        height={window.innerHeight - 308}
        itemCount={filteredData.length}
        itemSize={74}
        width="100%"
        className="customScrollBar"
      >
        {({ index, style }) => (
          <SubgraphListItem
            style={style}
            item={filteredData[index]}
            settings={state.settings}
            centralNodeId={state.centralNodeId}
            handleSubGraphFilter={handleSubGraphFilter}
            loadingSubgraph={loadingSubgraphNodeId === filteredData[index]._id}
          />
        )}
      </FixedSizeList>
    </>
  );
};

export const TriangleIcon = ({ context, number, fillColor, strokeColor }) => {
  const triangleSize = 30; // you can adjust the size as needed
  const triangleHeight = (Math.sqrt(3) / 2) * triangleSize;

  return (
    <Tooltip title={`There are ${number} ${context} on this subgraph`}>
      <svg
        width={triangleSize}
        height={triangleHeight}
        viewBox={`0 0 ${triangleSize} ${triangleHeight}`}
        style={{ cursor: "help", userSelect: "none" }}
      >
        <polygon
          points={`${
            triangleSize / 2
          },0 ${triangleSize},${triangleHeight} 0,${triangleHeight}`}
          style={{ fill: fillColor, stroke: strokeColor, strokeWidth: "1" }}
        />
        <text
          x={triangleSize / 2}
          y={(3 * triangleHeight) / 4}
          textAnchor="middle"
          fontSize={triangleSize / 2.5}
          style={{ fill: "black" }}
        >
          {number}
        </text>
      </svg>
    </Tooltip>
  );
};

export default Subgraphs;
