import "../PrimarySidebar/scrollbar.css";
import React, { useContext, useState } from "react";
import { GraphContext } from "../../shared/context";
import { SnackbarContext } from "../../shared/snackbarContext";
import { acknowledge } from "../../shared/api";
import { Box, Stack } from "@mui/system";
import { Chip, CircularProgress, Tooltip, Typography } from "@mui/material";
import moment from "moment";
import CircleIcon from "@mui/icons-material/Circle";

moment.updateLocale("en", {
  relativeTime: {
    future: "in %s",
    past: "%s",
    s: "1s",
    ss: "%ss",
    m: "m",
    mm: "%dm",
    h: "1h",
    hh: "%dh",
    d: "d",
    dd: "%dd",
    w: "w",
    ww: "%dw",
    M: "M",
    MM: "%dM",
    y: "y",
    yy: "%dy",
  },
});

const ErrorsAndSuggestions = ({
  isErrors,
  currentItemId,
  currentItemIsNode,
  handleUpdate,
}) => {
  const context = isErrors ? "errors" : "suggestions";
  const [state, dispatch] = useContext(GraphContext);
  const data =
    state.data[currentItemIsNode ? "nodes" : "links"][currentItemId][context];
  const { openSnackbar } = useContext(SnackbarContext);
  const [submitting, setSubmitting] = useState({ id: null, action: null });

  const handleActions = async (errorOrSuggestionItemId, type, payload = {}) => {
    try {
      // setAcknowledgingId(errorOrSuggestionItemId);
      setSubmitting({ id: errorOrSuggestionItemId, action: type });
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
      // setAcknowledgingId(null);
      setSubmitting({ id: null, action: null });
    }
  };

  const handleAcknowledge = async (errorOrSuggestionItemId) => {
    await handleActions(errorOrSuggestionItemId, "acknowledge");
  };

  const handleReject = async (errorOrSuggestionItemId) => {
    await handleActions(errorOrSuggestionItemId, "reject");
  };

  const handleAction = async (
    errorOrSuggestionItemId,
    actionType,
    actionPayload
  ) => {
    try {
      // errorOrSuggestionItemId - used to acknowledge the error or suggestion after performing the action.

      // let response;
      switch (actionType) {
        case "update":
          await handleUpdate({ payload: actionPayload });
          break;
        case "delete":
          throw new Error("Action not implemented.");
        case "create":
          throw new Error("Action not implemented.");
        default:
          throw new Error("Action not recognised.");
      }
    } catch (error) {
      openSnackbar("error", "Error", error.message);
    } finally {
    }
  };

  return (
    <>
      <Box
        sx={{ maxHeight: "calc(100vh - 350px)", overflowY: "auto" }}
        className="customScrollBar"
      >
        {data
          .sort((a, b) => a.acknowledged - b.acknowledged)
          .map((i) => {
            const lastUpdated = moment.utc(i.updated_at).fromNow();
            const isAcknowledged = i.acknowledged;
            const value = i[isErrors ? "error_value" : "suggestion_value"];
            const type = i[isErrors ? "error_type" : "suggestion_type"];
            const hasAction = i.action;

            return (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="flex-start"
                justifyContent="flex-start"
                pb={1}
                sx={{
                  borderBottom: "1px solid rgba(0,0,0,0.1)",
                  "&(:last-child)": {
                    borderBottom: 0,
                  },
                }}
              >
                <Box
                  p={1}
                  key={`error-${i.id}`}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Box
                    sx={{
                      wordBreak: "break-word",
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography
                        fontSize={14}
                        fontWeight={600}
                        color="rgba(0,0,0,0.8)"
                      >
                        {type}
                      </Typography>
                      {!isAcknowledged && (
                        <CircleIcon
                          sx={{
                            fontSize: 10,
                            color:
                              state.settings.colors[
                                isErrors ? "error" : "suggestion"
                              ],
                          }}
                        />
                      )}
                    </Stack>
                    <Typography fontSize={12} color="rgba(0,0,0,0.5)">
                      {value}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  pl={1}
                  pr={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  width="100%"
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="flex-start"
                    spacing={1}
                  >
                    {hasAction ? (
                      <ActionChips
                        item={i}
                        submitting={submitting}
                        handleReject={handleReject}
                        handleAction={handleAction}
                      />
                    ) : (
                      <ActionableChip
                        isLoading={submitting.id === i.id}
                        tooltipTitle={
                          isAcknowledged
                            ? "This has been acknowledged"
                            : "Click to acknowledge this action"
                        }
                        label={isAcknowledged ? "Acknowledged" : "Acknowledge"}
                        onClick={() => handleAcknowledge(i.id)}
                        disabled={isAcknowledged}
                      />
                    )}
                  </Stack>
                  <Typography fontSize={10} color="rgba(0,0,0,0.5)">
                    {lastUpdated}
                  </Typography>
                </Box>
              </Box>
            );
          })}
      </Box>
    </>
  );
};

const ActionableChip = ({
  isLoading,
  tooltipTitle,
  label,
  onClick,
  disabled = false,
}) => {
  return isLoading ? (
    <SmallSubmittingProcess />
  ) : (
    <Tooltip title={tooltipTitle}>
      <Chip
        size="small"
        label={label}
        clickable={!disabled}
        variant="outlined"
        onClick={onClick}
        disabled={disabled}
        sx={{ textTransform: "capitalize", fontSize: 10 }}
      />
    </Tooltip>
  );
};

const ActionChips = ({ item, submitting, handleReject, handleAction }) => {
  const isLoading = submitting.id === item.id;

  return (
    <>
      <ActionableChip
        isLoading={isLoading && submitting.action === "reject"}
        tooltipTitle={
          item.acknowledged ? "This has been acknowledged" : "Click to reject"
        }
        label={item.acknowledged ? "Acknowledged" : "Reject"}
        onClick={() => handleReject(item.id)}
        disabled={item.acknowledged}
      />

      <ActionableChip
        isLoading={isLoading && submitting.action === "action"}
        tooltipTitle={`Click to perform ${item.action.name} operation`}
        label={`Action: ${item.action.name}`}
        onClick={() =>
          handleAction(item.id, item.action.name, {
            name: item.action.data.item_name,
            type: item.action.data.item_type,
          })
        }
      />
    </>
  );
};

const SmallSubmittingProcess = () => {
  return (
    <Box p="4px" display="flex" alignItems="center" justifyContent="center">
      <CircularProgress size="1rem" />
    </Box>
  );
};

export default ErrorsAndSuggestions;
