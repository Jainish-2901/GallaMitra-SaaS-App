import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// @ts-ignore
const databaseUrl = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
