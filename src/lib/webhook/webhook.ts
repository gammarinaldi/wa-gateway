import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const API_SECRET = process.env.API_SECRET || 'wa-gateway-secret';

export type WebhookEvent = 'message.received' | 'connection.update' | 'qr.received';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  sessionId: string;
  data: any;
}

export const dispatchWebhook = async (event: WebhookEvent, sessionId: string, data: any) => {
  if (!WEBHOOK_URL) {
    console.log(`Webhook URL not configured. Skipping event: ${event}`);
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    sessionId,
    data,
  };

  try {
    console.log(`Dispatching webhook [${event}] to ${WEBHOOK_URL}`);
    await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Secret': API_SECRET,
      },
      timeout: 5000,
    });
  } catch (error: any) {
    console.error(`Webhook Dispatch Error [${event}]:`, error.message);
    // In a production app, we might want to retry or log this to a DB
  }
};
