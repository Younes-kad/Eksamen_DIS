const path = require('path');
const dotenv = require('dotenv');
const twilio = require('twilio');

// Load .env from project root (two levels up from this file)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

// Basic presence checks to avoid confusing Twilio errors
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.error('Manglende Twilio-miljøvariabler. Sørg for at .env i projekt-roden indeholder:');
  console.error('  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
  console.error('Tjek også at du kører scriptet fra projekt-roden eller brug absolute path.');
  console.log('TWILIO_ACCOUNT_SID present:', !!process.env.TWILIO_ACCOUNT_SID);
  console.log('TWILIO_AUTH_TOKEN present:', !!process.env.TWILIO_AUTH_TOKEN);
  console.log('TWILIO_PHONE_NUMBER present:', !!process.env.TWILIO_PHONE_NUMBER);
  process.exit(1);
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendTestSms() {
  try {
    const msg = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: '+4542542332', // skriv dit eget nummer her
      body: 'Test fra Twilio 📱'
    });

    console.log('Sendt! SID:', msg.sid);
  } catch (err) {
    // Twilio's errors often include a status and code
    console.error('Fejl ved send:');
    if (err.code) console.error('  Twilio code:', err.code);
    if (err.status) console.error('  HTTP status:', err.status);
    console.error('  Message:', err.message || err);
  }
}

sendTestSms();
