import { useContext } from "react";
import { Pagination as MUIPagination } from "@mui/material";
import { GraphContext } from "../../shared/context";
import { useParams } from "react-router-dom";
import { getSubgraph } from "../../shared/api";
import { SnackbarContext } from "../../shared/snackbarContext";

const Pagination = () => {
  const [state, dispatch] = useContext(GraphContext);
  const { graphId } = useParams();
  const { openSnackbar } = useContext(SnackbarContext);

  const handleChangePage = async (event, newPage) => {
    try {
      const response = await getSubgraph({
        graphId: graphId,
        nodeId: state.centralNodeId,
        page: newPage - 1,
        limit: state.settings.graph.limit,
      });

      if (response.status === 200) {
        dispatch({
          type: "PAGINATION",
          payload: { ...response.data, page: newPage },
        });
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", "Unable to fetch graph data");
    }
  };

  console.log("limit", state.settings.graph.limit);

  return (
    <MUIPagination
      count={Math.ceil(state.maxTriples / state.settings.graph.limit)}
      page={state.page}
      onChange={handleChangePage}
      variant="outlined"
      size="small"
    />
  );
};

export default Pagination;
