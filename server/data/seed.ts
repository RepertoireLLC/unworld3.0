import { v4 as uuid } from 'uuid';
import { hashIdentifier } from '../utils/hash';
import { LayerMetadata, UserProfile } from './types';

const colors = ['#38bdf8', '#f472b6', '#a855f7', '#facc15', '#34d399'];

const pickColor = (domain: string) => {
  const hash = Array.from(domain).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const seedLayers: LayerMetadata[] = [
  {
    id: uuid(),
    name: 'Web Development',
    color: pickColor('Web Development'),
    opacity: 0.35,
    visible: true,
    createdBy: 'system',
    userCount: 0,
    access: { public: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuid(),
    name: 'AI Research',
    color: pickColor('AI Research'),
    opacity: 0.4,
    visible: true,
    createdBy: 'system',
    userCount: 0,
    access: { public: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuid(),
    name: 'Digital Art',
    color: pickColor('Digital Art'),
    opacity: 0.35,
    visible: false,
    createdBy: 'system',
    userCount: 0,
    access: { public: false, restrictedRoles: ['admin', 'moderator', 'artist'] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuid(),
    name: 'Music Production',
    color: pickColor('Music Production'),
    opacity: 0.3,
    visible: true,
    createdBy: 'system',
    userCount: 0,
    access: { public: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const seedUsers: UserProfile[] = [
  {
    id: 'user_jamie',
    hashedId: hashIdentifier('user_jamie'),
    name: 'Jamie Rivera',
    roles: ['developer', 'user'],
    status: 'online',
    location: { lat: 40.7128, lon: -74.006 },
    domains: [
      {
        domain: 'Web Development',
        public: true,
        coordinates: [0.45, 0.12, -0.32],
        skills: ['React', 'Node.js', 'TypeScript'],
      },
      {
        domain: 'AI Research',
        public: false,
        coordinates: [0.52, 0.41, 0.11],
        skills: ['PyTorch', 'Transformers'],
      },
    ],
  },
  {
    id: 'user_ayan',
    hashedId: hashIdentifier('user_ayan'),
    name: 'Ayan Patel',
    roles: ['researcher', 'moderator'],
    status: 'online',
    location: { lat: 37.7749, lon: -122.4194 },
    domains: [
      {
        domain: 'AI Research',
        public: true,
        coordinates: [-0.25, 0.64, -0.12],
        skills: ['NLP', 'Graph Neural Networks'],
      },
    ],
  },
  {
    id: 'user_sky',
    hashedId: hashIdentifier('user_sky'),
    name: 'Skyler Chen',
    roles: ['artist', 'user'],
    status: 'offline',
    location: { lat: 51.5072, lon: -0.1276 },
    domains: [
      {
        domain: 'Digital Art',
        public: true,
        coordinates: [0.12, -0.42, 0.54],
        skills: ['Blender', 'Cinema4D', 'ZBrush'],
      },
    ],
  },
  {
    id: 'user_luna',
    hashedId: hashIdentifier('user_luna'),
    name: 'Luna García',
    roles: ['user', 'musician'],
    status: 'online',
    location: { lat: 34.0522, lon: -118.2437 },
    domains: [
      {
        domain: 'Music Production',
        public: true,
        coordinates: [-0.44, -0.1, 0.58],
        skills: ['Ableton Live', 'Sound Design'],
      },
      {
        domain: 'Web Development',
        public: true,
        coordinates: [0.23, -0.31, 0.65],
        skills: ['Next.js', 'Tailwind CSS'],
      },
    ],
  },
];
