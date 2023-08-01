import { useState, useContext } from "react";
import { updateItem } from "../api";
import { SnackbarContext } from "../snackbarContext";
import { GraphContext } from "../context";

export const useUpdateItem = () => {
  const [loading, setLoading] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState({
    open: false,
    data: null,
  });
  const { openSnackbar } = useContext(SnackbarContext); // Assuming that openSnackbar is provided in SnackbarContext
  const [state, dispatch] = useContext(GraphContext);

  const handleUpdate = async ({ context = null, payload }) => {
    setLoading(context);

    try {
      const response = await updateItem(
        state.currentItemId,
        state.currentItemIsNode ? "node" : "edge",
        payload
      );

      if (response.status === 200) {
        if (response.data.node_exists) {
          setShowMergeModal({
            open: true,
            data: {
              ...response.data,
              name: payload.name,
              type: payload.type,
              itemId: state.currentItemId,
            },
          });
        } else if (response.data.item_modified) {
          dispatch({
            type: "UPDATE_ITEM",
            payload: {
              itemId: state.currentItemId,
              isNode: state.currentItemIsNode,
              ...payload,
            },
          });
          openSnackbar(
            "success",
            "Success",
            `${state.currentItemIsNode ? "node" : "edge"} ${
              context ?? ""
            } updated`
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

  return { loading, showMergeModal, setShowMergeModal, handleUpdate };
};
