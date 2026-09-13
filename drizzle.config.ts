const connectionString = process.env.DATABASE_URL ?? "mysql://user:pass@localhost:3306/hostinger_local";

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
};
