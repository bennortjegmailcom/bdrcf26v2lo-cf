import { User } from '../../domain/types';

export interface IUsersRepository {
  getUserByUid(uid: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  listUsers(): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  deleteUser(id: string): Promise<void>;
}

