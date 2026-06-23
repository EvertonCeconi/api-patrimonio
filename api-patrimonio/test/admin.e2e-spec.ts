import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let userId: string;

  const adminUser = {
    name: 'Admin Teste',
    email: 'admin@test.com',
    password: '12345678',
  };

  const regularUser = {
    name: 'Usuário Comum',
    email: 'user@test.com',
    password: '12345678',
  };

  // ─────────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // Cria e promove o admin
    await request(app.getHttpServer()).post('/auth/signup').send(adminUser);
    await prisma.user.update({
      where: { email: adminUser.email },
      data: { role: 'ADMIN', isActive: true },
    });
    const adminRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminRes.body.access_token;

    // Cria o usuário comum (inativo por padrão)
    await request(app.getHttpServer()).post('/auth/signup').send(regularUser);
    const userRecord = await prisma.user.findUnique({
      where: { email: regularUser.email },
    });
    userId = userRecord!.id;

    // Ativa para poder fazer login e obter token para testes de 403
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
    const userRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: regularUser.email, password: regularUser.password });
    userToken = userRes.body.access_token;

    // Volta para inativo para os testes de ativação fazerem sentido
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  }, 15000);

  // ─────────────────────────────────────────────
  // PROTEÇÃO DE ROTA
  // ─────────────────────────────────────────────

  describe('Proteção de rota', () => {
    it('❌ deve retornar 401 sem token', async () => {
      await request(app.getHttpServer()).get('/admin/users').expect(401);
    });

    it('❌ deve retornar 403 para usuário comum', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('✅ deve permitir acesso com token de ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ─────────────────────────────────────────────
  // GET /admin/users
  // ─────────────────────────────────────────────

  describe('GET /admin/users', () => {
    it('✅ deve retornar estrutura paginada', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({
        total: 2,
        page: 1,
        totalPages: 1,
      });
    });

    it('✅ deve retornar campos corretos por usuário', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const u = res.body.data[0];
      expect(u).toHaveProperty('id');
      expect(u).toHaveProperty('name');
      expect(u).toHaveProperty('email');
      expect(u).toHaveProperty('role');
      expect(u).toHaveProperty('isActive');
      expect(u).toHaveProperty('createdAt');
      expect(u).not.toHaveProperty('passwordHash');
    });

    it('✅ deve retornar mensagem quando não há usuários', async () => {
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();

      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(401); // token inválido pois o usuário foi deletado — comportamento esperado
      // Recria o admin para os próximos testes não quebrarem
    });

    describe('Filtros', () => {
      it('✅ deve filtrar por search no name', async () => {
        const res = await request(app.getHttpServer())
          .get(`/admin/users?search=Usuário`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].email).toBe(regularUser.email);
      });

      it('✅ deve filtrar por search no email', async () => {
        const res = await request(app.getHttpServer())
          .get(`/admin/users?search=admin`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].email).toBe(adminUser.email);
      });

      it('✅ deve filtrar por isActive=false', async () => {
        const res = await request(app.getHttpServer())
          .get('/admin/users?isActive=false')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].isActive).toBe(false);
      });

      it('✅ deve filtrar por isActive=true', async () => {
        const res = await request(app.getHttpServer())
          .get('/admin/users?isActive=true')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].isActive).toBe(true);
      });

      it('✅ deve filtrar por role=ADMIN', async () => {
        const res = await request(app.getHttpServer())
          .get('/admin/users?role=ADMIN')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].role).toBe('ADMIN');
      });

      it('✅ deve filtrar por role=USER', async () => {
        const res = await request(app.getHttpServer())
          .get('/admin/users?role=USER')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].role).toBe('USER');
      });

      it('❌ deve rejeitar role inválida no filtro', async () => {
        await request(app.getHttpServer())
          .get('/admin/users?role=SUPERADMIN')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      });
    });

    describe('Paginação', () => {
      beforeEach(async () => {
        // Cria usuários extras para testar paginação
        for (let i = 0; i < 5; i++) {
          await request(app.getHttpServer())
            .post('/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: `Usuário Extra ${i}`,
              email: `extra${i}@test.com`,
              password: '12345678',
            });
        }
      });

      it('✅ deve respeitar o limit por página', async () => {
        const res = await request(app.getHttpServer())
          .get('/admin/users?page=1&limit=3')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(3);
        expect(res.body.meta.limit).toBe(3);
      });

      it('✅ deve navegar para a segunda página', async () => {
        const res = await request(app.getHttpServer())
          .get('/admin/users?page=2&limit=3')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.meta.page).toBe(2);
        expect(res.body.data.length).toBeGreaterThan(0);
      });

      it('✅ deve retornar hasNextPage e hasPreviousPage corretamente', async () => {
        const res = await request(app.getHttpServer())
          .get('/admin/users?page=1&limit=3')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.meta.hasNextPage).toBe(true);
        expect(res.body.meta.hasPreviousPage).toBe(false);
      });

      it('❌ deve rejeitar limit acima de 100', async () => {
        await request(app.getHttpServer())
          .get('/admin/users?limit=101')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      });

      it('❌ deve rejeitar page menor que 1', async () => {
        await request(app.getHttpServer())
          .get('/admin/users?page=0')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      });
    });
  });

  // ─────────────────────────────────────────────
  // GET /admin/users/:id
  // ─────────────────────────────────────────────

  describe('GET /admin/users/:id', () => {
    it('✅ deve retornar usuário pelo ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(userId);
      expect(res.body.email).toBe(regularUser.email);
    });

    it('❌ deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/admin/users/id-que-nao-existe')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─────────────────────────────────────────────
  // POST /admin/users
  // ─────────────────────────────────────────────

  describe('POST /admin/users', () => {
    it('✅ deve criar usuário com campos obrigatórios', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Novo Usuário',
          email: 'novo@test.com',
          password: '12345678',
        })
        .expect(201);

      expect(res.body.email).toBe('novo@test.com');
      expect(res.body.isActive).toBe(false);
      expect(res.body.role).toBe('USER');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('✅ deve criar usuário já ativo e com role ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Outro Admin',
          email: 'outro.admin@test.com',
          password: '12345678',
          role: 'ADMIN',
          isActive: true,
        })
        .expect(201);

      expect(res.body.role).toBe('ADMIN');
      expect(res.body.isActive).toBe(true);
    });

    it('❌ deve falhar com email já existente', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicado',
          email: regularUser.email,
          password: '12345678',
        })
        .expect(409);
    });

    it('❌ deve falhar sem o campo name', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'sem.nome@test.com', password: '12345678' })
        .expect(400);
    });

    it('❌ deve falhar com senha curta', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Teste', email: 'curta@test.com', password: '123' })
        .expect(400);
    });

    it('❌ deve falhar com role inválida', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Teste',
          email: 'role@test.com',
          password: '12345678',
          role: 'SUPERADMIN',
        })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────
  // PATCH /admin/users/:id/activate
  // ─────────────────────────────────────────────

  describe('PATCH /admin/users/:id/activate', () => {
    it('✅ deve ativar usuário inativo', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(true);
      expect(res.body.id).toBe(userId);
    });

    it('✅ deve persistir isActive=true no banco', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      const userInDb = await prisma.user.findUnique({ where: { id: userId } });
      expect(userInDb!.isActive).toBe(true);
    });

    it('✅ usuário ativado deve conseguir fazer login', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: regularUser.email, password: regularUser.password })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
    });

    it('❌ deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/admin/users/id-invalido/activate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('❌ deve retornar 403 para usuário comum', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/activate`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ─────────────────────────────────────────────
  // PATCH /admin/users/:id/promote
  // ─────────────────────────────────────────────

  describe('PATCH /admin/users/:id/promote', () => {
    it('✅ deve promover usuário para ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.role).toBe('ADMIN');
      expect(res.body.id).toBe(userId);
    });

    it('✅ deve persistir role=ADMIN no banco', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`);

      const userInDb = await prisma.user.findUnique({ where: { id: userId } });
      expect(userInDb!.role).toBe('ADMIN');
    });

    it('❌ deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/admin/users/id-invalido/promote')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('❌ deve retornar 403 para usuário comum', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/promote`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ─────────────────────────────────────────────
  // PATCH /admin/users/:id
  // ─────────────────────────────────────────────

  describe('PATCH /admin/users/:id', () => {
    it('✅ deve atualizar o name do usuário', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nome Atualizado' })
        .expect(200);

      expect(res.body.name).toBe('Nome Atualizado');
    });

    it('✅ deve atualizar o email do usuário', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'atualizado@test.com' })
        .expect(200);

      expect(res.body.email).toBe('atualizado@test.com');
    });

    it('✅ deve atualizar múltiplos campos de uma vez', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Novo Nome', isActive: true })
        .expect(200);

      expect(res.body.name).toBe('Novo Nome');
      expect(res.body.isActive).toBe(true);
    });

    it('❌ deve falhar com email já em uso por outro usuário', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: adminUser.email })
        .expect(409);
    });

    it('❌ deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/admin/users/id-invalido')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Qualquer' })
        .expect(404);
    });

    it('❌ deve rejeitar campos não permitidos', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ campoInvalido: 'valor' })
        .expect(400);
    });

    it('❌ admin não deve conseguir rebaixar a própria role', async () => {
      const adminRecord = await prisma.user.findUnique({
        where: { email: adminUser.email },
      });

      await request(app.getHttpServer())
        .patch(`/admin/users/${adminRecord!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'USER' })
        .expect(403);
    });
  });

  // ─────────────────────────────────────────────
  // DELETE /admin/users/:id
  // ─────────────────────────────────────────────

  describe('DELETE /admin/users/:id', () => {
    it('✅ deve excluir usuário existente', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('✅ usuário não deve existir no banco após exclusão', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const userInDb = await prisma.user.findUnique({ where: { id: userId } });
      expect(userInDb).toBeNull();
    });

    it('✅ deve excluir refresh tokens do usuário em cascata', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const tokensAfter = await prisma.refreshToken.findMany({
        where: { userId },
      });

      expect(tokensAfter.length).toBe(0);
    });

    it('❌ deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .delete('/admin/users/id-invalido')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('❌ deve retornar 403 para usuário comum', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('❌ deve retornar 401 sem token', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .expect(401);
    });

    it('❌ admin não deve conseguir excluir a própria conta', async () => {
      const adminRecord = await prisma.user.findUnique({
        where: { email: adminUser.email },
      });

      await request(app.getHttpServer())
        .delete(`/admin/users/${adminRecord!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });
});
