import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import { debounce } from "lodash";
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const SubgraphTextSearch = ({ data, setResults }) => {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const performSearch = debounce(() => {
    if (inputValue !== "") {
      const filteredData = data.filter((item) =>
        item.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setResults(filteredData);
    } else {
      setResults(data); // Set results back to original data if inputValue is empty
    }
  }, 500);

  useEffect(() => {
    performSearch();
  }, [inputValue]); // Re-run the effect when inputValue changes

  return (
    <TextField
      placeholder="Search subgraphs"
      variant="outlined"
      value={inputValue}
      onChange={handleInputChange}
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
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
};

export default SubgraphTextSearch;
