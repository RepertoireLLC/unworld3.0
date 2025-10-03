import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';
import type { WifiNetwork } from '../types/network';

const DEFAULT_USERS: User[] = [
  {
    id: 'user_astra',
    name: 'Astra Nyx',
    color: '#8B5CF6',
    email: 'astra@sphere.io',
    password: 'nebula',
    bio: 'Navigator of the outer relays and curator of encrypted lore.',
    statusMessage: 'Mapping the aurora corridor.',
    availability: 'available',
    languages: ['en', 'es'],
    wifiNetworks: [
      { id: 'wifi_astra_core', ssid: 'Astra Halo Mesh', bandwidthMbps: 920, security: 'WPA3', shareable: true },
      { id: 'wifi_astra_field', ssid: 'Aurora Field Relay', bandwidthMbps: 450, security: 'WPA2', shareable: false },
    ],
  },
  {
    id: 'user_orion',
    name: 'Orion Vance',
    color: '#0EA5E9',
    email: 'orion@sphere.io',
    password: 'starlight',
    bio: 'Ops tactician keeping the strike grid synchronized.',
    statusMessage: 'Coordinating orbital briefings.',
    availability: 'focus',
    languages: ['en', 'fr'],
    wifiNetworks: [
      { id: 'wifi_orion_ops', ssid: 'Orion Ops Lattice', bandwidthMbps: 780, security: 'WPA3', shareable: true },
    ],
  },
  {
    id: 'user_lyra',
    name: 'Lyra Solace',
    color: '#22C55E',
    email: 'lyra@sphere.io',
    password: 'harmonics',
    bio: 'Diplomatic envoy bridging alliances across the sphere.',
    statusMessage: 'Routing peace accords.',
    availability: 'available',
    languages: ['en', 'de'],
    wifiNetworks: [
      { id: 'wifi_lyra_embassy', ssid: 'Lyra Embassy Net', bandwidthMbps: 640, security: 'WPA3', shareable: true },
      { id: 'wifi_lyra_secure', ssid: 'Solace Vault Link', bandwidthMbps: 520, security: 'WPA2', shareable: false },
    ],
  },
  {
    id: 'user_rhett',
    name: 'Rhett Calder',
    color: '#F97316',
    email: 'rhett@sphere.io',
    password: 'ember',
    bio: 'Engineering sentinel reinforcing containment shields.',
    statusMessage: 'Fortifying shield harmonics.',
    availability: 'away',
    languages: ['en', 'pt'],
    wifiNetworks: [
      { id: 'wifi_rhett_foundry', ssid: 'Rhett Foundry Grid', bandwidthMbps: 880, security: 'WPA3', shareable: true },
    ],
  },
  {
    id: 'user_vexa',
    name: 'Vexa Quill',
    color: '#EC4899',
    email: 'vexa@sphere.io',
    password: 'cipher',
    bio: 'Signal analyst mapping sentiment tides in real-time.',
    statusMessage: 'Listening for anomalies.',
    availability: 'focus',
    languages: ['en', 'ja'],
    wifiNetworks: [
      { id: 'wifi_vexa_listening', ssid: 'Vexa Listening Post', bandwidthMbps: 700, security: 'WPA3', shareable: true },
      { id: 'wifi_vexa_archive', ssid: 'Quill Archive Link', bandwidthMbps: 360, security: 'WPA2', shareable: false },
    ],
  },
];

interface User {
  id: string;
  name: string;
  color: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  statusMessage?: string;
  availability?: 'available' | 'focus' | 'away';
  languages?: string[];
  wifiNetworks?: WifiNetwork[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  registeredUsers: User[];
  login: (credentials: { email: string; password: string }) => boolean;
  register: (userData: { email: string; password: string; name: string; color: string }) => boolean;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      registeredUsers: DEFAULT_USERS,

      register: (userData) => {
        const { registeredUsers } = get();
        const existingUser = registeredUsers.find(u => u.email === userData.email);
        
        if (existingUser) {
          return false;
        }

        const nameSeed = userData.name || userData.email.split('@')[0];
        const primaryNetwork: WifiNetwork = {
          id: `wifi_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 6)}`,
          ssid: `${nameSeed?.split(' ')[0] ?? 'Enclypse'} Relay`,
          bandwidthMbps: 600 + Math.floor(Math.random() * 240),
          security: 'WPA3',
          shareable: true,
        };

        const newUser = {
          id: `user_${Date.now()}`,
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          color: userData.color || '#' + Math.floor(Math.random()*16777215).toString(16),
          statusMessage: 'Ready to collaborate.',
          availability: 'available',
          languages: ['en'],
          wifiNetworks: [primaryNetwork],
        };

        set(state => ({
          registeredUsers: [...state.registeredUsers, newUser],
          user: newUser,
          isAuthenticated: true
        }));

        // Add user to the online users
        const { addUser, setOnlineStatus } = useUserStore.getState();
        addUser({
          id: newUser.id,
          name: newUser.name,
          color: newUser.color,
          online: true,
          statusMessage: newUser.statusMessage,
          availability: newUser.availability,
          languages: newUser.languages,
          wifiNetworks: newUser.wifiNetworks,
        });
        setOnlineStatus(newUser.id, true);

        return true;
      },

      login: (credentials) => {
        const { registeredUsers } = get();
        const user = registeredUsers.find(
          u => u.email === credentials.email && u.password === credentials.password
        );

        if (user) {
          set({ user, isAuthenticated: true });
          
          // Set user as online
          const { addUser, setOnlineStatus } = useUserStore.getState();
        addUser({
          id: user.id,
          name: user.name,
          color: user.color,
          online: true,
          statusMessage: user.statusMessage,
          availability: user.availability,
          languages: user.languages,
          wifiNetworks: user.wifiNetworks,
        });
          setOnlineStatus(user.id, true);

          return true;
        }

        return false;
      },

      logout: () => {
        const { user } = get();
        if (user) {
          // Set user as offline before logging out
          const { setOnlineStatus } = useUserStore.getState();
          setOnlineStatus(user.id, false);
        }
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (updates) =>
        set((state) => {
          if (!state.user) return state;

          const updatedUser = { ...state.user, ...updates };

          // Update in registered users list
          const updatedRegisteredUsers = state.registeredUsers.map(u =>
            u.id === updatedUser.id ? updatedUser : u
          );

          // Update in user store
          const { updateUserColor, updateUserPresence } = useUserStore.getState();
          if (updates.color) {
            updateUserColor(updatedUser.id, updates.color);
          }

          if (updates.statusMessage || updates.availability) {
            updateUserPresence(updatedUser.id, {
              statusMessage: updates.statusMessage,
              availability: updates.availability,
            });
          }

          return {
            user: updatedUser,
            registeredUsers: updatedRegisteredUsers
          };
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        registeredUsers: state.registeredUsers,
      }),
    }
  )
);