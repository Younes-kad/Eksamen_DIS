const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  throw new Error('Twilio miljøvariabler mangler (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
}

const client = twilio(accountSid, authToken);

async function sendSms(to, body) {
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
