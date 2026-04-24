# Walkthrough: Using the WhatsApp Gateway API & Webhooks

The WhatsApp Gateway has been transformed into a service-oriented architecture. You can now integrate it with external services (Auth Service, AI Service, etc.) using REST APIs and Webhooks.

## 1. Environment Configuration
Add the following to your `.env` file:
```env
# The URL where wa-gateway will push events (e.g., to your AI Service)
WEBHOOK_URL=https://your-ai-service.com/webhook

# Secret to verify that requests are coming from wa-gateway
API_SECRET=your-secure-gateway-secret

# API Key to authorize requests to wa-gateway
API_KEY=your-secure-api-key
```

## 2. API Endpoints (v1)
All endpoints require the `X-API-Key` header.

### Session Management
- **Initialize Session**: `POST /api/v1/sessions/:sessionId/init`
- **Check Status**: `GET /api/v1/sessions/:sessionId/status`
- **Logout**: `POST /api/v1/sessions/:sessionId/logout`

### Messaging
- **Send Message**: `POST /api/v1/messages/send`
  - Body (JSON): `{ "jid": "remote-jid", "text": "Hello", "sessionId": "default-user" }`
  - Also supports `multipart/form-data` for file uploads.

## 3. Webhook Events
When an event occurs, `wa-gateway` will send a POST request to your `WEBHOOK_URL` with the following header:
`X-Gateway-Secret: your-secure-gateway-secret`

### Payload Format
```json
{
  "event": "message.received",
  "timestamp": "2024-04-24T12:00:00.000Z",
  "sessionId": "default-user",
  "data": { ... }
}
```

### Event Types
- `message.received`: New incoming message.
- `connection.update`: Connection status changed (open, connecting, close).
- `qr.received`: New QR code generated for authentication.

## 4. Using as a Library (NPM)
Once published or linked, you can use the core class in any Node.js project:

```typescript
import { WhatsAppGateway } from 'whatsapp-gateway';

const gateway = new WhatsAppGateway({
  redisUrl: 'redis://localhost:6379',
  webhookUrl: 'https://your-api.com/webhook'
});

// Initialize connection
await gateway.connect('my-session', {
  onUpdate: (event, data) => {
    console.log(`Event: ${event}`, data);
  }
});

// Send message
await gateway.sendMessage('my-session', '123456789@s.whatsapp.net', { 
  text: 'Hello from the library class!' 
});
```
