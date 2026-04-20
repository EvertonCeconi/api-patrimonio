import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service'; // ajuste o caminho conforme sua estrutura
import * as bcrypt from 'bcrypt';

const prisma = new PrismaService();

async function main() {
  const passwordHash = await bcrypt.hash('senha123', 10);

  await prisma.user.create({
    data: {
      name: 'Administrador Inicial',
      email: 'admin@empresa.com',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Admin inicial criado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
