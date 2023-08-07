import "../PrimarySidebar/scrollbar.css";
import React, { useContext, useEffect, useState } from "react";
import { SnackbarContext } from "../../shared/snackbarContext";
import { GraphContext } from "../../shared/context";
import { deleteProperty } from "../../shared/api";
import { Box, Stack } from "@mui/system";
import {
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SubmittingProgress from "./SubmittingProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import CustomTextField from "./CustomTextField";
import UpdateTray from "./UpdateTray";
import { ValueType2HumanName } from "../../shared/constants";

const Properties = ({ itemId, itemIsNode, values, setValues }) => {
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

  const [groupedProperties, setGroupedProperties] = useState({});

  useEffect(() => {
    const grouped = values.properties.reduce((groups, property) => {
      const { value_type } = property;
      if (!groups[value_type]) {
        groups[value_type] = [];
      }
      groups[value_type].push(property);
      return groups;
    }, {});
    setGroupedProperties(grouped);
  }, [values]);

  return (
    <Box>
      {/* <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography>Properties ({propertySize})</Typography>
        <IconButton disabled>
          <Tooltip title="Click to add a new property">
            <AddCircleIcon />
          </Tooltip>
        </IconButton>
      </Stack> */}
      <Box
        sx={{
          maxHeight: "calc(100vh - 240px)",
          overflowY: "auto",
        }}
        className="customScrollBar"
      >
        {Object.keys(groupedProperties).map((value_type) => (
          <Box key={value_type} mb={2}>
            <Typography fontSize={16} fontWeight={600} mb={2}>
              {ValueType2HumanName[value_type]}
            </Typography>
            <Stack direction="column" spacing={2}>
              {groupedProperties[value_type].map((property) => (
                <Stack
                  key={property.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <CustomInput
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
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
      {hasProperties && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <IconButton disabled>
            <Tooltip title="Click to add new property">
              <AddCircleIcon />
            </Tooltip>
          </IconButton>
          <UpdateTray />
        </Stack>
      )}
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
          labelPlacement="end"
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

export default Properties;
