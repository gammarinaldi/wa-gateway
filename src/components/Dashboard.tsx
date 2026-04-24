'use client';

import React, { useState, useMemo } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { QRCodeSVG } from 'qrcode.react';

export default function Dashboard() {
  const sessionId = 'default-user'; // In a real app, this would be dynamic
  const { status, qr, messages, connect, disconnect } = useSocket(sessionId);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);

  // Group messages by remoteJid
  const groupedMessages = useMemo(() => {
    const groups: Record<string, { 
      name: string; 
      latestMessage: string; 
      timestamp: number; 
      count: number;
      messages: any[];
    }> = {};

    // Messages are newest first from useSocket
    messages.forEach((msg) => {
      const jid = msg.remoteJid;
      if (!groups[jid]) {
        groups[jid] = {
          name: msg.pushName || jid.split('@')[0],
          latestMessage: msg.content,
          timestamp: msg.timestamp,
          count: 0,
          messages: [],
        };
      }
      groups[jid].messages.push(msg);
      groups[jid].count++;
    });

    return Object.entries(groups).sort((a, b) => b[1].timestamp - a[1].timestamp);
  }, [messages]);

  const selectedChat = useMemo(() => {
    if (!selectedJid) return null;
    return groupedMessages.find(([jid]) => jid === selectedJid)?.[1] || null;
  }, [selectedJid, groupedMessages]);

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="logo">
          WA GATEWAY
        </div>
        <div className={`status-badge status-${status}`}>
          {status}
        </div>
      </header>

      <main>
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 700 }}>
            Connection Control
          </h2>
          <p style={{ color: '#848E9C', marginBottom: '24px' }}>
            Generate a QR code to link your WhatsApp account.
          </p>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              className="btn-primary"
              onClick={connect}
              disabled={status === 'open' || status === 'connecting'}
            >
              {status === 'connecting' ? 'Connecting...' : 'Connect WhatsApp'}
            </button>
            <button
              className="btn-secondary"
              onClick={disconnect}
              disabled={status === 'close' || status === 'idle'}
            >
              Disconnect
            </button>
          </div>

          {qr && status !== 'open' && (
            <div className="qr-container">
              <div style={{ padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #E6E8EA' }}>
                <QRCodeSVG value={qr} size={256} />
              </div>
              <p style={{ fontSize: '14px', color: '#848E9C' }}>
                Scan this code with your WhatsApp app
              </p>
            </div>
          )}

          {status === 'connecting' && !qr && (
            <div className="qr-container">
              <div className="qr-placeholder">
                Initializing Session...
              </div>
            </div>
          )}
        </div>

        <div className="light-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ink)' }}>
              {selectedJid ? 'Chat History' : 'Live Message Logger'}
            </h2>
            {selectedJid && (
              <button 
                onClick={() => setSelectedJid(null)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                &larr; Back to List
              </button>
            )}
          </div>

          <div className="card" style={{ minHeight: '400px', padding: selectedJid ? '0' : '24px' }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#848E9C' }}>
                Waiting for incoming messages...
              </div>
            ) : selectedJid && selectedChat ? (
              <div className="chat-view">
                <div className="chat-header" style={{ padding: '16px 24px', borderBottom: '1px solid #E6E8EA', background: '#F5F5F5', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{selectedChat.name}</div>
                  <div style={{ fontSize: '12px', color: '#848E9C' }}>{selectedJid}</div>
                </div>
                <div className="message-list" style={{ padding: '24px', maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
                  {selectedChat.messages.map((msg) => (
                    <div key={msg.id} className="message-item" style={{ marginBottom: '16px', maxWidth: '80%', alignSelf: 'flex-start', borderBottom: 'none', padding: 0 }}>
                      <div className="message-content" style={{ background: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E6E8EA', boxShadow: 'rgba(32, 32, 37, 0.05) 0px 3px 5px 0px' }}>
                        {msg.content}
                        <div style={{ fontSize: '10px', color: '#848E9C', marginTop: '4px', textAlign: 'right' }}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {groupedMessages.map(([jid, data]) => (
                  <div 
                    key={jid} 
                    className="contact-card" 
                    onClick={() => setSelectedJid(jid)}
                    style={{ 
                      padding: '16px', 
                      border: '1px solid #E6E8EA', 
                      borderRadius: '12px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = 'rgba(8, 8, 8, 0.05) 0px 3px 5px 5px';
                      e.currentTarget.style.borderColor = '#F0B90B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#E6E8EA';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{data.name}</span>
                      <span style={{ fontSize: '12px', color: '#848E9C' }}>
                        {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#848E9C', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      marginBottom: '8px'
                    }}>
                      {data.latestMessage}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        background: '#F5F5F5', 
                        padding: '2px 8px', 
                        borderRadius: '10px',
                        color: '#848E9C'
                      }}>
                        {data.count} messages
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer style={{ marginTop: '64px', borderTop: '1px solid #E6E8EA', paddingTop: '32px', textAlign: 'center', color: '#848E9C', fontSize: '14px' }}>
        &copy; 2026 WhatsApp Gateway v7 Stable. All rights reserved.
      </footer>
    </div>
  );
}
