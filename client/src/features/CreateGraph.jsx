import "../App.css";
import { useState, useContext } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import { GraphContext } from "../shared/context";
import { Link } from "react-router-dom";
import axios from "axios";

import { TEST_DATA } from "../shared/data";
import { useNavigate } from "react-router-dom";

const CreateGraph = () => {
  const [state, dispatch] = useContext(GraphContext);

  let navigate = useNavigate();
  const TEST_DEFAULT_TRIPLES = TEST_DATA.join("\n");

  const TEST_ENTITY_ONTOLOGY = [
    "Activity",
    "Activity/MaintenanceActivity",
    "PhysicalObject",
  ].join("\n");
  const TEST_RELATION_ONTOLOGY = ["hasPart", "hasPatient"].join("\n");

  const [name, setName] = useState(
    (Math.random() + 1).toString(36).substring(7)
  );
  const [triples, setTriples] = useState(TEST_DEFAULT_TRIPLES);
  const [entityOntology, setEntityOntology] = useState(TEST_ENTITY_ONTOLOGY);
  const [relationOntology, setRelationOntology] = useState(
    TEST_RELATION_ONTOLOGY
  );

  const handleCreate = async () => {
    console.log("create payload", triples, entityOntology, relationOntology);

    const payloadTriples = triples
      .split("\n")
      .map((t) => t.split(","))
      .filter((t) => t.length === 5)
      .map((t) => ({
        subj: t[0],
        subj_type: t[1],
        rel: t[2],
        obj: t[3],
        obj_type: t[4],
      }));

    console.log("payloadTriples", payloadTriples);

    const payloadOntology = [
      ...entityOntology.split("\n").map((e) => ({ name: e, is_entity: true })),
      ...relationOntology
        .split("\n")
        .map((r) => ({ name: r, is_entity: false })),
    ];

    console.log("payloadOntology", payloadOntology);

    await axios
      .post("/graph/", {
        graph: { name: name },
        ontology: payloadOntology,
        triples: payloadTriples,
      })
      .then((res) => {
        dispatch({
          type: "SET_VALUE",
          payload: { key: "graphsLoaded", value: false },
        });
        navigate("/");
      });
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        as={Paper}
        elevation={2}
        sx={{
          width: 600,
          display: "flex",
          flexDirection: "column",
        }}
        p={2}
      >
        <Typography variant="h5" gutterBottom p={2}>
          Graph Creation
        </Typography>
        <Stack direction="column" spacing={2}>
          <TextField
            label="Name"
            value={name}
            helperText="Enter a distinct name for your graph."
          />
          <TextField
            label="Triples"
            multiline
            maxRows={10}
            value={triples}
            onChange={(e) => setTriples(e.target.value)}
            helperText="Triples must be newline separated and in CSV format with the structure of subj,subj_type,rel,obj,obj_type. Any malformed triples will be ignored!"
          />
          <TextField
            label="Entity Ontology"
            multiline
            maxRows={4}
            value={entityOntology}
            onChange={(e) => setEntityOntology(e.target.value)}
            helperText="Entity class names must be newline separated. The tool will also automatically extact entity classes from uploaded triples."
          />
          <TextField
            label="Relation Ontology"
            multiline
            maxRows={4}
            value={relationOntology}
            onChange={(e) => setRelationOntology(e.target.value)}
            helperText="Relation class names must be newline separated. The tool will also automatically extact relation classes from uploaded triples."
          />

          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
          <Button component={Link} to="/" variant="outlined">
            Return
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default CreateGraph;
