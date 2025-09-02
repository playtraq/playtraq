const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.game.count();
  console.log('Total games in database:', count);
  
  const sample = await prisma.game.findMany({ take: 3 });
  console.log('\nSample games:');
  sample.forEach(g => console.log(`- ${g.title} (${g.releaseYear})`));
  
  await prisma.$disconnect();
}

check();