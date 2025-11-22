const dotenv = require('dotenv');

if(process.env.NODE_ENV === 'development') {
  dotenv.config({ path: `.env.${process.env.NODE_ENV}`, debug: true });
}

const server = "eksamen2025serveren.database.windows.net";
const database = "Eksamen2025database";
const port = 1433;
const user = "eksamen25";
const password = "Kode2025";

const passwordConfig = {
  server,
  port,
  database,
  user,
  password,
  options: {
    encrypt: true
  }
};

module.exports = passwordConfig