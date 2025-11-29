const express = require('express');
const crypto = require('crypto');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

function normalizePem(key, { type }) {
  if (!key) return null;
  let cleaned = key.trim();
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\\n/g, '\n');

  const hasHeader = cleaned.includes('-----BEGIN');
  if (hasHeader) {
    return cleaned;
  }

  if (type === 'public') {
    return `-----BEGIN PUBLIC KEY-----\n${cleaned}\n-----END PUBLIC KEY-----`;
  }

  return `-----BEGIN RSA PRIVATE KEY-----\n${cleaned}\n-----END RSA PRIVATE KEY-----`;
}

function decryptWithPrivateKey(privateKey, encryptedContent) {
  if (!privateKey || !encryptedContent) return null;

  try {
    const normalized = normalizePem(privateKey, { type: 'private' });
    const keyObj = crypto.createPrivateKey(normalized);
    const decrypted = crypto.privateDecrypt(
      {
        key: keyObj,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(encryptedContent, 'base64')
    );

    return decrypted.toString('utf8');
  } catch (err) {
    return null;
  }
}

function encryptWithPublicKey(publicKey, text) {
  const normalized = normalizePem(publicKey, { type: 'public' });
  try {
    const keyObj = crypto.createPublicKey(normalized);
    const encrypted = crypto.publicEncrypt(
      {
        key: keyObj,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(text, 'utf8')
    );
    return encrypted.toString('base64');
  } catch (err) {
    const rsaWrapped = normalizePem(publicKey, { type: 'public' }).replace('BEGIN PUBLIC KEY', 'BEGIN RSA PUBLIC KEY').replace('END PUBLIC KEY', 'END RSA PUBLIC KEY');
    const keyObj = crypto.createPublicKey(rsaWrapped);
    const encrypted = crypto.publicEncrypt(
      {
        key: keyObj,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(text, 'utf8')
    );
    return encrypted.toString('base64');
  }
}

function parseDualCipher(content) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed && (parsed.to || parsed.from)) return parsed;
  } catch (err) {
    return null;
  }
  return null;
}

function decryptForHost({ content, hostPrivateKey, isSender }) {
  const dual = parseDualCipher(content);
  const targetCipher = dual
    ? (isSender ? (dual.from || dual.to) : (dual.to || dual.from))
    : content;

  return decryptWithPrivateKey(hostPrivateKey, targetCipher);
}

router.get('/messages', requireLogin, async (req, res) => {
  const db = req.app.get('db');
  const hostId = req.session.host.id;

  try {
    const [host, conversations] = await Promise.all([
      db.findHostById(hostId),
      db.getConversationsForHost(hostId)
    ]);

    if (!host) {
      return res.status(404).send('Bruger ikke fundet.');
    }

    const conversationsWithPreview = conversations.map((conv) => {
      const otherHostId = conv.host1_id === hostId ? conv.host2_id : conv.host1_id;
      const otherFirst = otherHostId === conv.host1_id ? conv.host1_firstname : conv.host2_firstname;
      const otherLast = otherHostId === conv.host1_id ? conv.host1_lastname : conv.host2_lastname;
      const otherEmail = otherHostId === conv.host1_id ? conv.host1_email : conv.host2_email;

      const lastMessagePlaintext = conv.last_message_id
        ? decryptForHost({
            content: conv.last_message_content,
            hostPrivateKey: host.private_key,
            isSender: conv.last_message_sender_id === hostId
          })
        : null;

      return {
        conversation_id: conv.conversation_id,
        host1_id: conv.host1_id,
        host2_id: conv.host2_id,
        created_at: conv.created_at,
        other_host: {
          id: otherHostId,
          firstname: otherFirst,
          lastname: otherLast,
          email: otherEmail
        },
        last_message: conv.last_message_id
          ? {
              id: conv.last_message_id,
              sender_id: conv.last_message_sender_id,
              content: conv.last_message_content,
              plaintext: lastMessagePlaintext,
              is_read: conv.last_message_is_read,
              created_at: conv.last_message_created_at
            }
          : null
      };
    });

    res.json(conversationsWithPreview);
  } catch (err) {
    console.error('Fejl ved hentning af samtaler:', err);
    res.status(500).send('Kunne ikke hente samtaler.');
  }
});

router.get('/messages/search', requireLogin, async (req, res) => {
  const db = req.app.get('db');
  const hostId = req.session.host.id;
  const term = req.query.term || '';

  try {
    const results = await db.searchHostsByName(term);
    const filtered = results
      .filter((h) => h.id !== hostId)
      .map((h) => ({
        id: h.id,
        firstname: h.firstname,
        lastname: h.lastname,
        email: h.email
      }));

    res.json(filtered);
  } catch (err) {
    console.error('Fejl ved søgning efter værter:', err);
    res.status(500).send('Kunne ikke søge efter værter.');
  }
});

