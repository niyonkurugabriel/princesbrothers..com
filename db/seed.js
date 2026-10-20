const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { getPool, withTransaction } = require("./db");

const categories = [
  { name: "Fruit" },
  { name: "Vegetables" },
  { name: "Roots & tubers" },
  { name: "Beans & peas" }
];

const products = [
  { name: "Garden tomatoes", description: "Ripe, sun-grown tomatoes from independent organic contributors.", price: 4500, image: "/products/inyanya.jpg", category: "Vegetables", stock: 40 },
  { name: "Creamy avocados", description: "Fresh avocados selected at the right stage for a creamy finish.", price: 6000, image: "/products/avoka.jpg", category: "Fruit", stock: 28 },
  { name: "Green garden peas", description: "Tender peas harvested from small-scale organic farms.", price: 3800, image: "/products/amashaza.jpg", category: "Beans & peas", stock: 32 },
  { name: "Harvest potatoes", description: "Earthy, versatile potatoes grown in healthy soil.", price: 2600, image: "/products/ibirayi.jpg", category: "Roots & tubers", stock: 55 },
  { name: "Sweet carrots", description: "Crunchy carrots from the season's local harvest.", price: 3400, image: "/products/karoti.jpg", category: "Roots & tubers", stock: 36 },
  { name: "Golden pineapples", description: "Fragrant, naturally sweet pineapples picked when ripe.", price: 5100, image: "/products/inanasi.jpg", category: "Fruit", stock: 24 }
];

async function main() {
  await withTransaction(async (connection) => {
    const categoryIds = new Map();
    for (const category of categories) {
      const now = new Date();
      const [existing] = await connection.execute("SELECT id FROM Category WHERE name = ? LIMIT 1", [category.name]);
      const id = existing[0]?.id ?? randomUUID();
      if (existing.length) await connection.execute("UPDATE Category SET name = ? WHERE id = ?", [category.name, id]);
      else await connection.execute("INSERT INTO Category (id, name, createdAt) VALUES (?, ?, ?)", [id, category.name, now]);
      categoryIds.set(category.name, id);
    }

    for (const item of products) {
      const now = new Date();
      const [existingProducts] = await connection.execute("SELECT id FROM Product WHERE name = ? LIMIT 1", [item.name]);
      const productId = existingProducts[0]?.id ?? randomUUID();
      if (existingProducts.length) {
        await connection.execute("UPDATE Product SET description = ?, imagePath = ?, retailPrice = ?, currency = 'RWF', isActive = 1, updatedAt = ? WHERE id = ?", [item.description, item.image, item.price, now, productId]);
      } else {
        await connection.execute("INSERT INTO Product (id, name, description, imagePath, retailPrice, currency, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'RWF', 1, ?, ?)", [productId, item.name, item.description, item.image, item.price, now, now]);
      }
      await connection.execute("DELETE FROM ProductCategory WHERE productId = ?", [productId]);
      await connection.execute("INSERT INTO ProductCategory (productId, categoryId) VALUES (?, ?)", [productId, categoryIds.get(item.category)]);

      const [inventoryRows] = await connection.execute("SELECT id FROM InventoryItem WHERE productId = ? AND source = 'INTERNAL' AND warehouseCode = 'MAIN' LIMIT 1", [productId]);
      if (inventoryRows[0]) {
        await connection.execute("UPDATE InventoryItem SET quantity = ?, updatedAt = ? WHERE id = ?", [item.stock, now, inventoryRows[0].id]);
      } else {
        await connection.execute("INSERT INTO InventoryItem (id, productId, source, quantity, warehouseCode, createdAt, updatedAt) VALUES (?, ?, 'INTERNAL', ?, 'MAIN', ?, ?)", [randomUUID(), productId, item.stock, now, now]);
      }
    }

    const adminUsername = process.env.ADMIN_USERNAME?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (Boolean(adminUsername) !== Boolean(adminPassword)) {
      throw new Error("Set both ADMIN_USERNAME and ADMIN_PASSWORD to bootstrap an admin account.");
    }
    if (adminUsername && adminPassword) {
      if (adminUsername.length < 3 || adminUsername.length > 100 || adminPassword.length < 12) {
        throw new Error("Admin bootstrap requires a username of 3-100 characters and a password of at least 12 characters.");
      }

      const [existingAdmins] = await connection.execute("SELECT id FROM AdminUser WHERE username = ? LIMIT 1", [adminUsername]);
      if (!existingAdmins.length) {
        const [roles] = await connection.execute("SELECT id FROM AdminRole WHERE name = 'Super admin' LIMIT 1");
        if (!roles[0]) throw new Error("Apply database migrations before bootstrapping the admin account.");
        const now = new Date();
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        await connection.execute(
          "INSERT INTO AdminUser (id, username, passwordHash, fullName, isSuperAdmin, isActive, roleId, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?)",
          [randomUUID(), adminUsername, passwordHash, "System Admin", roles[0].id, now, now]
        );
      }
    }
  });

  console.log(`Seeded ${products.length} products and ${categories.length} categories.`);
}

main()
  .catch((error) => {
    const code = error && error.code ? ` (${error.code})` : "";
    console.error(`MySQL seed failed${code}: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await getPool().end();
  });