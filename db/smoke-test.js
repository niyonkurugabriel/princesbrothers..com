const { withTransaction } = require("./db");

async function main() {
  await withTransaction(async (connection) => {
    await connection.query("CREATE TEMPORARY TABLE pb_crud_smoke (id INT NOT NULL PRIMARY KEY, label VARCHAR(40) NOT NULL)");
    await connection.execute("INSERT INTO pb_crud_smoke (id, label) VALUES (?, ?)", [1, "created"]);
    const [created] = await connection.execute("SELECT label FROM pb_crud_smoke WHERE id = ?", [1]);
    if (created[0]?.label !== "created") throw new Error("CRUD smoke test failed at CREATE/READ.");

    await connection.execute("UPDATE pb_crud_smoke SET label = ? WHERE id = ?", ["updated", 1]);
    const [updated] = await connection.execute("SELECT label FROM pb_crud_smoke WHERE id = ?", [1]);
    if (updated[0]?.label !== "updated") throw new Error("CRUD smoke test failed at UPDATE.");

    await connection.execute("DELETE FROM pb_crud_smoke WHERE id = ?", [1]);
    const [deleted] = await connection.execute("SELECT id FROM pb_crud_smoke WHERE id = ?", [1]);
    if (deleted.length !== 0) throw new Error("CRUD smoke test failed at DELETE.");
  });

  console.log("MySQL CRUD smoke test passed (temporary table; no application data changed).");
}

main().catch((error) => {
  const code = error && error.code ? ` (${error.code})` : "";
  const hint = error?.code === "ER_ACCESS_DENIED_ERROR"
    ? " Check the username, password, and database grants in DATABASE_URL."
    : error?.code === "ECONNREFUSED"
      ? " Start MySQL and verify the host and port in DATABASE_URL."
      : "";
  console.error(`MySQL CRUD smoke test failed${code}: ${error.message}${hint}`);
  process.exitCode = 1;
});
