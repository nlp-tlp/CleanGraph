import {
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect } from "react";
import {
  FileUpload as FileUploadIcon,
  Delete as DeleteIcon,
  DataObject as DataObjectIcon,
} from "@mui/icons-material";
import { prettifyJson, printErrorLine, validateData } from "./validation";

const Editor = ({
  values,
  setValues,
  errors,
  setErrors,
  setMetrics,
  initialMetricState,
}) => {
  const handleReset = () => {
    setValues((prevState) => ({
      ...prevState,
      data: "",
      filename: null,
      nodeClasses: [],
      edgeClasses: [],
    }));
    setErrors([]);
    setMetrics({ ...initialMetricState });
  };

  const handleDataChange = (e) => {
    if (!previewOnly) {
      setValues((prevState) => ({ ...prevState, data: e.target.value ?? "" }));
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.stringify(JSON.parse(e.target.result));
          setValues((prevState) => ({
            ...prevState,
            filename: file.name,
            data: json,
          }));
        } catch (error) {
          console.error("Error in parsing JSON", error);
          // reset file upload
          setValues({ filename: null, data: "" });
          event.target.value = null;
        }
      };
      reader.readAsText(file);
    }
  };
  const onUpload = (e) => {
    handleFileUpload(e);
  };

  useEffect(() => {
    setErrors(validateData({ data: values.data }));
  }, [values.data]);

  useEffect(() => {
    if (errors.length === 0 && values.data !== "") {
      try {
        const data = JSON.parse(values.data);
        setMetrics({ items: data.length });
      } catch (error) {
        // Failed to parse JSON for whatever reason. TODO: review how to handle this more elegantly across the editor.
      }
    }
  }, [values.data, errors]);

  const previewOnly = values.data.length > 5000;

  let previewSample;
  try {
    const parsedData = JSON.parse(values.data);
    if (Array.isArray(parsedData)) {
      previewSample = JSON.stringify(parsedData.slice(0, 10));
    } else {
      previewSample = "Data is not an array"; // Handle non-array data as needed
    }
  } catch (error) {
    previewSample = "Data is not JSON parsable"; // Handle the error as needed
  }
  return (
    <Box display="flex" flexDirection="column">
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent={"space-between"}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Tooltip title="Click to upload a dataset from file" placement="top">
            <Button
              component="label"
              startIcon={<FileUploadIcon />}
              variant="outlined"
              size="small"
            >
              <input
                key="json-upload-input"
                hidden
                type="file"
                accept=".json"
                onChange={onUpload}
              />
              Upload
            </Button>
          </Tooltip>
          <Tooltip title="Click to reset the editor" placement="top">
            <Button
              startIcon={<DeleteIcon />}
              onClick={handleReset}
              variant="outlined"
              size="small"
            >
              Clear
            </Button>
          </Tooltip>
          <Tooltip title="Click to prettify JSON data" placement="top">
            <Button
              variant="outlined"
              size="small"
              startIcon={<DataObjectIcon />}
              disabled={values.data === "" || errors.length > 0}
              onClick={() =>
                setValues((prevState) => ({
                  ...prevState,
                  data: prettifyJson(prevState.data),
                }))
              }
            >
              Prettify
            </Button>
          </Tooltip>
        </Stack>

        <Tooltip title="This is the filename you uploaded" placement="top">
          <Chip
            variant="outlined"
            label={values?.filename || "No file uploaded"}
            color="primary"
            sx={{ cursor: "help" }}
          />
        </Tooltip>
      </Stack>
      <Box>
        <TextField
          sx={{ width: "100%" }}
          required
          id="outlined-multiline-flexible"
          placeholder={
            previewOnly
              ? "Too much data to display"
              : "Manually enter JSON data or upload file"
          }
          multiline
          rows={16}
          onChange={handleDataChange}
          value={previewOnly ? previewSample : values.data}
          fullWidth
          margin="normal"
          autoComplete="false"
          error={errors?.length > 0}
          readOnly={previewOnly}
          disabled={previewOnly}
        />
      </Box>
      <Box>
        <Typography variant="button" color={errors?.length > 0 && "error"}>
          Problems ({errors?.length})
        </Typography>
        <TextField
          sx={{ width: "100%" }}
          required
          id="outlined-multiline-flexible"
          placeholder="No problems detected"
          multiline
          rows={2}
          value={errors
            .map(
              (e) =>
                e.message +
                (e.hasOwnProperty("instancePath")
                  ? ` (loc: ${e.instancePath})`
                  : "") +
                printErrorLine(e, values.data)
            )
            .join(", ")}
          fullWidth
          margin="normal"
          autoComplete="false"
          InputProps={{ readOnly: true }}
          error={errors?.length > 0}
        />
      </Box>
    </Box>
  );
};

const FileUploadButton = ({ handleFileUpload }) => {
  return (
    <Button component="label" startIcon={<FileUploadIcon />}>
      <input
        key="json-upload-input"
        hidden
        type="file"
        accept=".json"
        onChange={handleFileUpload}
      />
      Upload
    </Button>
  );
};

export default Editor;
