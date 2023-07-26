import { useState, useContext } from "react";
import { Pagination as MUIPagination } from "@mui/material";
import { GraphContext } from "../../shared/context";
import { useParams } from "react-router-dom";
import { getPage } from "../../shared/api";
import { SnackbarContext } from "../../shared/snackbarContext";

const Pagination = ({ page, setPage }) => {
  const [state, dispatch] = useContext(GraphContext);
  const { graphId } = useParams();
  // const [page, setPage] = useState(0);
  const { openSnackbar } = useContext(SnackbarContext);

  const handleChangePage = async (event, newPage) => {
    try {
      const response = await getPage(
        graphId,
        state.centralNodeId,
        newPage,
        state.settings.graph.limit
      );

      if (response.status === 200) {
        setPage(newPage);
        dispatch({
          type: "SET_VALUE",
          payload: { key: "data", value: response.data },
        });
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", "Unable to fetch graph data");
    }
  };

  // console.log(
  //   state.maxTriples,
  //   state.settings.graph.limit,
  //   Math.ceil(state.maxTriples / state.settings.graph.limit)
  // );

  return (
    <MUIPagination
      count={Math.ceil(state.maxTriples / state.settings.graph.limit)}
      page={page + 1} // Indexes from 1 unlike TablePagination which indexes from 0.
      onPageChange={handleChangePage}
      variant="outlined"
      size="small"
    />
    // <TablePagination
    //   component="div"
    //   count={state.maxTriples}
    //   page={page}
    //   onPageChange={handleChangePage}
    //   rowsPerPage={triplesPerPage}
    //   onRowsPerPageChange={handleChangeTriplesPerPage}
    //   labelRowsPerPage={"Graph Size"}
    //   rowsPerPageOptions={[5, 10, 25, 100]}
    //   style={{ zIndex: ZIndexes.level3 }}
    // />
  );
};

export default Pagination;
