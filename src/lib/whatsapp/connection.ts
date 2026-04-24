import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  Browsers, 
  makeCacheableSignalKeyStore,
  WASocket,
  AuthenticationState,
  ConnectionState,
  fetchLatestWaWebVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import pino from 'pino';
import { usePrismaAuthState } from './auth.js';
import { Server } from 'socket.io';
import { dispatchWebhook } from '../webhook/webhook.js';


const logger = pino({ level: 'debug' });
const prisma = new PrismaClient();

let redisClient: any;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
  }
  return redisClient;
};

export const sessions = new Map<string, WASocket>();
export const sessionStates = new Map<string, string>();

export const connectToWhatsApp = async (sessionId: string, io?: Server) => {

  if (sessions.has(sessionId)) {
    console.log(`Session ${sessionId} already exists, ending it before restart...`);
    const oldSock = sessions.get(sessionId);
    oldSock?.ev.removeAllListeners('connection.update');
    oldSock?.end(undefined);
    sessions.delete(sessionId);
    sessionStates.delete(sessionId);
  }

  const { state, saveCreds } = await usePrismaAuthState(sessionId);
  const { version, isLatest } = await fetchLatestWaWebVersion({});
  console.log(`Using WA version: ${version.join('.')}, isLatest: ${isLatest}`);
  
  const redis = await getRedisClient();

  console.log(`Starting WhatsApp connection for session: ${sessionId}`);
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger,
    version,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  sessions.set(sessionId, sock);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`QR received for session: ${sessionId}`);
      if (io) io.to(sessionId).emit('qr', qr);
      await dispatchWebhook('qr.received', sessionId, { qr });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (io) io.to(sessionId).emit('status', 'close');
      
      if (shouldReconnect) {
        connectToWhatsApp(sessionId, io);
      } else {
        sessions.delete(sessionId);
        sessionStates.delete(sessionId);
        await prisma.session.delete({ where: { userId: sessionId } }).catch(() => {});
        await prisma.key.deleteMany({ where: { sessionId } }).catch(() => {});
      }
    } else if (connection === 'open') {
      sessionStates.set(sessionId, 'open');
      if (io) io.to(sessionId).emit('status', 'open');
      await dispatchWebhook('connection.update', sessionId, { status: 'open' });
    } else if (connection === 'connecting') {
      sessionStates.set(sessionId, 'connecting');
      if (io) io.to(sessionId).emit('status', 'connecting');
      await dispatchWebhook('connection.update', sessionId, { status: 'connecting' });
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    
    // Ignore protocol messages
    if (!msg.message || (m.type !== 'notify' && m.type !== 'append')) return;

    let content = msg.message?.conversation || 
                  msg.message?.extendedTextMessage?.text || 
                  msg.message?.imageMessage?.caption || "";
    
    // If it's a media message without caption, provide a placeholder
    if (!content) {
      if (msg.message?.imageMessage) content = "📷 Image";
      else if (msg.message?.documentMessage) content = "📄 Document";
      else if (msg.message?.videoMessage) content = "🎥 Video";
      else if (msg.message?.audioMessage) content = "🎵 Audio";
      else if (msg.message?.stickerMessage) content = "🏷️ Sticker";
    }

    // Only save if there is content or it's a known media type
    if (content || msg.message?.imageMessage || msg.message?.documentMessage) {
      const savedMsg = await prisma.message.create({
        data: {
          sessionId,
          remoteJid: msg.key.remoteJid!,
          pushName: msg.pushName || (msg.key.fromMe ? "Me" : "Unknown"),
          content,
          fromMe: msg.key.fromMe ?? false,
          timestamp: new Date((msg.messageTimestamp as number) * 1000)
        }
      });

      if (io) io.to(sessionId).emit('message', savedMsg);
      await dispatchWebhook('message.received', sessionId, savedMsg);
    }
  });

  sock.ev.on('messaging-history.set', async ({ messages: historyMessages }) => {
    console.log(`Received history sync: ${historyMessages.length} messages`);
    for (const msg of historyMessages) {
      const content = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      msg.message?.imageMessage?.caption || "";
      
      if (content && msg.key.remoteJid) {
        await prisma.message.upsert({
          where: { id: msg.key.id! }, // Using message ID as unique identifier
          update: {},
          create: {
            id: msg.key.id!,
            sessionId,
            remoteJid: msg.key.remoteJid,
            pushName: msg.pushName || (msg.key.fromMe ? "Me" : "Unknown"),
            content,
            fromMe: msg.key.fromMe ?? false,
            timestamp: new Date((msg.messageTimestamp as number) * 1000)
          }
        }).catch(() => {});
      }
    }
  });

  return sock;
};

export const disconnectFromWhatsApp = async (sessionId: string) => {
  const sock = sessions.get(sessionId);
  if (sock) {
    await sock.logout();
    sessions.delete(sessionId);
  }
};

export const sendWhatsAppMessage = async (
  sessionId: string, 
  jid: string, 
  content: { text?: string; file?: Buffer; fileName?: string; mimetype?: string }
) => {
  const sock = sessions.get(sessionId);
  if (!sock) throw new Error('Session not found or not active');

  if (content.file) {
    const isImage = content.mimetype?.startsWith('image/');
    if (isImage) {
      return await sock.sendMessage(jid, {
        image: content.file,
        caption: content.text,
        mimetype: content.mimetype || 'image/jpeg',
      });
    } else {
      return await sock.sendMessage(jid, {
        document: content.file,
        caption: content.text,
        mimetype: content.mimetype || 'application/octet-stream',
        fileName: content.fileName || 'file'
      });
    }
  } else {
    return await sock.sendMessage(jid, { text: content.text || '' });
  }
};
