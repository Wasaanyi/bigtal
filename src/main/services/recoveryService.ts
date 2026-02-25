import { getDatabase } from '../database/connection';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../database/repositories';

export const recoveryService = {
  /**
   * Generates a new recovery key and stores its hash in app_settings
   * Should only be called once during first-run setup
   */
  async generateRecoveryKey(): Promise<string> {
    const db = getDatabase();

    // Generate a random 24-character recovery key
    const recoveryKey = uuidv4().replace(/-/g, '').substring(0, 24).toUpperCase();

    // Hash the recovery key for storage
    const recoveryKeyHash = bcrypt.hashSync(recoveryKey, 10);

    // Store the hashed recovery key
    await db.prepare(`
      INSERT INTO app_settings (key, value) VALUES ('recovery_key_hash', ?)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `).run(recoveryKeyHash);

    return recoveryKey;
  },

  /**
   * Checks if a recovery key has been set up
   */
  async recoveryKeyExists(): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .prepare("SELECT value FROM app_settings WHERE key = 'recovery_key_hash'")
      .get() as { value: string } | undefined;

    return !!result;
  },

  /**
   * Validates a recovery key against the stored hash
   */
  async validateRecoveryKey(recoveryKey: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .prepare("SELECT value FROM app_settings WHERE key = 'recovery_key_hash'")
      .get() as { value: string } | undefined;

    if (!result) {
      return false;
    }

    return bcrypt.compareSync(recoveryKey.toUpperCase(), result.value);
  },

  /**
   * Resets the admin password using a valid recovery key
   */
  async resetAdminPassword(recoveryKey: string, newPassword: string): Promise<boolean> {
    // First validate the recovery key
    const isValid = await this.validateRecoveryKey(recoveryKey);
    if (!isValid) {
      return false;
    }

    const db = getDatabase();

    // Find the admin user
    const admin = await db
      .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1")
      .get() as { id: number } | undefined;

    if (!admin) {
      return false;
    }

    // Update the admin password
    return await userRepository.updatePassword(admin.id, newPassword);
  },

  /**
   * Gets the count of admin users
   */
  async getAdminCount(): Promise<number> {
    const db = getDatabase();
    const result = await db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
      .get() as { count: number };

    return result?.count || 0;
  },
};
