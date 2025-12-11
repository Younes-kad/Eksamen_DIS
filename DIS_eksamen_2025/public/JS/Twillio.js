const twilio = require('twilio');

// Henter Twilio-nøglerne fra env 
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Standard Twilio-klient med vores konto
const client = twilio(accountSid, authToken);

async function sendSms(to, body) {
  // Hvis brugeren ikke har +45 foran, sæt det på automatisk
  const formatted = to.startsWith('+') ? to : `+45${to}`;
  return client.messages.create({
    body,
    from: fromNumber,
    to: formatted
  });
}

module.exports = {
  sendSms
};
