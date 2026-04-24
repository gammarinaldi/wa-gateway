import makeWASocket, { 
  DisconnectReason, 
  WASocket,
  ConnectionState,
  fetchLatestWaWebVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import pino from 'pino';
import axios from 'axios';
import { usePrismaAuthState } from '../whatsapp/auth.js';

const logger = pino({ level: 'error' });

export interface GatewayConfig {
  webhookUrl?: string;
  apiSecret?: string;
  redisUrl: string;
  databaseUrl?: string;
}

export type WebhookEvent = 'message.received' | 'connection.update' | 'qr.received';

export class WhatsAppGateway {
  public sessions = new Map<string, WASocket>();
  public sessionStates = new Map<string, string>();
  private prisma: PrismaClient;
  private redisClient: any;
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
    this.prisma = new PrismaClient(
      config.databaseUrl 
        ? { datasources: { db: { url: config.databaseUrl } } } 
        : undefined
    );
  }

  private async getRedisClient() {
    if (!this.redisClient) {
      this.redisClient = createClient({ url: this.config.redisUrl });
      await this.redisClient.connect();
    }
    return this.redisClient;
  }

  private async dispatchWebhook(event: WebhookEvent, sessionId: string, data: any) {
    if (!this.config.webhookUrl) return;

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      sessionId,
      data,
    };

    try {
      await axios.post(this.config.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Secret': this.config.apiSecret || '',
        },
        timeout: 5000,
      });
    } catch (error: any) {
      console.error(`Webhook Error [${event}]:`, error.message);
    }
  }

  public async connect(sessionId: string, options?: { onUpdate?: (event: string, data: any) => void }) {
    if (this.sessions.has(sessionId)) {
      const oldSock = this.sessions.get(sessionId);
      oldSock?.ev.removeAllListeners('connection.update');
      oldSock?.end(undefined);
      this.sessions.delete(sessionId);
      this.sessionStates.delete(sessionId);
    }

    const { state, saveCreds } = await usePrismaAuthState(sessionId);
    const { version } = await fetchLatestWaWebVersion({});
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger,
      version,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    this.sessions.set(sessionId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        if (options?.onUpdate) options.onUpdate('qr', qr);
        await this.dispatchWebhook('qr.received', sessionId, { qr });
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        if (options?.onUpdate) options.onUpdate('status', 'close');
        
        if (shouldReconnect) {
          this.connect(sessionId, options);
        } else {
          this.sessions.delete(sessionId);
          this.sessionStates.delete(sessionId);
          await this.prisma.session.delete({ where: { userId: sessionId } }).catch(() => {});
          await this.prisma.key.deleteMany({ where: { sessionId } }).catch(() => {});
        }
      } else if (connection === 'open') {
        this.sessionStates.set(sessionId, 'open');
        if (options?.onUpdate) options.onUpdate('status', 'open');
        await this.dispatchWebhook('connection.update', sessionId, { status: 'open' });
      } else if (connection === 'connecting') {
        this.sessionStates.set(sessionId, 'connecting');
        if (options?.onUpdate) options.onUpdate('status', 'connecting');
        await this.dispatchWebhook('connection.update', sessionId, { status: 'connecting' });
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.message || (m.type !== 'notify' && m.type !== 'append')) return;

      let content = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || 
                    msg.message?.imageMessage?.caption || "";
      
      if (!content) {
        if (msg.message?.imageMessage) content = "📷 Image";
        else if (msg.message?.documentMessage) content = "📄 Document";
        else if (msg.message?.videoMessage) content = "🎥 Video";
        else if (msg.message?.audioMessage) content = "🎵 Audio";
        else if (msg.message?.stickerMessage) content = "🏷️ Sticker";
      }

      if (content || msg.message?.imageMessage || msg.message?.documentMessage) {
        const savedMsg = await this.prisma.message.create({
          data: {
            sessionId,
            remoteJid: msg.key.remoteJid!,
            pushName: msg.pushName || (msg.key.fromMe ? "Me" : "Unknown"),
            content,
            fromMe: msg.key.fromMe ?? false,
            timestamp: new Date((msg.messageTimestamp as number) * 1000)
          }
        });

        if (options?.onUpdate) options.onUpdate('message', savedMsg);
        await this.dispatchWebhook('message.received', sessionId, savedMsg);
      }
    });

    return sock;
  }

  public async sendMessage(sessionId: string, jid: string, content: { text?: string; file?: Buffer; fileName?: string; mimetype?: string }) {
    const sock = this.sessions.get(sessionId);
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
  }

  public async logout(sessionId: string) {
    const sock = this.sessions.get(sessionId);
    if (sock) {
      await sock.logout();
      this.sessions.delete(sessionId);
      this.sessionStates.delete(sessionId);
    }
  }

  public getStatus(sessionId: string) {
    return this.sessionStates.get(sessionId) || 'idle';
  }
}
