const databaseName = process.env.MONGO_INITDB_DATABASE;
const username = process.env.MONGO_APP_USER;
const password = process.env.MONGO_APP_PASSWORD;

if (!databaseName || !username || !password) {
  throw new Error("MONGO_INITDB_DATABASE, MONGO_APP_USER and MONGO_APP_PASSWORD are required");
}

db.getSiblingDB(databaseName).createUser({
  user: username,
  pwd: password,
  roles: [{ role: "readWrite", db: databaseName }],
});
