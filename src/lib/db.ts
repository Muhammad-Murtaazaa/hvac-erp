import { PrismaClient } from "@prisma/client";

export interface ExtendedPrismaClient extends PrismaClient {
  account: any;
  journalEntry: any;
  journalLine: any;
  [key: string]: any;
}

const prismaClientSingleton = () => {
  return new PrismaClient() as ExtendedPrismaClient;
};

declare global {
  var prismaGlobal: undefined | ExtendedPrismaClient;
}

const prisma: ExtendedPrismaClient = (globalThis.prismaGlobal ?? prismaClientSingleton()) as ExtendedPrismaClient;

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
