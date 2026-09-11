import { PrismaClient } from '@prisma/client';
import { DEFAULT_COURSES } from '@phi-brain/shared';

const prisma = new PrismaClient();

async function main() {
  for (const c of DEFAULT_COURSES) {
    await prisma.course.upsert({
      where: { code: c.code },
      update: {},
      create: { code: c.code, name: c.name, description: c.description || null },
    });
  }
  console.log(`Seeded ${DEFAULT_COURSES.length} courses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
