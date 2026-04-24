# Spec: Interactive Chat Box with Attachments

## 1. Overview
Adding a functional chat interface to the WhatsApp Gateway dashboard that allows users to send text messages and file attachments (images/documents) to a selected contact.

## 2. Goals
- Provide a real-time chat reply interface.
- Support single file attachments per message.
- Maintain the Binance.US design aesthetic.
- Ensure stable delivery via a dedicated API endpoint.

## 3. Technical Design

### 3.1 Backend Updates (`src/lib/whatsapp/connection.ts`)
- **New Function**: `sendWhatsAppMessage(sessionId: string, jid: string, content: { text?: string, file?: Buffer, fileName?: string, mimetype?: string })`
- **Logic**: 
    - Retrieve active session from `sessions` Map.
    - If `file` is provided:
        - Determine if it's an image or document based on `mimetype`.
        - Use `sock.sendMessage(jid, { image: file, caption: text })` or `{ document: file, caption: text, fileName, mimetype }`.
    - If only `text` is provided:
        - Use `sock.sendMessage(jid, { text })`.

### 3.2 API Endpoint (`src/server.ts`)
- **Route**: `POST /api/send`
- **Middleware**: Use `multer` (memoryStorage) to handle `multipart/form-data`.
- **Payload**:
    - `sessionId`: string (default: 'default-user')
    - `jid`: string
    - `text`: string (optional)
    - `file`: File (optional)
- **Response**: `{ success: true, messageId: string }` or `{ success: false, error: string }`.

### 3.3 Frontend Updates (`src/components/Dashboard.tsx`)
- **State**:
    - `inputText`: string
    - `selectedFile`: File | null
    - `isSending`: boolean
- **Components**:
    - `ChatFooter`: A new container at the bottom of `.chat-view`.
    - `FilePreview`: UI to show selected file name and a remove button.
- **Actions**:
    - `handleSend()`: 
        - Prepare `FormData`.
        - `fetch('/api/send', ...)`
        - Clear input on success.

## 4. UI/UX Specifications (Binance Style)
- **Footer Container**:
    - Background: `#F5F5F5`
    - Padding: `16px 24px`
    - Border-top: `1px solid #E6E8EA`
- **Input Field**:
    - Background: `#FFFFFF`
    - Border: `1px solid #E6E8EA`
    - Focus Border: `1px solid #000000`
    - Border-radius: `8px`
- **Buttons**:
    - **Attach**: Icon button, grey `#848E9C`, hover `#1E2026`.
    - **Send**: Pill button, Background `#F0B90B`, Text `#1E2026`, Weight 600.
- **Message List**:
    - Update `max-height` and ensure `flex-direction: column-reverse` works correctly with the new footer.
    - Add support for displaying sent messages (fromMe) with different styling (e.g., light yellow background or right alignment).

## 5. Security & Constraints
- File size limit: 10MB (enforced by multer/express).
- Only one file per message.
- Session must be 'open' to send.

## 6. Success Criteria
- User can send text to a selected JID.
- User can send an image with a caption.
- User can send a PDF/Doc with a caption.
- Messages sent from the dashboard appear in the chat history.
