import { 
  AuthenticationState, 
  AuthenticationCreds, 
  SignalDataTypeMap, 
  initAuthCreds, 
  BufferJSON, 
  proto 
} from '@whiskeysockets/baileys';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const usePrismaAuthState = async (sessionId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
  const writeData = async (data: any, id: string) => {
    await prisma.key.upsert({
      where: { sessionId_keyId: { sessionId, keyId: id } },
      update: { data: JSON.stringify(data, BufferJSON.replacer) },
      create: { sessionId, keyId: id, data: JSON.stringify(data, BufferJSON.replacer) }
    });
  };

  const readData = async (id: string) => {
    try {
      const res = await prisma.key.findUnique({
        where: { sessionId_keyId: { sessionId, keyId: id } }
      });
      if (res) {
        return JSON.parse(res.data, BufferJSON.reviver);
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const removeData = async (id: string) => {
    try {
      await prisma.key.delete({
        where: { sessionId_keyId: { sessionId, keyId: id } }
      });
    } catch (error) {}
  };

  const credsRes = await prisma.session.findUnique({ where: { userId: sessionId } });
  let creds: AuthenticationCreds = credsRes ? JSON.parse(credsRes.data, BufferJSON.reviver) : initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [_: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            const categoryData = data[category as keyof typeof data];
            if (categoryData) {
              for (const id in categoryData) {
                const value = categoryData[id];
                const key = `${category}-${id}`;
                if (value) {
                  tasks.push(writeData(value, key));
                } else {
                  tasks.push(removeData(key));
                }
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await prisma.session.upsert({
        where: { userId: sessionId },
        update: { data: JSON.stringify(creds, BufferJSON.replacer) },
        create: { userId: sessionId, data: JSON.stringify(creds, BufferJSON.replacer) }
      });
    }
  };
};
