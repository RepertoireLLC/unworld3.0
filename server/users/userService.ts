import { seedUsers } from '../data/seed';
import { UserProfile } from '../data/types';

export class UserService {
  private users = new Map<string, UserProfile>();

  constructor(initialUsers: UserProfile[] = []) {
    initialUsers.forEach((user) => {
      this.users.set(user.id, user);
    });
  }

  list() {
    return Array.from(this.users.values());
  }

  listPublicByDomain(domain: string) {
    return this.list()
      .map((user) => ({
        ...user,
        domains: user.domains.filter((d) => d.domain.toLowerCase() === domain.toLowerCase() && d.public),
      }))
      .filter((user) => user.domains.length > 0)
      .map((user) => ({
        id: user.hashedId,
        name: user.name,
        roles: user.roles,
        domains: user.domains,
        location: user.location,
        status: user.status,
      }));
  }

  togglePresence(id: string, status: 'online' | 'offline') {
    const user = this.users.get(id);
    if (!user) return null;
    const updated: UserProfile = { ...user, status };
    this.users.set(id, updated);
    return updated;
  }
}

export const userService = new UserService(seedUsers);
