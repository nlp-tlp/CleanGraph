import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { GraphContext } from "../../shared/context";
import { getErrors } from "../../shared/api";
import { useParams } from "react-router-dom";
import { SnackbarContext } from "../../shared/snackbarContext";
import { DataGrid } from "@mui/x-data-grid";
import moment from "moment";
import { Link } from "react-router-dom";

const ErrorsOrSuggestions = ({ context, handleClose }) => {
  const { graphId } = useParams();
  const [state] = useContext(GraphContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openSnackbar } = useContext(SnackbarContext);

  useEffect(() => {
    const getData = async () => {
      if (loading) {
        try {
          const response = await getErrors(graphId);

          if (response.status === 200) {
            setData(response.data);
          } else {
            throw new Error();
          }
        } catch (error) {
          openSnackbar("error", "Error", "Failed to retrieve errors.");
        } finally {
          setLoading(false);
        }
      }
    };

    getData();
  }, [loading]);

  if (context === "suggestions") {
    return <p>In progress...</p>;
  }

  const columns = [
    { field: "id", hide: false },
    {
      field: "is_node",
      headerName: "Item",
      valueGetter: (params) => {
        return params.value ? "Node" : "Edge"; // TODO: convert into circle/line icons.
      },
      flex: 1,
      align: "center",
      headerAlign: "center",
      minWidth: 60,
    },
    {
      field: "item_name",
      headerName: "Name",
      headerAlign: "center",
      align: "center",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Link to={`/${graphId}/${params.row.id}`}>{params.value}</Link>
      ),
    },
    {
      field: "item_type",
      headerName: "Type",
      headerAlign: "center",
      align: "center",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "error_type",
      headerName: "Error Type",
      headerAlign: "center",
      align: "center",

      flex: 1,
      minWidth: 120,
    },
    {
      field: "error_value",
      headerName: "Error Value",
      headerAlign: "center",
      align: "center",

      flex: 1,
      minWidth: 120,
    },
    {
      field: "acknowledged",
      headerName: "Acknowledged",
      headerAlign: "center",
      align: "center",
      // TODO: connect this so the user can acknowledge from this view.
    },
    {
      field: "created_at",
      headerName: "Created",
      headerAlign: "center",
      align: "center",
      valueGetter: (params) => moment.utc(params.value).fromNow(),
      flex: 1,
      minWidth: 120,
    },
  ];

  return (
    <Box>
      <Box p="1rem 2rem">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="column">
            <Typography variant="h6" sx={{ textTransform: "capitalize" }}>
              {context}
            </Typography>
            <Typography variant="caption">
              Review and action {context}
            </Typography>
          </Stack>
          <Tooltip title="Click to close">
            <IconButton onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Divider flexItem />
      {loading ? (
        <Box display="flex" alignItems="center" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          p="1rem 2rem"
          sx={{ width: "100%", height: "100%", overflowY: "auto" }}
        >
          <DataGrid
            rows={data}
            columns={columns}
            initialState={{
              columns: {
                columnVisibilityModel: {
                  id: false,
                },
              },
              pagination: {
                paginationModel: {
                  pageSize: 5,
                },
              },
            }}
            pageSizeOptions={[5]}
            disableRowSelectionOnClick
            // getRowHeight={() => "auto"}
          />
          {/* <TableContainer>
            <Table sx={{ width: "100%" }} size="small" aria-label="a dense table">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Type</TableCell>
                  <TableCell align="right">Error Type</TableCell>
                  <TableCell align="right">Error Value</TableCell>
                  <TableCell align="right">Acknowledged</TableCell>
                  <TableCell align="right">Link</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow
                    key={row.id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {row.item_name}
                    </TableCell>
                    <TableCell align="right">{row.item_type}</TableCell>
                    <TableCell align="right">{row.error_type}</TableCell>
                    <TableCell align="right">{row.error_value}</TableCell>
                    <TableCell align="right">{row.acknowledged}</TableCell>
                    <TableCell align="right">{row.item_id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer> */}
        </Box>
      )}
    </Box>
  );
};

export default ErrorsOrSuggestions;
