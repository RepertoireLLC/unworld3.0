import { useUserStore } from './userStore';
import { useAuthStore } from './authStore';
import { useBusinessStore } from './businessStore';
import { createDefaultUserProfile, EnclypseUser } from '../types/user';
import { UserNode } from './userStore';
import { CommerceStore } from '../types/business';

function getRandomSpherePosition(radius: number = 3): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  ];
}

const toUserNode = (user: EnclypseUser, overrides?: Partial<UserNode>): UserNode => ({
  id: user.id,
  name: user.name,
  color: user.color,
  email: user.email,
  profilePicture: user.profilePicture,
  bio: user.bio,
  industries: user.industries,
  interests: user.interests,
  skills: user.skills,
  location: user.location,
  visibilityLayers: user.visibilityLayers,
  visibilityPreferences: user.visibilityPreferences,
  online: false,
  ...overrides,
});

const mockOperators = [
  createDefaultUserProfile({
    id: 'operator_alpha',
    name: 'Ari Navigation',
    email: 'ari@enclypse.ai',
    industries: ['Space Systems', 'Defense'],
    interests: ['Orbital Design', 'Quantum Networks'],
    skills: ['Systems Engineering', 'Holography'],
    visibilityLayers: {
      private: true,
      friends: true,
      industry: true,
      public: true,
    },
    visibilityPreferences: {
      presence: 'public',
      profile: 'industry',
      commerce: 'public',
      registryOptIn: true,
    },
  }),
  createDefaultUserProfile({
    id: 'operator_beta',
    name: 'Mina Flux',
    email: 'mina@enclypse.ai',
    industries: ['Creative Tech'],
    interests: ['Immersive Media', 'Experience Design'],
    skills: ['3D Design', 'Story Systems'],
    visibilityLayers: {
      private: true,
      friends: true,
      industry: true,
      public: true,
    },
    visibilityPreferences: {
      presence: 'industry',
      profile: 'public',
      commerce: 'public',
      registryOptIn: true,
    },
  }),
  createDefaultUserProfile({
    id: 'operator_gamma',
    name: 'Sera Bloom',
    email: 'sera@enclypse.ai',
    industries: ['Biotech'],
    interests: ['Biofabrication', 'AI Research'],
    skills: ['Data Science', 'Bioinformatics'],
    visibilityLayers: {
      private: true,
      friends: true,
      industry: true,
      public: false,
    },
    visibilityPreferences: {
      presence: 'industry',
      profile: 'friends',
      commerce: 'industry',
      registryOptIn: false,
    },
  }),
];

const mockStores: CommerceStore[] = [
  {
    id: 'store_operator_alpha',
    ownerId: 'operator_alpha',
    name: 'Orbital Systems Lab',
    description: 'Deploying off-world sensor arrays and navigation modules.',
    industry: 'Space Systems',
    visibility: 'public',
    products: [
      {
        id: 'product_alpha_1',
        name: 'Lunar Navigation Stack',
        description: 'End-to-end navigation OS for lunar rovers.',
        price: 120000,
        currency: 'USD',
        paymentLink: 'https://stripe.com/pay/alpha',
        processor: 'stripe',
      },
    ],
    paymentProviders: {
      stripe: 'https://stripe.com/pay/alpha',
    },
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    registrySummary: 'Quantum-grade orbital navigation for aerospace teams.',
  },
  {
    id: 'store_operator_beta',
    ownerId: 'operator_beta',
    name: 'Flux Experience Studio',
    description: 'Immersive media capsules and experience design toolkits.',
    industry: 'Creative Tech',
    visibility: 'public',
    products: [
      {
        id: 'product_beta_1',
        name: 'Holographic Narrative Suite',
        description: 'Story-driven holographic templates for live events.',
        price: 3200,
        currency: 'USD',
        paymentLink: 'https://paypal.me/fluxstudio',
        processor: 'paypal',
      },
    ],
    paymentProviders: {
      paypal: 'https://paypal.me/fluxstudio',
    },
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    registrySummary: 'Immersive storytelling and holographic activation kits.',
  },
];

export function initializeMockData() {
  const addUser = useUserStore.getState().addUser;
  const setOnlineStatus = useUserStore.getState().setOnlineStatus;
  const updateUserPosition = useUserStore.getState().updateUserPosition;
  const upsertStore = useBusinessStore.getState().upsertStore;
  const { users } = useUserStore.getState();
  const currentUser = useAuthStore.getState().user;
  const registeredUsers = useAuthStore.getState().registeredUsers;

  if (currentUser) {
    addUser(
      toUserNode(currentUser, {
        online: true,
        position: getRandomSpherePosition(),
      })
    );
    setOnlineStatus(currentUser.id, true);
    updateUserPosition(currentUser.id, getRandomSpherePosition());
  }

  registeredUsers
    .filter((user) => user.id !== currentUser?.id)
    .forEach((user) => {
      addUser(
        toUserNode(user, {
          online: false,
          position: getRandomSpherePosition(),
        })
      );
      updateUserPosition(user.id, getRandomSpherePosition());
    });

  if (users.length <= 1) {
    mockOperators.forEach((operator, index) => {
      addUser(
        toUserNode(operator, {
          online: index !== mockOperators.length - 1,
          position: getRandomSpherePosition(),
        })
      );
    });

    mockStores.forEach((store) => {
      upsertStore(store);
    });
  }
}
