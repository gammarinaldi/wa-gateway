# Specification: WhatsApp QR Disconnect Logic

## User Requirement
- When the user clicks "Connect WhatsApp", a QR code is displayed.
- When the user clicks "Disconnect", the QR code must disappear immediately.

## Analysis
- The QR code visibility depends on the `qr` state and `status` state in `Dashboard.tsx`, which come from the `useSocket` hook.
- Currently, the `disconnect` function in `useSocket` only emits an event to the server.
- The `qr` state is not explicitly cleared when `disconnect` is called.
- To ensure the QR code disappears immediately, we should clear the `qr` state and reset the `status` state locally when `disconnect` is triggered.

## Implementation Plan
1.  **Modify `useSocket.ts`**:
    - Update the `disconnect` function to call `setQr(null)` and `setStatus('close')`.
    - Update the `connect` function to call `setStatus('connecting')` and `setQr(null)` to ensure a fresh start.
2.  **Verify**:
    - Test the workflow: Connect -> Wait for QR -> Disconnect -> QR should disappear.

## Technical Details
- File: `src/hooks/useSocket.ts`
- Functions: `connect`, `disconnect`
- States: `qr`, `status`
