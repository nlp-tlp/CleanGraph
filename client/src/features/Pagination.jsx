import { useState, useContext } from "react";
import {
  TablePagination,
  Pagination as MUIPagination,
  Box,
} from "@mui/material";
import { GraphContext } from "../shared/context";
import { useParams } from "react-router-dom";
import axios from "axios";

const Pagination = () => {
  const [state, dispatch] = useContext(GraphContext);
  const { graphId } = useParams();
  const [page, setPage] = useState(0);
  const [triplesPerPage, setTriplesPerPage] = useState(10);

  const handleChangePage = async (event, newPage) => {
    setPage(newPage);

    await axios
      .get(`/graphs/${graphId}/${state.currentNode.id}`, {
        params: { skip: newPage, limit: triplesPerPage },
      })
      .then((res) => {
        dispatch({
          type: "SET_VALUE",
          payload: { key: "data", value: res.data },
        });
      });
  };

  const handleChangeTriplesPerPage = async (event) => {
    const newTriplesPerPage = parseInt(event.target.value, 10);
    setTriplesPerPage(newTriplesPerPage);
    setPage(0);

    await axios
      .get(`/graphs/${graphId}/${state.currentNode.id}`, {
        params: { skip: 0, limit: newTriplesPerPage },
      })
      .then((res) => {
        dispatch({
          type: "SET_VALUE",
          payload: { key: "data", value: res.data },
        });
      });
  };
  return (
    // <MUIPagination
    //   count={state.maxTriples}
    //   page={page}
    //   onPageChange={handleChangePage}
    //   variant="outlined"
    //   size="small"
    // />
    <TablePagination
      component="div"
      count={state.maxTriples}
      page={page}
      onPageChange={handleChangePage}
      rowsPerPage={triplesPerPage}
      onRowsPerPageChange={handleChangeTriplesPerPage}
      labelRowsPerPage={"Graph Size"}
      rowsPerPageOptions={[5, 10, 25, 100]}
    />
  );
};

export default Pagination;
