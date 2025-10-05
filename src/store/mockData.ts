import { useUserStore } from './userStore';
import { useAuthStore, DEFAULT_OPERATORS } from './authStore';
import { useChatStore } from './chatStore';

// Helper function to get random position on a sphere
function getRandomSpherePosition(radius: number = 3): [number, number, number] {
  const theta = Math.random() * Math.PI * 2; // Azimuthal angle
  const phi = Math.acos(2 * Math.random() - 1); // Polar angle
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  ];
}

export function initializeMockData() {
  const userStore = useUserStore.getState();
  const chatStore = useChatStore.getState();
  const addUser = userStore.addUser;
  const setOnlineStatus = userStore.setOnlineStatus;
  const updateUserPosition = userStore.updateUserPosition;
  const currentUser = useAuthStore.getState().user;
  const registeredUsers = useAuthStore.getState().registeredUsers;
  const knownUserIds = new Set(userStore.users.map((user) => user.id));

  const activeOperatorIds = new Set(['user_aurora', 'user_orion']);
  const welcomeOperatorId = 'user_aurora';
  const welcomeOperator =
    registeredUsers.find((user) => user.id === welcomeOperatorId) ??
    DEFAULT_OPERATORS.find((user) => user.id === welcomeOperatorId);

  // Add current user to the sphere
  if (currentUser) {
    if (!knownUserIds.has(currentUser.id)) {
      addUser({
        ...currentUser,
        position: getRandomSpherePosition(),
        online: true,
      });
      knownUserIds.add(currentUser.id);
    }
    setOnlineStatus(currentUser.id, true);
    updateUserPosition(currentUser.id, getRandomSpherePosition());
  }

  // Add all registered users except current user
  registeredUsers
    .filter(user => user.id !== currentUser?.id)
    .forEach((user) => {
      if (!knownUserIds.has(user.id)) {
        addUser({
          ...user,
          position: getRandomSpherePosition(),
          online: false,
        });
        knownUserIds.add(user.id);
      }

      updateUserPosition(user.id, getRandomSpherePosition());
      if (activeOperatorIds.has(user.id)) {
        setOnlineStatus(user.id, true);
      } else {
        setOnlineStatus(user.id, false);
      }
    });

  if (currentUser && welcomeOperator) {
    const hasWelcomeMessage = chatStore.messages.some(
      (message) =>
        message.fromUserId === welcomeOperatorId &&
        message.toUserId === currentUser.id
    );

    if (!hasWelcomeMessage) {
      chatStore.sendMessage(
        welcomeOperatorId,
        currentUser.id,
        'Welcome to Enclypse Command. I have you synced on the lattice—let me know when you are ready to go live.'
      );
    }
  }
}
