# Spec: WhatsApp Gateway API & Library Transformation

## 1. Overview
Transform the current WhatsApp Gateway from a simple dashboard-centric app into a robust, service-oriented API and Library. This allows external services (like AI Services or Auth Services) to interact with WhatsApp seamlessly.

## 2. Target Architecture
Based on the integration diagram:
- **Inbound**: REST API for sending messages and managing sessions.
- **Outbound**: Webhook system to notify external services of incoming messages and connection events.
- **Security**: API Key authentication for all REST endpoints.

## 3. Core Features

### 3.1 Session Management API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions/init` | POST | Initialize a new WA session (returns QR or status) |
| `/api/sessions/status` | GET | Check connection status |
| `/api/sessions/logout` | POST | Terminate and logout a session |

### 3.2 Messaging API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messages/send` | POST | Send text or media message |

### 3.3 Webhook System (The "Gateway" part)
- **Config**: Allow setting a `WEBHOOK_URL` in `.env` or via API.
- **Events**:
  - `message.received`: When a new message arrives.
  - `connection.update`: When status changes (connecting, open, close).
  - `qr.received`: When a new QR code is generated.

## 4. Implementation Plan (TDD)

### Phase 1: Webhook Infrastructure
1. Implement a `WebhookService` to handle outgoing POST requests.
2. Update `connection.ts` to trigger webhooks on events.

### Phase 2: REST API Refactoring
1. Create a structured API route system in Next.js or Express.
2. Implement API Key authentication middleware.

### Phase 3: Integration Support
1. Add configuration for "Auth Service" verification.
2. Ensure data format matches expectations for "AI Service" (JSON payload with message details).

## 5. Success Metrics
- External services can send messages via POST request.
- Incoming WhatsApp messages are successfully forwarded to a configured Webhook URL.
- Multiple sessions can be managed via API without UI intervention.
