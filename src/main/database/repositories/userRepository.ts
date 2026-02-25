import { getDatabase } from '../connection';
import bcrypt from 'bcryptjs';
import type { User, UserRole } from '../../../shared/types';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  email?: string;
  created_at: string;
}

export const userRepository = {
  async findByUsername(username: string): Promise<User | null> {
    const db = getDatabase();
    const row = await db
      .prepare('SELECT id, username, role, email, created_at FROM users WHERE username = ?')
      .get(username) as Omit<UserRow, 'password_hash'> | undefined;

    return row || null;
  },

  async validatePassword(username: string, password: string): Promise<User | null> {
    const db = getDatabase();
    const row = await db
      .prepare('SELECT id, username, password_hash, role, email, created_at FROM users WHERE username = ?')
      .get(username) as UserRow | undefined;

    if (!row) {
      return null;
    }

    const isValid = bcrypt.compareSync(password, row.password_hash);
    if (!isValid) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      role: row.role,
      email: row.email,
      created_at: row.created_at,
    };
  },

  async findById(id: number): Promise<User | null> {
    const db = getDatabase();
    const row = await db
      .prepare('SELECT id, username, role, email, created_at FROM users WHERE id = ?')
      .get(id) as Omit<UserRow, 'password_hash'> | undefined;

    return row || null;
  },

  async findAll(): Promise<User[]> {
    const db = getDatabase();
    return await db
      .prepare('SELECT id, username, role, email, created_at FROM users ORDER BY created_at DESC')
      .all() as unknown as User[];
  },

  async create(username: string, password: string, role: UserRole, email?: string): Promise<User> {
    const db = getDatabase();
    const passwordHash = bcrypt.hashSync(password, 10);

    const result = await db
      .prepare('INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?) RETURNING id')
      .run(username, passwordHash, role, email || null);

    return (await this.findById(result.lastInsertRowid))!;
  },

  async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const db = getDatabase();
    const passwordHash = bcrypt.hashSync(newPassword, 10);

    const result = await db
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(passwordHash, id);

    return result.changes > 0;
  },

  async delete(id: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  },

  async updateEmail(id: number, email: string | null): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .prepare('UPDATE users SET email = ? WHERE id = ?')
      .run(email, id);
    return result.changes > 0;
  },

  async findAdminsWithEmail(): Promise<User[]> {
    const db = getDatabase();
    return await db
      .prepare("SELECT id, username, role, email, created_at FROM users WHERE role = 'admin' AND email IS NOT NULL AND email != ''")
      .all() as unknown as User[];
  },
};
