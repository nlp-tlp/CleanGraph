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
import { getErrors, getSuggestions } from "../../shared/api";
import { useParams } from "react-router-dom";
import { SnackbarContext } from "../../shared/snackbarContext";
import { DataGrid } from "@mui/x-data-grid";
import moment from "moment";
import { Link } from "react-router-dom";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const ErrorsOrSuggestions = ({ context, handleClose }) => {
  const { graphId } = useParams();
  const [state] = useContext(GraphContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openSnackbar } = useContext(SnackbarContext);
  const isErrors = context === "errors";
  const color = state.settings.colors[isErrors ? "error" : "suggestion"];

  useEffect(() => {
    const getData = async () => {
      if (loading) {
        try {
          let response;
          if (isErrors) {
            response = await getErrors(graphId);
          } else {
            response = await getSuggestions(graphId);
          }

          if (response.status === 200) {
            setData(response.data);
          } else {
            throw new Error();
          }
        } catch (error) {
          openSnackbar("error", "Error", `Failed to retrieve ${context}.`);
        } finally {
          setLoading(false);
        }
      }
    };

    getData();
  }, [loading]);

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
        <Link to={`/${graphId}?centralNodeId=${params.row.id}`}>
          {params.value}
        </Link>
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
      field: isErrors ? "error_type" : "suggestion_type",
      headerName: isErrors ? "Error Type" : "Suggestion Type",
      headerAlign: "center",
      align: "center",

      flex: 1,
      minWidth: 120,
    },
    {
      field: isErrors ? "error_value" : "suggestion_value",
      headerName: isErrors ? "Error Value" : "Suggestion Value",
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
            <Stack direction="row" alignItems="center" spacing={1}>
              {isErrors ? (
                <WarningAmberIcon sx={{ color: color }} />
              ) : (
                <TipsAndUpdatesIcon sx={{ color: color }} />
              )}
              <Typography
                variant="h6"
                sx={{
                  textTransform: "capitalize",
                  color: color,
                }}
              >
                {context}
              </Typography>
            </Stack>
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
        <Box p="1rem 2rem">
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
          />
        </Box>
      )}
    </Box>
  );
};

export default ErrorsOrSuggestions;
