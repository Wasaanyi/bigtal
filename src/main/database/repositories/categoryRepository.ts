import { getDatabase } from '../connection';
import type { ProductCategory, CreateCategoryDTO } from '../../../shared/types';

export const categoryRepository = {
  async findAll(): Promise<ProductCategory[]> {
    const db = getDatabase();
    return await db.prepare('SELECT * FROM product_categories ORDER BY name').all() as unknown as ProductCategory[];
  },

  async findById(id: number): Promise<ProductCategory | null> {
    const db = getDatabase();
    const row = await db
      .prepare('SELECT * FROM product_categories WHERE id = ?')
      .get(id) as ProductCategory | undefined;
    return row || null;
  },

  async findByName(name: string): Promise<ProductCategory | null> {
    const db = getDatabase();
    const row = await db
      .prepare('SELECT * FROM product_categories WHERE name = ?')
      .get(name) as ProductCategory | undefined;
    return row || null;
  },

  async create(data: CreateCategoryDTO): Promise<ProductCategory> {
    const db = getDatabase();
    const result = await db
      .prepare('INSERT INTO product_categories (name, description) VALUES (?, ?) RETURNING id')
      .run(data.name, data.description || null);

    return (await this.findById(result.lastInsertRowid))!;
  },

  async update(id: number, data: Partial<CreateCategoryDTO>): Promise<ProductCategory | null> {
    const db = getDatabase();
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
    };

    await db.prepare('UPDATE product_categories SET name = ?, description = ? WHERE id = ?').run(
      updated.name,
      updated.description,
      id
    );

    return await this.findById(id);
  },

  async delete(id: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db.prepare('DELETE FROM product_categories WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
