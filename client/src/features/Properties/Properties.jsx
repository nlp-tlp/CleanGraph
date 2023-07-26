// Defaults to central node but will switch based on left click action on nodes.

import React, { useContext, useState, useEffect } from "react";
import {
  Typography,
  Stack,
  TextField,
  Box,
  MenuItem,
  Tooltip,
  Divider,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { GraphContext } from "../../shared/context";
import { updateItem, acknowledge, deleteProperty } from "../../shared/api";
import LoadingButton from "@mui/lab/LoadingButton";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import { alpha, darken, lighten, styled, useTheme } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import CircleIcon from "@mui/icons-material/Circle";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import _ from "lodash";
import SwapHorizontalCircleIcon from "@mui/icons-material/SwapHorizontalCircle";
import { SnackbarContext } from "../../shared/snackbarContext";
import moment from "moment";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import NodeMerge from "../ModalViews/NodeMerge";

const CustomTextField = styled(TextField)({
  backgroundColor: "white",
});

const Properties = () => {
  const theme = useTheme();
  const { openSnackbar } = useContext(SnackbarContext);
  const [
    {
      currentItemId,
      currentItemIsNode,
      ontology,
      data,
      settings,
      ontologyId2Detail,
    },
    dispatch,
  ] = useContext(GraphContext);

  const currentItem = currentItemIsNode
    ? data.nodes[currentItemId]
    : data.links[currentItemId];
  const [initialValues, setInitialValues] = useState({
    name: currentItem.name,
    type: currentItem.type,
    properties: currentItem.properties,
  });
  const [values, setValues] = useState({
    name: currentItem.name,
    type: currentItem.type,
    properties: currentItem.properties,
  });
  const [loading, setLoading] = useState(false);

  const propertiesChanged = !_.isEqual(
    values.properties,
    currentItem?.properties
  );

  const itemChanged = currentItemIsNode
    ? values.name !== currentItem?.name ||
      values.type !== currentItem?.type ||
      propertiesChanged
    : values.type !== currentItem?.type || propertiesChanged;
  const [view, setView] = useState("main"); // main, errors, suggestions

  const errorSize = currentItem?.errors.length || 0;
  const suggestionSize = currentItem?.suggestions.length || 0;

  const hasErrors = errorSize > 0;
  const hasSuggestions = suggestionSize > 0;

  const handleViewChange = (newView) => {
    setView(view === newView ? "main" : newView);
  };

  const [showMergeModal, setShowMergeModal] = useState({
    open: false,
    data: null,
  });

  useEffect(() => {
    if (currentItem) {
      // Resets fields when user switches between items - TODO: review - probably not the best way/hacky.
      if (currentItemIsNode) {
        setValues((prevState) => ({
          ...prevState,
          name: currentItem?.name || prevState.name,
        }));
      }
      setValues((prevState) => ({
        ...prevState,
        type: currentItem?.type || prevState.type,
        properties: currentItem?.properties || prevState.properties,
      }));
    }
  }, [currentItem]);

  const handleUpdate = async (context, payload) => {
    setLoading(context);
    try {
      const response = await updateItem(
        currentItem._id,
        currentItemIsNode ? "node" : "edge",
        payload
      );

      if (response.status === 200) {
        if (response.data.node_exists) {
          // Users changes will confict with an existing graph node - must merge or discard changes.
          setShowMergeModal({
            open: true,
            data: {
              ...response.data,
              name: values.name,
              type: values.type,
              itemId: currentItemId,
            },
          });
        } else if (response.data.item_modified) {
          dispatch({
            type: "UPDATE_ITEM",
            payload: {
              itemId: currentItemId,
              isNode: currentItemIsNode,
              ...payload,
            },
          });
          openSnackbar(
            "success",
            "Success",
            `${currentItemIsNode ? "node" : "edge"} ${context} updated`
          );
        }
      } else {
        throw new Error("Unable to update item");
      }
    } catch (error) {
      openSnackbar("error", "Error", "Unable to update item");
    } finally {
      setLoading(null);
    }
  };

  const handleReview = async () => {
    await handleUpdate("review", {
      is_reviewed: !currentItem.is_reviewed,
    });
  };

  const handleActivation = async () => {
    await handleUpdate("activation", { is_active: !currentItem.is_active });
  };

  const unselectCurrentItem = () => {
    dispatch({
      type: "SET_VALUE",
      payload: {
        key: "currentItemId",
        value: null,
      },
    });
  };

  const handleReset = () => {
    setValues(initialValues);
  };

  return (
    <>
      {showMergeModal.open && (
        <NodeMerge
          open={showMergeModal.open}
          handleClose={() => setShowMergeModal({ open: false, data: null })}
          data={showMergeModal.data}
        />
      )}
      <Box display="flex" flexDirection="column" sx={{ height: "100%" }}>
        <Box p={2}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography sx={{ fontWeight: 700 }}>Information </Typography>
            <Tooltip title="Click to close">
              <IconButton onClick={unselectCurrentItem}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack>
            <Typography variant="caption">
              {values.name}{" "}
              {currentItemIsNode &&
                "[" + ontologyId2Detail.nodes[values.type].name + "]"}
            </Typography>
          </Stack>
        </Box>
        <Divider />
        <Box p={1}>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="space-evenly"
            alignItems="center"
          >
            {settings.display_errors && (
              <Tooltip title="Click to show errors">
                <CustomChip
                  name="error"
                  label={hasErrors ? `Errors: ${errorSize}` : "No Errors"}
                  hasValues={hasErrors}
                  view={view}
                  handleViewChange={() => handleViewChange("errors")}
                  settings={settings}
                  disabled={currentItem?.errors.length === 0}
                />
              </Tooltip>
            )}
            {settings.display_suggestions && (
              <Tooltip title="Click to show suggestions">
                <CustomChip
                  name="suggestion"
                  label={
                    hasSuggestions
                      ? `Suggestions: ${suggestionSize}`
                      : "No Suggestions"
                  }
                  hasValues={hasSuggestions}
                  view={view}
                  handleViewChange={() => handleViewChange("suggestions")}
                  settings={settings}
                  disabled={currentItem?.suggestions.length === 0}
                />
              </Tooltip>
            )}
            {(settings.display_errors || settings.display_suggestions) && (
              <Divider orientation="vertical" flexItem variant="middle" />
            )}
            <Tooltip
              title={`Click to set this ${
                currentItemIsNode ? "node" : "edge"
              } as ${currentItem.is_reviewed ? "unreviewed" : "reviewed"}`}
            >
              {loading === "review" ? (
                <SubmittingProgress />
              ) : (
                <IconButton onClick={handleReview}>
                  <CheckBoxIcon
                    fontSize="small"
                    color={currentItem.is_reviewed ? "success" : "primary"}
                  />
                </IconButton>
              )}
            </Tooltip>
            <Tooltip
              title={`Click to set this ${
                currentItemIsNode ? "node" : "edge"
              } as ${currentItem.is_active ? "inactive" : "active"}`}
            >
              {loading === "activation" ? (
                <SubmittingProgress />
              ) : (
                <IconButton onClick={handleActivation}>
                  <DeleteIcon
                    fontSize="small"
                    color={currentItem.is_active ? "primary" : "error"}
                  />
                </IconButton>
              )}
            </Tooltip>
          </Stack>
        </Box>
        <Divider flexItem />
        {view === "errors" || view === "suggestions" ? (
          <SecondaryView
            context={view}
            currentItemId={currentItemId}
            currentItemIsNode={currentItemIsNode}
          />
        ) : (
          <MainView
            currentItem={currentItem}
            currentItemIsNode={currentItemIsNode}
            ontology={ontology}
            values={values}
            setValues={setValues}
            handleUpdate={handleUpdate}
            loading={loading}
            itemChanged={itemChanged}
            handleReset={handleReset}
          />
        )}
      </Box>
    </>
  );
};

const MainView = ({
  currentItem,
  currentItemIsNode,
  ontology,
  values,
  setValues,
  handleUpdate,
  loading,
  itemChanged,
  handleReset,
}) => {
  const reverseEdgeDirection = async () => {
    await handleUpdate("reverseEdgeDirection", { reverse_direction: true });
  };

  const handleInfoUpdate = async () => {
    await handleUpdate("information", values);
  };

  return (
    <>
      <Box sx={{ flexGrow: 1 }} p={1}>
        {currentItem && currentItem._id ? (
          <Stack
            direction="column"
            alignItems="center"
            justifyContent="center"
            spacing={2}
          >
            {currentItemIsNode && (
              <Tooltip
                title="This is the name or label of the node"
                placement="left"
              >
                <CustomTextField
                  id="property-name-select-field"
                  label="Label"
                  value={values.name}
                  onChange={(e) =>
                    setValues((prevState) => ({
                      ...prevState,
                      name: e.target.value,
                    }))
                  }
                  required
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="normal"
                />
              </Tooltip>
            )}
            <Tooltip
              title={`This is the class of the ${
                currentItemIsNode ? "node" : "edge"
              }`}
              placement="left"
            >
              <CustomTextField
                id="property-class-select-field"
                select
                fullWidth
                label="Class"
                value={values.type}
                onChange={(e) =>
                  setValues((prevState) => ({
                    ...prevState,
                    type: e.target.value,
                  }))
                }
                size="small"
                margin="normal"
              >
                {ontology?.[currentItemIsNode ? "nodes" : "edges"]
                  ?.sort((a, b) => a.name.localeCompare(b.name))
                  .map((i) => (
                    <MenuItem value={i._id} key={i._id}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        {currentItemIsNode ? (
                          <CircleIcon sx={{ fontSize: 12, color: i.color }} />
                        ) : (
                          <HorizontalRuleIcon
                            sx={{ fontSize: 12, color: i.color }}
                          />
                        )}
                        <Typography>{i.name}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
              </CustomTextField>
            </Tooltip>
            <PropertyView
              itemId={currentItem._id}
              itemIsNode={currentItemIsNode}
              values={values}
              setValues={setValues}
            />
          </Stack>
        ) : (
          <Box p="1rem 0rem">
            <Typography>Nothing Selected</Typography>
          </Box>
        )}
      </Box>
      <Divider flexItem />
      <Box
        sx={{ display: "flex", justifyContent: "right", width: "100%" }}
        p="0.5rem 1rem"
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={currentItemIsNode ? "right" : "space-between"}
          width="100%"
        >
          {!currentItemIsNode &&
            (loading === "reverseEdgeDirection" ? (
              <SubmittingProgress />
            ) : (
              <Tooltip title="Click to reverse edge direction">
                <IconButton onClick={reverseEdgeDirection}>
                  <SwapHorizontalCircleIcon />
                </IconButton>
              </Tooltip>
            ))}
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              disabled={!itemChanged}
              onClick={handleReset}
            >
              Reset
            </Button>
            <LoadingButton
              variant="contained"
              size="small"
              disabled={!itemChanged}
              onClick={handleInfoUpdate}
              loading={loading === "information"}
              // startIcon={<CheckIcon />}
            >
              Update
            </LoadingButton>
          </Stack>
        </Stack>
      </Box>
    </>
  );
};

const PropertyView = ({ itemId, itemIsNode, values, setValues }) => {
  const [state, dispatch] = useContext(GraphContext);
  const { openSnackbar } = useContext(SnackbarContext);
  const [deletingId, setDeletingId] = useState();

  const hasProperties =
    values?.properties && Object.keys(values.properties).length > 0;
  const propertySize = hasProperties
    ? Object.keys(values.properties).length
    : 0;

  const handleDelete = async (propertyId) => {
    try {
      setDeletingId(propertyId);
      const response = await deleteProperty(itemIsNode, itemId, propertyId);
      if (response.status === 200) {
        if (response.data.property_deleted) {
          dispatch({
            type: "DELETE_PROPERTY",
            payload: {
              itemId: itemId,
              isNode: itemIsNode,
              propertyId: propertyId,
            },
          });
          openSnackbar("success", "Success", "Successfully deleted property");
        } else {
          throw new Error();
        }
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", "Unable to delete property");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box width="100%">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography>Properties ({propertySize})</Typography>
        <IconButton disabled>
          <Tooltip title="Click to add a new property">
            <AddCircleIcon />
          </Tooltip>
        </IconButton>
      </Stack>
      {hasProperties && <Divider flexItem />}
      <Box
        sx={{
          maxHeight: 140,
          overflowY: "auto",
        }}
        p={hasProperties ? "0.5rem 0rem 1rem 0rem" : "0rem"}
      >
        {hasProperties && (
          <Stack direction="column" spacing={2}>
            {values.properties.map((property, index) => (
              <>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <CustomInput
                    key={property.id}
                    id={property.id}
                    name={property.name}
                    value={property.value}
                    valueType={property.value_type}
                    setValues={setValues}
                    size="small"
                    fullWidth
                  />
                  {deletingId === property.id ? (
                    <SubmittingProgress />
                  ) : (
                    <IconButton onClick={() => handleDelete(property.id)}>
                      <Tooltip title="Click to delete property">
                        <DeleteIcon fontSize="small" />
                      </Tooltip>
                    </IconButton>
                  )}
                </Stack>
                <Divider variant="middle" flexItem />
              </>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

const SecondaryView = ({ context, currentItemId, currentItemIsNode }) => {
  const [state, dispatch] = useContext(GraphContext);
  const data =
    state.data[currentItemIsNode ? "nodes" : "links"][currentItemId][context];
  const isErrors = context === "errors";
  const { openSnackbar } = useContext(SnackbarContext);
  const [acknowledgingId, setAcknowledgingId] = useState();

  const handleAcknowledge = async (errorOrSuggestionItemId) => {
    try {
      setAcknowledgingId(errorOrSuggestionItemId);
      const response = await acknowledge(
        currentItemIsNode,
        currentItemId,
        isErrors,
        errorOrSuggestionItemId
      );
      if (response.status === 200) {
        if (response.data.item_acknowledged) {
          dispatch({
            type: "UPDATE_ACKNOWLEDGEMENT",
            payload: {
              itemId: currentItemId,
              isNode: currentItemIsNode,
              isError: isErrors,
              errorOrSuggestionItemId: errorOrSuggestionItemId,
            },
          });
          openSnackbar(
            "success",
            "Success",
            `Successfully acknowledged ${isErrors ? "error" : "suggestion"}`
          );
        }
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar(
        "error",
        "Error",
        `Failed to acknowledge ${isErrors ? "error" : "suggestion"}`
      );
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <Box sx={{ height: 300 }}>
      <Box p="0.5rem 0.5rem 0rem 0.5rem">
        <Typography fontWeight={700} sx={{ textTransform: "capitalize" }}>
          {context}
        </Typography>
      </Box>
      <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
        <List dense>
          {data
            .sort((a, b) => a.acknowledged - b.acknowledged)
            .map((i) => {
              const lastUpdated = moment.utc(i.updated_at).fromNow();
              const isAcknowledged = i.acknowledged;
              const value = (
                <Typography fontSize={14}>
                  <Box component="span" fontWeight={isAcknowledged ? 500 : 700}>
                    {i[isErrors ? "error_value" : "suggestion_value"]}
                  </Box>
                  {" - " + lastUpdated}
                </Typography>
              );
              const type = i[isErrors ? "error_type" : "suggestion_type"];

              return (
                <>
                  <ListItem
                    key={i.id}
                    sx={{
                      backgroundColor: isAcknowledged
                        ? "inherit"
                        : alpha(
                            state.settings.colors[
                              isErrors ? "error" : "suggestion"
                            ],
                            0.1
                          ),
                    }}
                    secondaryAction={
                      !isAcknowledged && acknowledgingId === i.id ? (
                        <SubmittingProgress />
                      ) : !isAcknowledged ? (
                        <IconButton onClick={() => handleAcknowledge(i.id)}>
                          <Tooltip title="Mark as acknowledged">
                            <CheckBoxIcon fontSize="small" />
                          </Tooltip>
                        </IconButton>
                      ) : null
                    }
                  >
                    <ListItemText primary={value} secondary={type} />
                  </ListItem>
                  <Divider />
                </>
              );
            })}
        </List>
      </Box>
      <Divider flexItem />
      <Box
        sx={{ display: "flex", justifyContent: "right", width: "100%" }}
        p="0.5rem 1rem"
      ></Box>
    </Box>
  );
};

const CustomInput = ({ id, name, value, valueType, setValues, ...props }) => {
  const handleChange = (event) => {
    setValues((prevState) => ({
      ...prevState,
      properties: prevState.properties.map((p) =>
        p.id === id
          ? {
              ...p,
              value: event.target[valueType === "bool" ? "checked" : "value"],
            }
          : p
      ),
    }));
  };

  switch (valueType) {
    case "str":
      return (
        <CustomTextField
          label={name}
          value={value}
          onChange={handleChange}
          {...props}
        />
      );
    case "bool":
      return (
        <FormControlLabel
          control={
            <Checkbox checked={value} onChange={handleChange} {...props} />
          }
          label={name}
          labelPlacement="start"
        />
      );
    case "int":
    case "float":
      return (
        <CustomTextField
          label={name}
          value={value}
          type="number"
          onChange={handleChange}
          {...props}
        />
      );
    default:
      return (
        <CustomTextField
          label={name}
          value={value}
          onChange={handleChange}
          {...props}
        />
      );
  }
};

const SubmittingProgress = () => {
  return (
    <Box p="8px" display="flex" alignItems="center" justifyContent="center">
      <CircularProgress size="1.25rem" />
    </Box>
  );
};

const CustomChip = ({
  name,
  label,
  hasValues,
  view,
  handleViewChange,
  settings,
  disabled,
}) => {
  const viewName = name + "s";

  return (
    <Chip
      label={label}
      clickable
      size="small"
      sx={{
        borderColor: hasValues ? settings.colors[name] : "primary",
        color:
          hasValues && view === viewName
            ? "white"
            : hasValues
            ? settings.colors[name]
            : "primary",
        backgroundColor:
          hasValues && view === viewName
            ? settings.colors[name]
            : hasValues
            ? lighten(settings.colors[name], 0.98)
            : "primary",
        "&.MuiButtonBase-root.MuiChip-root.MuiChip-clickable:hover": {
          backgroundColor:
            hasValues && view === viewName
              ? darken(settings.colors[name], 0.1)
              : hasValues
              ? lighten(settings.colors[name], 0.9)
              : "primary",
        },
      }}
      variant={hasValues && view === viewName ? "contained" : "outlined"}
      onClick={handleViewChange}
      disabled={disabled}
    />
  );
};

export default Properties;
