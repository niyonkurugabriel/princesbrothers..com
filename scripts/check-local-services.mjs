import net from "node:net";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !databaseUrl.startsWith("mysql://")) {
  console.error("Local setup required: set DATABASE_URL to a MySQL connection string.");
  process.exit(1);
}

const database = new URL(databaseUrl);
const services = [{ name: "MySQL", host: database.hostname, port: Number(database.port || 3306) }];

function checkService(service) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: service.host, port: service.port });
    let response = "";

    const fail = () => {
      socket.destroy();
      resolve(false);
    };

    socket.setTimeout(2000, fail);
    socket.once("error", fail);
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
  });
}

const results = await Promise.all(
  services.map(async (service) => ({
    ...service,
    available: await checkService(service),
  })),
);

const unavailable = results.filter((service) => !service.available);
if (unavailable.length > 0) {
  console.error(
    `Local setup required: ${unavailable.map((service) => `${service.name} on ${service.host}:${service.port}`).join(" and ")} ${unavailable.length === 1 ? "is" : "are"} unavailable. Start MySQL and check DATABASE_URL.`,
  );
  process.exit(1);
}

console.log(`MySQL is available on ${database.hostname}:${database.port || 3306}.`);