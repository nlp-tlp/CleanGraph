import { useState, useContext } from "react";
import { updateItem } from "../api";
import { SnackbarContext } from "../snackbarContext";
import { GraphContext } from "../context";

export const useDeleteItem = () => {
  const [loading, setLoading] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState({
    open: false,
    data: null,
  });
  const { openSnackbar } = useContext(SnackbarContext);
  const [state, dispatch] = useContext(GraphContext);

  const handleDelete = async ({ context = null, payload }) => {
    setLoading(context);

    try {
      setShowDeleteModal({
        open: true,
        data: {},
      });

      //   const response = await updateItem(
      //     state.currentItemId,
      //     state.currentItemIsNode ? "node" : "edge",
      //     payload
      //   );

      //   if (response.status === 200) {
      //     if (response.data.node_exists) {
      //       setShowDeleteModal({
      //         open: true,
      //         data: {
      //           ...response.data,
      //           name: payload.name,
      //           type: payload.type,
      //           itemId: state.currentItemId,
      //         },
      //       });
      //     } else if (response.data.item_modified) {
      //       dispatch({
      //         type: "UPDATE_ITEM",
      //         payload: {
      //           itemId: state.currentItemId,
      //           isNode: state.currentItemIsNode,
      //           ...payload,
      //         },
      //       });
      //       openSnackbar(
      //         "success",
      //         "Success",
      //         `${state.currentItemIsNode ? "node" : "edge"} ${
      //           context ?? ""
      //         } updated`
      //       );
      //     }
      //   } else {
      //     throw new Error("Unable to delete item");
      //   }
    } catch (error) {
      openSnackbar("error", "Error", "Unable to delete item");
    } finally {
      setLoading(null);
    }
  };

  return { loading, showDeleteModal, setShowDeleteModal, handleDelete };
};
