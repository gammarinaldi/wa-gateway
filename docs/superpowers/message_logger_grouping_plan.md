# Implementation Plan: Grouped Live Message Logger

This plan outlines the changes needed to group the Live Message Logger items by message name (contact) and implement a drill-down view for chat history.

## 1. Objectives
- Group incoming messages by contact (remoteJid/pushName).
- Display each contact as a single card showing the latest message.
- Implement a "Chat History" view that opens when a contact card is clicked.
- Provide a way to go back to the contact list.

## 2. Technical Approach

### State Management
- `selectedContact`: A state to track which contact's chat history is currently visible (null for the contact list).
- `messages`: Existing state from `useSocket` will be used as the source of truth.

### Data Processing
- Create a memoized `groupedMessages` object/array where:
    - Keys are `remoteJid`.
    - Values contain the latest message, contact name, and an array of all messages for that contact.

### UI Components
1. **Contact List View**:
    - Iterate over `groupedMessages`.
    - Render each contact as a card.
    - Card displays: Contact name, latest message snippet, timestamp.
2. **Chat History View**:
    - Rendered when `selectedContact` is set.
    - Displays: Contact name at the top, "Back" button, and a scrollable list of messages for that contact.
    - Re-use `message-item` styling or enhance it for a chat bubble feel.

## 3. UI/UX Design (Binance.US Inspired)
- **Contact Cards**: White cards with 12px radius, subtle hover effect.
- **Back Button**: Secondary pill button or a simple arrow icon with text.
- **Chat Bubbles**: Distinct styles for incoming/outgoing (though currently all seem incoming from the gateway's perspective).
- **Transitions**: Smooth transition between list and history views.

## 4. Implementation Steps
1.  **Modify `Dashboard.tsx`**:
    - Add `selectedContact` state.
    - Implement `groupedMessages` logic using `useMemo`.
    - Update the `Live Message Logger` section to conditionally render either the contact list or the chat history.
    - Style the new components according to `DESIGN.md`.

## 5. Verification Plan
- Send messages from different WhatsApp contacts and verify they group correctly.
- Click a contact card and verify history displays correctly.
- Use the "Back" button to return to the list.
- Ensure new incoming messages update the latest message in the list and the history view if open.
