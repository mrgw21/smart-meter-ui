
console.log('Starting server...');

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const cors = require('cors');

const app = express();
const corsOptions = {
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  };
app.use(cors());
app.use(bodyParser.json());

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN); 

app.post('/api/send-whatsapp-alert', async (req, res) => {
  const { message } = req.body;
  try {
    await client.messages.create({
      from: 'whatsapp:+14155238886',
      to: `whatsapp:${process.env.MY_PHONE_NUMBER}`,
      body: message
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

//For testing messages
fetch('http://localhost:3000/api/send-whatsapp-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '🚨 High power usage!' })
  });
  