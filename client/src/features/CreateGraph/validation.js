// JSON editor validation using ajv
const Ajv = require("ajv");
const ajvErrors = require("ajv-errors");

const schema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      head: { type: "string", minLength: 1 },
      head_type: { type: "string", minLength: 1 },
      head_properties: { type: "object" },
      relation: { type: "string", minLength: 1 },
      relation_properties: { type: "object" },
      tail: { type: "string", minLength: 1 },
      tail_type: { type: "string", minLength: 1 },
      tail_properties: { type: "object" },
    },
    // required: ["head", "head_type", "relation", "tail", "tail_type"],
    required: ["head", "relation", "tail"],
    additionalProperties: true,
  },
};

function createValidator(schema) {
  const ajv = new Ajv({ allErrors: true });
  ajvErrors(ajv);
  return ajv.compile(schema);
}

export function validateData({ data }) {
  const validator = createValidator(schema);

  if (data === "") {
    return [];
  }

  try {
    // Check if the data is already a valid JSON object
    if (typeof data !== "object") {
      // Attempt to parse the data as JSON
      data = JSON.parse(data);
    }
  } catch (err) {
    return [{ message: "Invalid JSON format" }];
  }

  const valid = validator(data);

  if (!valid) {
    return validator.errors;
  }
  return [];
}

export function prettifyJson(input) {
  try {
    const parsedInput = JSON.parse(input);
    return JSON.stringify(parsedInput, null, 2);
  } catch (error) {
    return input;
  }
}

/**
 * Prints an error message, the data path of the error, and the line of data that caused the error.
 *
 * @param {string} dataType - The type of data being processed ("text" or "json").
 * @param {Object} error - The error object returned by AJV.
 * @param {Object} data - The data that was validated by AJV.
 */
export function printErrorLine(error, data) {
  if (error.instancePath) {
    console.log("error", error, "data", data);
    const index = parseInt(error.instancePath.split("/")[1]);
    return JSON.stringify(JSON.parse(data)[index]);
  }
}
