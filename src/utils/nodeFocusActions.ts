import { useSphereStore } from '../store/sphereStore';

/**
 * Triggers the focus flow for a given user node. The camera will animate and the
 * node highlight will pulse once the animation settles.
 */
export function focusOnNode(userId: string) {
  const { focusUser, setFocusError } = useSphereStore.getState();
  focusUser(userId);
  setFocusError(null);
}

/**
 * Clears the active node highlight and returns the camera to its resting state.
 */
export function clearHighlight() {
  const { focusUser, setFocusError } = useSphereStore.getState();
  focusUser(null);
  setFocusError(null);
}
