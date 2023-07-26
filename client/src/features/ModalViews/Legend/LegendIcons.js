import { grey } from "@mui/material/colors";

const color = grey[700];
const strokeWidth = 2; //px

const EdgeReviewed = () => (
  <div
    style={{
      width: 50,
      height: 1,
      borderBottom: `${strokeWidth}px solid ${color}`,
    }}
  />
);

const EdgeUnreviewed = () => (
  <div
    style={{
      width: 50,
      height: 1,
      borderBottom: `${strokeWidth}px dashed ${color}`,
    }}
  />
);

const EdgeFocused = () => (
  <div style={{ position: "relative", height: "20px", width: "50px" }}>
    <div
      style={{
        width: "100%",
        height: 1,
        borderBottom: `1px solid ${color}`,
        position: "absolute",
      }}
    />
    <div
      style={{
        width: "100%",
        height: 1,
        borderBottom: `4px dotted ${color}`,
        position: "absolute",
      }}
    />
  </div>
);

const NodeReviewed = () => (
  <div
    style={{
      width: 25,
      height: 25,
      borderRadius: "50%",
      border: `${strokeWidth}px solid ${color}`,
    }}
  />
);

const NodeUnreviewed = () => (
  <div
    style={{
      width: 25,
      height: 25,
      borderRadius: "50%",
      border: `${strokeWidth}px dashed ${color}`,
    }}
  />
);

const NodeFocused = () => (
  <div
    style={{
      width: "30px",
      height: "30px",
      borderRadius: "50%",
      border: `${strokeWidth}px solid ${color}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        backgroundColor: color,
      }}
    />
  </div>
);

export const LegendIcons = {
  Edge: {
    Reviewed: EdgeReviewed,
    Unreviewed: EdgeUnreviewed,
    Focused: EdgeFocused,
  },
  Node: {
    Reviewed: NodeReviewed,
    Unreviewed: NodeUnreviewed,
    Focused: NodeFocused,
  },
};
