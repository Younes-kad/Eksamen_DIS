// Vi bruger npm pakken mssql, som kan oprette forbindelse til vores Azure SQL database
const sql = require("mssql");

// Opretter en enkelt database klasse, hvor alle metoder vil ligge i. 
module.exports = class Db {
    config = {};
    poolconnection = null;
    connected = false;

    // metode som forbinder til databasen vha. config.js
    constructor(config) {
        this.config = config;
    }

    // Skaber forbindelse til databasen
    async connect() {
        try {
            this.db = await sql.connect(this.config);
            this.connected = true;
        } catch (error) {
            console.error('Connection error:', error);
        }
    }
    // bryder forbindelsen til databasen
    async disconnect() {
        if (this.connected) {
            await this.db.close();
            this.connected = false;
        }
    }


    // Metode til at oprette en ny host i databasen
    async createHost({
        firstname,
        lastname,
        email,
        password_hash,
        phone,
        birthdate,
        city,
        bio,
        is_company,
        cvr,
        open_for_collab
      }) {
        await this.connect();
      
        const res = await this.db.request()
          .input('firstname', sql.NVarChar(50), firstname)
          .input('lastname', sql.NVarChar(50), lastname)
          .input('email', sql.NVarChar(100), email)
          .input('password_hash', sql.NVarChar(255), password_hash)
          .input('phone', sql.NVarChar(20), phone)
          .input('birthdate', sql.Date, birthdate)
          .input('city', sql.NVarChar(100), city)
          .input('bio', sql.NVarChar(sql.MAX), bio)
          .input('is_company', sql.Bit, is_company)
          .input('cvr', sql.NVarChar(20), cvr)
          .input('open_for_collab', sql.Bit, open_for_collab)
          .query(`
            INSERT INTO hosts (
              firstname, lastname, email, password_hash, phone,
              birthdate, city, bio, is_company, cvr, open_for_collab
            )
            VALUES (
              @firstname, @lastname, @email, @password_hash, @phone,
              @birthdate, @city, @bio, @is_company, @cvr, @open_for_collab
            );
      
            SELECT SCOPE_IDENTITY() AS host_id;
          `);
      
        return res.recordset[0].host_id;
      }

    async findHostByEmail(email) {
      await this.connect();
      
      const res = await this.db.request()
        .input('email', sql.NVarChar(100), email)
        .query(`
          SELECT *
          FROM hosts
          WHERE email = @email;
        `);
      
      return res.recordset[0] || null;
      }

    async updateHostById(id, {
      firstname,
      lastname,
      email,
      phone,
      city,
      bio
    }) {
      await this.connect();

      const res = await this.db.request()
        .input('id', sql.Int, id)
        .input('firstname', sql.NVarChar(50), firstname)
        .input('lastname', sql.NVarChar(50), lastname)
        .input('email', sql.NVarChar(100), email)
        .input('phone', sql.NVarChar(20), phone)
        .input('city', sql.NVarChar(100), city)
        .input('bio', sql.NVarChar(sql.MAX), bio)
        .query(`
          UPDATE hosts
          SET
            firstname = @firstname,
            lastname = @lastname,
            email = @email,
            phone = @phone,
            city = @city,
            bio = @bio
          WHERE id = @id;

          SELECT id AS host_id, firstname, lastname, email, phone, city, bio
          FROM hosts
          WHERE id = @id;
        `);

      return res.recordset[0] || null;
    }

}


 
