import React, { useContext, useEffect, useState } from "react";
import {
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  MenuItem,
  Box,
  Stack,
} from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import TitleIcon from "@mui/icons-material/Title";
import UpdateTray from "./UpdateTray";
import { GraphContext } from "../../shared/context";
import _ from "lodash";

const Details = ({ handleUpdate, loading }) => {
  const [state, dispatch] = useContext(GraphContext);
  const [currentItem, setCurrentItem] = useState();
  const [initialValues, setInitialValues] = useState();
  const [values, setValues] = useState();
  const [propertiesChanged, setPropertiesChanged] = useState(false);
  const [itemChanged, setItemChanged] = useState(false);

  useEffect(() => {
    if (state.currentItemId) {
      const newCurrentItem = state.currentItemIsNode
        ? state.data.nodes[state.currentItemId]
        : state.data.links[state.currentItemId];

      const newCurrentItemValues = {
        name: newCurrentItem.name,
        type: newCurrentItem.type,
        properties: newCurrentItem.properties,
      };

      setCurrentItem(newCurrentItem);
      setInitialValues(newCurrentItemValues);
      setValues(newCurrentItemValues);
    }
  }, [state.currentItemId, state.currentItemIsNode]);

  useEffect(() => {
    if (currentItem) {
      setPropertiesChanged(
        !_.isEqual(values.properties, currentItem?.properties)
      );
    }
  }, [values, currentItem]);

  useEffect(() => {
    if (currentItem) {
      setItemChanged(
        state.currentItemIsNode
          ? values.name !== currentItem?.name ||
              values.type !== currentItem?.type ||
              propertiesChanged
          : values.type !== currentItem?.type || propertiesChanged
      );
    }
  }, [values, currentItem, propertiesChanged]);

  const loaded = initialValues && currentItem;

  const handleInfoUpdate = async () => {
    await handleUpdate({ context: "information", payload: values });
  };

  const handleReset = () => {
    setValues(initialValues);
  };

  if (!loaded) {
    return <p>Loading...</p>;
  }

  return (
    <Box>
      <Stack direction="column" spacing={1}>
        {state.currentItemIsNode && (
          <TextField
            variant="outlined"
            value={values.name}
            onChange={(e) =>
              setValues((prevState) => ({
                ...prevState,
                name: e.target.value,
              }))
            }
            size="small"
            fullWidth
            margin="none"
            sx={{
              backgroundColor: "rgba(0, 0, 0, .03)",
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                "& fieldset": {
                  border: "1px solid rgba(0, 0, 0, .125)",
                },
              },
              mb: 2,
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Tooltip
                    title="This is the name/label of the node"
                    placement="left"
                  >
                    <TitleIcon />
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        )}
        <TextField
          variant="outlined"
          size="small"
          fullWidth
          margin="none"
          value={values.type}
          onChange={(e) =>
            setValues((prevState) => ({
              ...prevState,
              type: e.target.value,
            }))
          }
          sx={{
            backgroundColor: "rgba(0, 0, 0, .03)",
            "& .MuiOutlinedInput-root": {
              borderRadius: 1,
              "& fieldset": {
                border: "1px solid rgba(0, 0, 0, .125)",
              },
            },
            mb: 2,
          }}
          select
        >
          {state.ontology?.[state.currentItemIsNode ? "nodes" : "edges"]
            ?.sort((a, b) => a.name.localeCompare(b.name))
            .map((i) => (
              <MenuItem value={i._id} key={i._id}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  {state.currentItemIsNode ? (
                    <CircleIcon sx={{ fontSize: 12, color: i.color }} />
                  ) : (
                    <HorizontalRuleIcon sx={{ fontSize: 12, color: i.color }} />
                  )}
                  <Typography>{i.name}</Typography>
                </Stack>
              </MenuItem>
            ))}
        </TextField>
      </Stack>
      <Box mt={2}>
        <UpdateTray
          stateChanged={itemChanged}
          handleReset={handleReset}
          handleUpdate={handleInfoUpdate}
          loading={loading === "information"}
        />
      </Box>
    </Box>
  );
};

export default Details;