router.get('/messages/start/:hostId', requireLogin, async (req, res) => {
  const db = req.app.get('db');
  const hostId = req.session.host.id;
  const otherHostId = parseInt(req.params.hostId, 10);

  if (Number.isNaN(otherHostId)) {
    return res.status(400).send('Ugyldigt hostId.');
  }

  if (hostId === otherHostId) {
    return res.status(400).send('Du kan ikke starte en samtale med dig selv.');
  }

  try {
    const otherHost = await db.findHostById(otherHostId);

    if (!otherHost) {
      return res.status(404).send('Vært ikke fundet.');
    }

    let conversation = await db.findConversationBetween(hostId, otherHostId);

    if (!conversation) {
      await db.createConversation(hostId, otherHostId);
      conversation = await db.findConversationBetween(hostId, otherHostId);
    }

    const allConversations = await db.getConversationsForHost(hostId);
    const withDetails = allConversations.find(
      (c) => c.conversation_id === (conversation?.id || conversation?.conversation_id)
    );

    res.json(withDetails || conversation);
  } catch (err) {
    console.error('Fejl ved start af samtale:', err);
    res.status(500).send('Kunne ikke starte samtale.');
  }
});

router.get('/messages/:conversationId', requireLogin, async (req, res) => {
  const db = req.app.get('db');
  const hostId = req.session.host.id;
  const conversationId = parseInt(req.params.conversationId, 10);

  if (Number.isNaN(conversationId)) {
    return res.status(400).send('Ugyldigt conversationId.');
  }

  try {
    const host = await db.findHostById(hostId);

    if (!host) {
      return res.status(404).send('Bruger ikke fundet.');
    }

    const conversations = await db.getConversationsForHost(hostId);
    const conversation = conversations.find((c) => c.conversation_id === conversationId);

    if (!conversation) {
      return res.status(404).send('Samtalen findes ikke eller du har ikke adgang.');
    }

    const messages = await db.getMessages(conversationId);

    const decryptedMessages = messages.map((msg) => {
      const plaintext = decryptForHost({
        content: msg.content,
        hostPrivateKey: host.private_key,
        isSender: msg.sender_id === hostId
      });

      return {
        ...msg,
        plaintext
      };
    });

    res.json({
      conversation_id: conversationId,
      messages: decryptedMessages
    });
  } catch (err) {
    console.error('Fejl ved hentning af beskeder:', err);
    res.status(500).send('Kunne ikke hente beskeder.');
  }
});

router.post('/messages/send', requireLogin, async (req, res) => {
  const db = req.app.get('db');
  const senderId = req.session.host.id;
  const conversationId = parseInt(req.body.conversationId, 10);
  const text = req.body.text;

  if (Number.isNaN(conversationId) || !text) {
    return res.status(400).send('conversationId og text er påkrævet.');
  }

  try {
    const conversations = await db.getConversationsForHost(senderId);
    const conversation = conversations.find((c) => c.conversation_id === conversationId);

    if (!conversation) {
      return res.status(404).send('Samtalen findes ikke eller du har ikke adgang.');
    }

    const recipientId = conversation.host1_id === senderId ? conversation.host2_id : conversation.host1_id;
    const recipient = await db.findHostById(recipientId);
    const sender = await db.findHostById(senderId);

    if (!recipient || !recipient.public_key) {
      return res.status(400).send('Modtageren mangler en offentlig nøgle.');
    }
    if (!sender || !sender.public_key) {
      return res.status(400).send('Afsenderen mangler en offentlig nøgle.');
    }

    let encryptedForRecipient;
    let encryptedForSender;
    try {
      encryptedForRecipient = encryptWithPublicKey(recipient.public_key, text);
      encryptedForSender = encryptWithPublicKey(sender.public_key, text);
    } catch (err) {
      console.error('Fejl ved kryptering:', err);
      return res.status(400).send('Ugyldig offentlig nøgle hos afsender eller modtager.');
    }

    const storedContent = JSON.stringify({ to: encryptedForRecipient, from: encryptedForSender });

    const saved = await db.createMessage(conversationId, senderId, storedContent);

    res.json({
      ...saved,
      plaintext: text
    });
  } catch (err) {
    console.error('Fejl ved afsendelse af besked:', err);
    res.status(500).send('Kunne ikke sende besked.');
  }
});

module.exports = router;
