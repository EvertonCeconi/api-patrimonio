import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

describe('Equipments (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let adminToken: string;
  let jwtService: JwtService;
  let prisma: PrismaService;

  const user = {
    name: 'Teste Equip',
    email: 'equip@test.com',
    password: '12345678',
  };

  const adminUser = {
    name: 'Admin Equip',
    email: 'admin@test.com',
    password: '12345678',
  };

  const equipmentPayload = {
    name: 'Notebook Dell',
    location: 'Estoque Principal',
    assetTag: 'PAT-001',
    model: 'Latitude 5420',
  };

  // ─────────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.useGlobalFilters(new PrismaExceptionFilter());

    await app.init();

    jwtService = app.get(JwtService);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.equipment.deleteMany();
    await prisma.user.deleteMany();

    await request(app.getHttpServer()).post('/auth/signup').send(user);
    const userRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: user.email, password: user.password });
    accessToken = userRes.body.access_token;

    await request(app.getHttpServer()).post('/auth/signup').send(adminUser);
    await prisma.user.update({
      where: { email: adminUser.email },
      data: { role: 'ADMIN' },
    });
    const adminRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminRes.body.access_token;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.equipment.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  }, 15000);

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  async function createEquipment(
    overrides: Partial<typeof equipmentPayload> = {},
    token = accessToken,
  ) {
    const res = await request(app.getHttpServer())
      .post('/equipments')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...equipmentPayload, ...overrides });
    return res.body;
  }

  async function createMany(count: number) {
    for (let i = 0; i < count; i++) {
      await createEquipment({
        name: `Equipamento ${i}`,
        assetTag: `PAT-BULK-${i}`,
      });
    }
  }

  // ─────────────────────────────────────────────
  // AUTH GUARD
  // ─────────────────────────────────────────────

  describe('Auth guard', () => {
    it('❌ deve falhar sem token', async () => {
      await request(app.getHttpServer()).get('/equipments').expect(401);
    });

    it('❌ deve falhar com token inválido', async () => {
      await request(app.getHttpServer())
        .get('/equipments')
        .set('Authorization', 'Bearer token_invalido')
        .expect(401);
    });

    it('❌ deve rejeitar token expirado', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'fake-id', email: 'fake@email.com' },
        { expiresIn: '0s' },
      );

      await request(app.getHttpServer())
        .get('/equipments')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('❌ deve rejeitar token assinado com secret errado', async () => {
      const fakeToken = jwtService.sign(
        { sub: 'fake-id', email: 'fake@email.com' },
        { secret: 'secret-errado' },
      );

      await request(app.getHttpServer())
        .get('/equipments')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────
  // POST /equipments
  // ─────────────────────────────────────────────

  describe('POST /equipments', () => {
    it('✅ deve criar equipamento com todos os campos obrigatórios', async () => {
      const res = await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(equipmentPayload)
        .expect(201);

      expect(res.body).toMatchObject({
        name: equipmentPayload.name,
        location: equipmentPayload.location,
        assetTag: equipmentPayload.assetTag,
        model: equipmentPayload.model,
        status: 'ESTOQUE', // valor default do Prisma
      });
      expect(res.body.id).toBeDefined();
    });

    it('✅ deve criar equipamento com campos opcionais preenchidos', async () => {
      const res = await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...equipmentPayload,
          ipAddress: '192.168.0.1',
          serialNumber: 'SN-12345',
          description: 'Notebook para desenvolvimento',
          status: 'MANUTENCAO',
        })
        .expect(201);

      expect(res.body.ipAddress).toBe('192.168.0.1');
      expect(res.body.serialNumber).toBe('SN-12345');
      expect(res.body.description).toBe('Notebook para desenvolvimento');
      expect(res.body.status).toBe('MANUTENCAO');
    });

    it('❌ deve falhar sem o campo "name"', async () => {
      const { name, ...semName } = equipmentPayload;

      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(semName)
        .expect(400);
    });

    it('❌ deve falhar sem o campo "location"', async () => {
      const { location, ...semLocation } = equipmentPayload;

      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(semLocation)
        .expect(400);
    });

    it('❌ deve falhar sem o campo "model"', async () => {
      const { model, ...semModel } = equipmentPayload;

      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(semModel)
        .expect(400);
    });

    it('❌ deve rejeitar status inválido', async () => {
      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...equipmentPayload, status: 'INVALIDO' })
        .expect(400);
    });

    it('❌ deve rejeitar IP em formato incorreto (string aleatória)', async () => {
      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...equipmentPayload, ipAddress: '1211233213' })
        .expect(400);
    });

    it('❌ deve rejeitar IP em formato incorreto (octeto faltando)', async () => {
      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...equipmentPayload, ipAddress: '192.168.1' })
        .expect(400);
    });

    it('❌ deve rejeitar campos não permitidos no body (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...equipmentPayload, campoInvalido: 'valor' })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────
  // GET /equipments
  // ─────────────────────────────────────────────

  describe('GET /equipments', () => {
    it('✅ deve retornar lista vazia quando não há equipamentos', async () => {
      const res = await request(app.getHttpServer())
        .get('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
      expect(res.body.meta.totalPages).toBe(0);
      expect(res.body.message).toBe('No records found');
    });

    it('✅ deve listar equipamentos com paginação padrão', async () => {
      await createEquipment();

      const res = await request(app.getHttpServer())
        .get('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.totalPages).toBe(1);
      expect(res.body.message).toBeUndefined();
    });

    it('✅ deve listar múltiplos equipamentos', async () => {
      await createEquipment();
      await createEquipment({ name: 'Monitor LG', assetTag: 'PAT-002' });

      const res = await request(app.getHttpServer())
        .get('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('✅ deve retornar equipamentos ordenados por createdAt desc', async () => {
      await createEquipment({ name: 'Primeiro', assetTag: 'PAT-A' });
      await createEquipment({ name: 'Segundo', assetTag: 'PAT-B' });

      const res = await request(app.getHttpServer())
        .get('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data[0].name).toBe('Segundo');
      expect(res.body.data[1].name).toBe('Primeiro');
    });

    describe('Filtros', () => {
      it('✅ deve filtrar por search no campo name', async () => {
        await createEquipment();
        await createEquipment({ name: 'Monitor LG', assetTag: 'PAT-002' });

        const res = await request(app.getHttpServer())
          .get('/equipments?search=Dell')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].name).toBe('Notebook Dell');
      });

      it('✅ deve filtrar por search no campo model', async () => {
        await createEquipment(); // model: Latitude 5420
        await createEquipment({
          name: 'Monitor LG',
          assetTag: 'PAT-002',
          model: 'UltraSharp',
        });

        const res = await request(app.getHttpServer())
          .get('/equipments?search=UltraSharp')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].name).toBe('Monitor LG');
      });

      it('✅ deve filtrar por search no campo assetTag', async () => {
        await createEquipment(); // PAT-001
        await createEquipment({ name: 'Monitor LG', assetTag: 'PAT-002' });

        const res = await request(app.getHttpServer())
          .get('/equipments?search=PAT-002')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].name).toBe('Monitor LG');
      });

      it('✅ search deve ser case-insensitive', async () => {
        await createEquipment(); // name: Notebook Dell

        const res = await request(app.getHttpServer())
          .get('/equipments?search=notebook dell')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
      });

      it('✅ deve retornar lista vazia para search sem resultados', async () => {
        await createEquipment();

        const res = await request(app.getHttpServer())
          .get('/equipments?search=TermoInexistente')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data).toEqual([]);
        expect(res.body.message).toBe('No records found');
      });

      it('✅ deve filtrar equipamentos por status', async () => {
        await createEquipment(); // status: ESTOQUE (default)
        await createEquipment({
          name: 'Monitor LG',
          assetTag: 'PAT-002',
          status: 'MANUTENCAO',
        });

        const res = await request(app.getHttpServer())
          .get('/equipments?status=MANUTENCAO')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].status).toBe('MANUTENCAO');
      });

      it('✅ deve combinar filtros search e status simultaneamente', async () => {
        await createEquipment({ name: 'Dell Estoque', assetTag: 'PAT-A' });
        await createEquipment({
          name: 'Dell Manutencao',
          assetTag: 'PAT-B',
          status: 'MANUTENCAO',
        });
        await createEquipment({
          name: 'LG Manutencao',
          assetTag: 'PAT-C',
          status: 'MANUTENCAO',
        });

        const res = await request(app.getHttpServer())
          .get('/equipments?search=Dell&status=MANUTENCAO')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].name).toBe('Dell Manutencao');
      });

      it('❌ deve rejeitar status inválido no filtro', async () => {
        await request(app.getHttpServer())
          .get('/equipments?status=INVALIDO')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });
    });

    describe('Paginação', () => {
      it('✅ deve respeitar o limit por página', async () => {
        await createMany(5);

        const res = await request(app.getHttpServer())
          .get('/equipments?page=1&limit=2')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(2);
        expect(res.body.meta.total).toBe(5);
        expect(res.body.meta.totalPages).toBe(3);
        expect(res.body.meta.page).toBe(1);
      });

      it('✅ deve navegar para a segunda página', async () => {
        await createMany(5);

        const res = await request(app.getHttpServer())
          .get('/equipments?page=2&limit=2')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(2);
        expect(res.body.meta.page).toBe(2);
      });

      it('✅ deve retornar última página com item restante', async () => {
        await createMany(3);

        const res = await request(app.getHttpServer())
          .get('/equipments?page=2&limit=2')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.meta.totalPages).toBe(2);
      });

      it('✅ deve retornar hasNextPage=true e hasPreviousPage=false na primeira página', async () => {
        await createMany(3);

        const res = await request(app.getHttpServer())
          .get('/equipments?page=1&limit=2')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.meta.hasNextPage).toBe(true);
        expect(res.body.meta.hasPreviousPage).toBe(false);
      });

      it('✅ deve retornar hasNextPage=false e hasPreviousPage=true na última página', async () => {
        await createMany(3);

        const res = await request(app.getHttpServer())
          .get('/equipments?page=2&limit=2')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.meta.hasNextPage).toBe(false);
        expect(res.body.meta.hasPreviousPage).toBe(true);
      });

      it('❌ deve rejeitar limit acima do máximo permitido (100)', async () => {
        await request(app.getHttpServer())
          .get('/equipments?limit=101')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });

      it('❌ deve rejeitar page menor que 1', async () => {
        await request(app.getHttpServer())
          .get('/equipments?page=0')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });
    });
  });

  // ─────────────────────────────────────────────
  // GET /equipments/:id
  // ─────────────────────────────────────────────

  describe('GET /equipments/:id', () => {
    it('✅ deve retornar o equipamento pelo ID com todos os campos', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .get(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(created.id);
      expect(res.body.name).toBe(equipmentPayload.name);
      expect(res.body.location).toBe(equipmentPayload.location);
      expect(res.body.assetTag).toBe(equipmentPayload.assetTag);
      expect(res.body.model).toBe(equipmentPayload.model);
    });

    it('❌ deve retornar 404 para ID inexistente', async () => {
      const res = await request(app.getHttpServer())
        .get('/equipments/id-que-nao-existe')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(res.body.error).toBe('Not Found');
    });

    it('❌ deve retornar 401 ao acessar sem token', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .get(`/equipments/${created.id}`)
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────
  // PATCH /equipments/:id
  // ─────────────────────────────────────────────

  describe('PATCH /equipments/:id', () => {
    it('✅ deve atualizar apenas o name mantendo demais campos intactos', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Notebook Atualizado' })
        .expect(200);

      expect(res.body.name).toBe('Notebook Atualizado');
      expect(res.body.location).toBe(equipmentPayload.location);
      expect(res.body.assetTag).toBe(equipmentPayload.assetTag);
      expect(res.body.model).toBe(equipmentPayload.model);
    });

    it('✅ deve atualizar o status do equipamento', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'MANUTENCAO' })
        .expect(200);

      expect(res.body.status).toBe('MANUTENCAO');
    });

    it('✅ deve atualizar múltiplos campos de uma vez', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Novo Nome',
          location: 'Nova Localização',
          status: 'MANUTENCAO',
        })
        .expect(200);

      expect(res.body.name).toBe('Novo Nome');
      expect(res.body.location).toBe('Nova Localização');
      expect(res.body.status).toBe('MANUTENCAO');
    });

    it('✅ deve atualizar o ipAddress com valor válido', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ipAddress: '10.0.0.1' })
        .expect(200);

      expect(res.body.ipAddress).toBe('10.0.0.1');
    });

    it('❌ deve retornar 404 ao atualizar ID inexistente', async () => {
      const res = await request(app.getHttpServer())
        .patch('/equipments/id-inexistente')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Qualquer' })
        .expect(404);

      expect(res.body.error).toBe('Not Found');
    });

    it('❌ deve rejeitar status inválido no PATCH', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'STATUS_INVALIDO' })
        .expect(400);
    });

    it('❌ deve rejeitar ipAddress inválido no PATCH', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ipAddress: 'nao-e-um-ip' })
        .expect(400);
    });

    it('❌ deve rejeitar campos não permitidos no body (forbidNonWhitelisted)', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ campoInvalido: 'valor' })
        .expect(400);
    });

    it('❌ deve retornar 401 sem token', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .send({ name: 'Sem Token' })
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────
  // DELETE /equipments/:id
  // ─────────────────────────────────────────────

  describe('DELETE /equipments/:id', () => {
    it('✅ deve permitir ADMIN deletar equipamento', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .delete(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('✅ equipamento não deve existir após ser deletado', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .delete(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('❌ deve impedir usuário comum de deletar com 403', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .delete(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('❌ deve retornar 401 sem token', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .delete(`/equipments/${created.id}`)
        .expect(401);
    });

    it('❌ deve retornar 404 ao deletar ID inexistente', async () => {
      const res = await request(app.getHttpServer())
        .delete('/equipments/id-inexistente')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toBe('Not Found');
    });
  });
});
