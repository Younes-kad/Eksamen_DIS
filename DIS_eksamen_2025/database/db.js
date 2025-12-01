// Vi bruger npm pakken mssql, som kan oprette forbindelse til vores Azure SQL database
const sql = require("mssql");
const crypto = require("crypto");

// Opretter en enkelt database klasse, hvor alle metoder vil ligge i. 
module.exports = class Db {
    config = {};
    poolconnection = null;
    connected = false;

    // metode som forbinder til databasen vha. config.js
    constructor(config) {
        this.config = config;
    }

    hashEmail(email) {
      if (!email) return null;
      const normalized = String(email).trim().toLowerCase();
      const secret = process.env.EMAIL_HASH_SECRET;

      if (!secret) {
        console.warn('EMAIL_HASH_SECRET mangler; bruger normaliseret email som hash.');
        return normalized;
      }

      return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
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
      open_for_collab,
      public_key = null,
      private_key = null
      }) {
        await this.connect();
        const email_hash = this.hashEmail(email);
      
        const res = await this.db.request()
          .input('firstname', sql.NVarChar(50), firstname)
          .input('lastname', sql.NVarChar(50), lastname)
          .input('email', sql.NVarChar(100), email)
          .input('email_hash', sql.NVarChar(128), email_hash)
          .input('password_hash', sql.NVarChar(255), password_hash)
          .input('phone', sql.NVarChar(20), phone)
          .input('birthdate', sql.Date, birthdate)
          .input('city', sql.NVarChar(100), city)
          .input('bio', sql.NVarChar(sql.MAX), bio)
          .input('is_company', sql.Bit, is_company)
          .input('cvr', sql.NVarChar(20), cvr)
          .input('open_for_collab', sql.Bit, open_for_collab)
          .input('public_key', sql.NVarChar(sql.MAX), public_key)
          .input('private_key', sql.NVarChar(sql.MAX), private_key)
          .query(`
            INSERT INTO hosts (
              firstname, lastname, email, email_hash, password_hash, phone,
              birthdate, city, bio, is_company, cvr, open_for_collab,
              public_key, private_key
            )
            VALUES (
              @firstname, @lastname, @email, @email_hash, @password_hash, @phone,
              @birthdate, @city, @bio, @is_company, @cvr, @open_for_collab,
              @public_key, @private_key
            );
      
            SELECT SCOPE_IDENTITY() AS host_id;
          `);
      
        return res.recordset[0].host_id;
      }

    async findHostByEmail(email) {
      await this.connect();
      const email_hash = this.hashEmail(email);
      
      const res = await this.db.request()
        .input('email', sql.NVarChar(100), email)
        .input('email_hash', sql.NVarChar(128), email_hash)
        .query(`
          SELECT *
          FROM hosts
          WHERE email_hash = @email_hash
             OR email = @email;
        `);
      
      return res.recordset[0] || null;
      }

    async setHostAuthenticated(id, authenticated) {
      await this.connect();

      await this.db.request()
        .input('id', sql.Int, id)
        .input('authenticated', sql.Bit, authenticated)
        .query(`
          UPDATE hosts
          SET authenticated = @authenticated
          WHERE id = @id;
        `);
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
      const email_hash = this.hashEmail(email);

      const res = await this.db.request()
        .input('id', sql.Int, id)
        .input('firstname', sql.NVarChar(50), firstname)
        .input('lastname', sql.NVarChar(50), lastname)
        .input('email', sql.NVarChar(100), email)
        .input('email_hash', sql.NVarChar(128), email_hash)
        .input('phone', sql.NVarChar(20), phone)
        .input('city', sql.NVarChar(100), city)
        .input('bio', sql.NVarChar(sql.MAX), bio)
        .query(`
          UPDATE hosts
          SET
            firstname = @firstname,
            lastname = @lastname,
            email = @email,
            email_hash = @email_hash,
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

    async findHostById(id) {
      await this.connect();

      const res = await this.db.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT *
          FROM hosts
          WHERE id = @id;
        `);

      return res.recordset[0] || null;
    }

    async searchHostsByName(searchTerm) {
      await this.connect();
      const term = `%${searchTerm || ''}%`;

      const res = await this.db.request()
        .input('term', sql.NVarChar(200), term)
        .query(`
          SELECT id, firstname, lastname, email, public_key, private_key
          FROM hosts
          WHERE firstname LIKE @term
             OR lastname LIKE @term;
        `);

      return res.recordset;
    }

    async findConversationBetween(hostA, hostB) {
      await this.connect();

      const res = await this.db.request()
        .input('hostA', sql.Int, hostA)
        .input('hostB', sql.Int, hostB)
        .query(`
          SELECT *
          FROM conversations
          WHERE (host1_id = @hostA AND host2_id = @hostB)
             OR (host1_id = @hostB AND host2_id = @hostA);
        `);

      return res.recordset[0] || null;
    }

    async createConversation(host1Id, host2Id) {
      await this.connect();

      const res = await this.db.request()
        .input('host1Id', sql.Int, host1Id)
        .input('host2Id', sql.Int, host2Id)
        .query(`
          INSERT INTO conversations (host1_id, host2_id)
          VALUES (@host1Id, @host2Id);

          SELECT SCOPE_IDENTITY() AS conversation_id;
        `);

      return res.recordset[0]?.conversation_id || null;
    }

    async getConversationsForHost(hostId) {
      await this.connect();

      const res = await this.db.request()
        .input('hostId', sql.Int, hostId)
        .query(`
          SELECT
            c.id AS conversation_id,
            c.host1_id,
            c.host2_id,
            c.created_at,
            h1.firstname AS host1_firstname,
            h1.lastname AS host1_lastname,
            h1.email AS host1_email,
            h2.firstname AS host2_firstname,
            h2.lastname AS host2_lastname,
            h2.email AS host2_email,
            lastMsg.id AS last_message_id,
            lastMsg.sender_id AS last_message_sender_id,
            lastMsg.content AS last_message_content,
            lastMsg.is_read AS last_message_is_read,
            lastMsg.created_at AS last_message_created_at
          FROM conversations c
          JOIN hosts h1 ON h1.id = c.host1_id
          JOIN hosts h2 ON h2.id = c.host2_id
          OUTER APPLY (
            SELECT TOP 1 *
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC, m.id DESC
          ) lastMsg
          WHERE c.host1_id = @hostId
             OR c.host2_id = @hostId
          ORDER BY last_message_created_at DESC, c.created_at DESC;
        `);

      return res.recordset;
    }

    async createMessage(conversationId, senderId, encryptedContent) {
      await this.connect();

      const res = await this.db.request()
        .input('conversationId', sql.Int, conversationId)
        .input('senderId', sql.Int, senderId)
        .input('content', sql.NVarChar(sql.MAX), encryptedContent)
        .query(`
          INSERT INTO messages (conversation_id, sender_id, content)
          VALUES (@conversationId, @senderId, @content);

          SELECT TOP 1
            id AS message_id,
            conversation_id,
            sender_id,
            content,
            is_read,
            created_at
          FROM messages
          WHERE id = SCOPE_IDENTITY();
        `);

      return res.recordset[0] || null;
    }

    async getMessages(conversationId) {
      await this.connect();

      const res = await this.db.request()
        .input('conversationId', sql.Int, conversationId)
        .query(`
          SELECT
            id AS message_id,
            conversation_id,
            sender_id,
            content,
            is_read,
            created_at
          FROM messages
          WHERE conversation_id = @conversationId
          ORDER BY created_at ASC, message_id ASC;
        `);

      return res.recordset;
    }

}


 
