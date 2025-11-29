const express = require('express');
const crypto = require('crypto');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

function decryptWithPrivateKey(privateKey, encryptedContent) {
  if (!privateKey || !encryptedContent) return null;

  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
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
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    Buffer.from(text, 'utf8')
  );

  return encrypted.toString('base64');
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

      const lastMessagePlaintext = decryptWithPrivateKey(host.private_key, conv.last_message_content);

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
      const plaintext = decryptWithPrivateKey(host.private_key, msg.content);

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

    if (!recipient || !recipient.public_key) {
      return res.status(400).send('Modtageren mangler en offentlig nøgle.');
    }

    const encryptedContent = encryptWithPublicKey(recipient.public_key, text);
    const saved = await db.createMessage(conversationId, senderId, encryptedContent);

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
