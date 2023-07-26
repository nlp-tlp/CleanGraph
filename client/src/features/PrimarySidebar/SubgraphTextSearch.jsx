import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import { debounce } from "lodash";

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
      placeholder="Search"
      variant="outlined"
      value={inputValue}
      onChange={handleInputChange}
      size="small"
      fullWidth
      margin="none"
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: 0,
          "& fieldset": {
            border: "none",
          },
        },
      }}
    />
  );
};

export default SubgraphTextSearch;
