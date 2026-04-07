import postgres from "postgres";

// Prevent multiple connection pools during Next.js development hot-module-reload.
// In production there is only one module instance, so the global guard is a no-op.
declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set.\n" +
        "Add DATABASE_URL=postgres://... to your .env.local file."
    );
  }

  return postgres(connectionString, {
    max: 10,           // Maximum connections in the pool
    idle_timeout: 30,  // Close idle connections after 30 seconds
    connect_timeout: 10,
  });
}

const sql =
  process.env.NODE_ENV === "development"
    ? (global.__db ?? (global.__db = createClient()))
    : createClient();

export default sql;
