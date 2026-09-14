const { PrismaClient } = require("@prisma/client");

const prismaClientSingleton = () => {
    const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

    if (process.env.NODE_ENV === "development") {
        if (databaseUrl.startsWith("file:")) {
            console.log("🗄️ Database: SQLite (" + databaseUrl + ")");
        } else {
            try {
                const url = new URL(databaseUrl);
                console.log(`🗄️ Database: ${url.protocol}//${url.hostname}:${url.port || '3306'}`);
            } catch (e) {
                console.log("🗄️ Database URL configured");
            }
        }
    }

    return new PrismaClient({
        log: process.env.NODE_ENV === "development" 
            ? ['error', 'warn']
            : ['error'],
    });
};

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

module.exports = prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
