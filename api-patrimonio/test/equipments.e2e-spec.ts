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

  const equipmentPayload: Record<string, unknown> = {
    name: 'Notebook Dell',
    location: 'Estoque Principal',
    assetTag: 'PAT-001',
    model: 'Latitude 5420',
    serialNumber: 'SN-001',
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
    await prisma.user.update({
      where: { email: user.email },
      data: { isActive: true },
    });
    const userRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: user.email, password: user.password });
    accessToken = userRes.body.access_token;

    await request(app.getHttpServer()).post('/auth/signup').send(adminUser);
    await prisma.user.update({
      where: { email: adminUser.email },
      data: { role: 'ADMIN', isActive: true },
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

  let eqCounter = 0;

  async function createEquipment(
    overrides: Partial<typeof equipmentPayload> = {},
    token = accessToken,
  ) {
    eqCounter++;
    const payload = {
      ...equipmentPayload,
      serialNumber: `SN-${eqCounter}-${Date.now()}`,
      ...overrides,
    };
    const res = await request(app.getHttpServer())
      .post('/equipments')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
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
      expect(res.body.message).toBe('Nenhum equipamento encontrado');
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
        expect(res.body.message).toBe('Nenhum equipamento encontrado');
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

      expect(res.body.status).toBe('error');
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

      expect(res.body.status).toBe('error');
    });
  });

  // ─────────────────────────────────────────────
  // GET /equipments/export/csv
  // ─────────────────────────────────────────────

  describe('GET /equipments/export/csv', () => {
    it('❌ deve falhar sem token', async () => {
      await request(app.getHttpServer())
        .get('/equipments/export/csv')
        .expect(401);
    });

    it('✅ deve exportar CSV vazio quando não há equipamentos', async () => {
      const res = await request(app.getHttpServer())
        .get('/equipments/export/csv')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('equipamentos.csv');
      expect(res.text).toContain('\ufeff');
      expect(res.text).toContain(
        'name;model;assetTag;serialNumber;ipAddress;location;status;description',
      );
    });

    it('✅ deve exportar CSV com equipamentos', async () => {
      await createEquipment({
        serialNumber: 'SN-CSV-1',
        ipAddress: '192.168.1.1',
      });

      const res = await request(app.getHttpServer())
        .get('/equipments/export/csv')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.text).toContain('Notebook Dell');
      expect(res.text).toContain('192.168.1.1');
      expect(res.text).toContain('ESTOQUE');
    });

    it('✅ deve respeitar filtro de status no CSV', async () => {
      await createEquipment({
        name: 'Em Estoque',
        assetTag: 'PAT-CSV-1',
        serialNumber: 'SN-CSV-2',
      });
      await createEquipment({
        name: 'Em Manutencao',
        assetTag: 'PAT-CSV-2',
        serialNumber: 'SN-CSV-3',
        status: 'MANUTENCAO',
      });

      const res = await request(app.getHttpServer())
        .get('/equipments/export/csv?status=MANUTENCAO')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.text).toContain('Em Manutencao');
      expect(res.text).not.toContain('Em Estoque');
    });

    it('✅ qualquer usuário autenticado pode exportar CSV', async () => {
      await createEquipment();

      const res = await request(app.getHttpServer())
        .get('/equipments/export/csv')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.text).toContain('Notebook Dell');
    });
  });

  // ─────────────────────────────────────────────
  // GET /equipments/export/xlsx
  // ─────────────────────────────────────────────

  describe('GET /equipments/export/xlsx', () => {
    it('❌ deve falhar sem token', async () => {
      await request(app.getHttpServer())
        .get('/equipments/export/xlsx')
        .expect(401);
    });

    it('✅ deve exportar XLSX com equipamentos', async () => {
      await createEquipment({
        serialNumber: 'SN-XLSX-1',
        ipAddress: '10.0.0.1',
      });

      const res = await request(app.getHttpServer())
        .get('/equipments/export/xlsx')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('equipamentos.xlsx');
      expect(res.body).toBeDefined();
    });

    it('✅ deve respeitar search no XLSX', async () => {
      await createEquipment({
        name: 'Encontravel',
        assetTag: 'PAT-XLSX-1',
        serialNumber: 'SN-XLSX-2',
      });
      await createEquipment({
        name: 'Outro',
        assetTag: 'PAT-XLSX-2',
        serialNumber: 'SN-XLSX-3',
      });

      const res = await request(app.getHttpServer())
        .get('/equipments/export/xlsx?search=Encontravel')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('✅ qualquer usuário autenticado pode exportar XLSX', async () => {
      await createEquipment();

      const res = await request(app.getHttpServer())
        .get('/equipments/export/xlsx')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });

  // ─────────────────────────────────────────────
  // POST /equipments/import
  // ─────────────────────────────────────────────

  describe('POST /equipments/import', () => {
    function buildCsvBuffer(rows: Record<string, string>[]): Buffer {
      const header =
        'name;model;assetTag;serialNumber;location;ipAddress;status;description';
      const data = rows.map((r) =>
        [
          'name',
          'model',
          'assetTag',
          'serialNumber',
          'location',
          'ipAddress',
          'status',
          'description',
        ]
          .map((k) => r[k] ?? '')
          .join(';'),
      );
      return Buffer.from('\ufeff' + header + '\n' + data.join('\n'), 'utf-8');
    }

    function buildXlsxBuffer(rows: Record<string, string>[]): Buffer {
      const XLSX = require('xlsx');
      const workbook = XLSX.utils.book_new();
      const data = rows.map((r) => ({
        name: r.name ?? '',
        model: r.model ?? '',
        assetTag: r.assetTag ?? '',
        serialNumber: r.serialNumber ?? '',
        location: r.location ?? '',
        ipAddress: r.ipAddress ?? '',
        status: r.status ?? '',
        description: r.description ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, 'Equipamentos');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    async function previewAndConfirm(
      buffer: Buffer,
      filename: string,
      mode?: 'upsert' | 'insert',
    ) {
      const req = request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, filename);

      if (mode) req.field('mode', mode);

      const previewRes = await req.expect(201);

      expect(previewRes.body.token).toBeDefined();

      const confirmRes = await request(app.getHttpServer())
        .post('/equipments/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: previewRes.body.token })
        .expect(201);

      return confirmRes.body;
    }

    // ── Auth & Guards ──────────────────────────

    it('❌ deve falhar sem token no preview', async () => {
      await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .expect(401);
    });

    it('❌ deve falhar sem token no confirm', async () => {
      await request(app.getHttpServer())
        .post('/equipments/import/confirm')
        .send({ token: 'qualquer' })
        .expect(401);
    });

    it('❌ deve negar preview a usuário comum (403)', async () => {
      const buffer = buildCsvBuffer([
        {
          name: 'Test',
          model: 'M1',
          assetTag: 'IMP-001',
          serialNumber: 'SN-IMP-1',
          location: 'Local',
        },
      ]);

      await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', buffer, 'test.csv')
        .expect(403);
    });

    it('❌ deve negar confirm a usuário comum (403)', async () => {
      await request(app.getHttpServer())
        .post('/equipments/import/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: 'qualquer' })
        .expect(403);
    });

    // ── Preview ────────────────────────────────

    it('✅ preview retorna sumário com token para CSV', async () => {
      const buffer = buildCsvBuffer([
        {
          name: 'Preview CSV',
          model: 'M1',
          assetTag: 'IMP-PREV-1',
          serialNumber: 'SN-PREV-1',
          location: 'Local',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'test.csv')
        .expect(201);

      expect(res.body.token).toBeDefined();
      expect(res.body.total).toBe(1);
      expect(res.body.toCreate).toBe(1);
      expect(res.body.toUpdate).toBe(0);
      expect(res.body.errors).toEqual([]);
      expect(res.body.rows).toHaveLength(1);
      expect(res.body.rows[0].action).toBe('create');
    });

    it('✅ preview retorna sumário para XLSX', async () => {
      const buffer = buildXlsxBuffer([
        {
          name: 'Preview XLSX',
          model: 'M2',
          assetTag: 'IMP-PREV-2',
          serialNumber: 'SN-PREV-2',
          location: 'Escritório',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'test.xlsx')
        .expect(201);

      expect(res.body.token).toBeDefined();
      expect(res.body.total).toBe(1);
      expect(res.body.toCreate).toBe(1);
    });

    it('✅ preview detecta linhas que serão atualizadas', async () => {
      await createEquipment({
        assetTag: 'IMP-PREV-UPDATE',
        serialNumber: 'SN-PREV-UPDATE',
        name: 'Original',
      });

      const buffer = buildCsvBuffer([
        {
          name: 'Atualizado',
          model: 'M1',
          assetTag: 'IMP-PREV-UPDATE',
          serialNumber: 'SN-PREV-UPDATE',
          location: 'Local',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'test.csv')
        .expect(201);

      expect(res.body.toCreate).toBe(0);
      expect(res.body.toUpdate).toBe(1);
      expect(res.body.rows[0].action).toBe('update');
    });

    it('❌ preview rejeita campos obrigatórios ausentes', async () => {
      const buffer = buildCsvBuffer([
        {
          name: '',
          model: 'M1',
          assetTag: 'IMP-MISS-1',
          serialNumber: 'SN-MISS-1',
          location: 'Local',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'test.csv')
        .expect(201);

      expect(res.body.errors.length).toBeGreaterThan(0);
      expect(res.body.errors[0].message).toContain('name');
      expect(res.body.toCreate).toBe(0);
    });

    it('❌ preview rejeita status inválido', async () => {
      const buffer = buildCsvBuffer([
        {
          name: 'Test',
          model: 'M1',
          assetTag: 'IMP-INV-1',
          serialNumber: 'SN-INV-1',
          location: 'Local',
          status: 'INVALIDO',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'test.csv')
        .expect(201);

      expect(res.body.errors.length).toBe(1);
      expect(res.body.errors[0].message).toContain('Status inválido');
    });

    it('❌ preview rejeita IP inválido', async () => {
      const buffer = buildCsvBuffer([
        {
          name: 'Test',
          model: 'M1',
          assetTag: 'IMP-IP-1',
          serialNumber: 'SN-IP-1',
          location: 'Local',
          ipAddress: '999.999.999.999',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'test.csv')
        .expect(201);

      expect(res.body.errors.length).toBe(1);
      expect(res.body.errors[0].message).toContain('IP inválido');
    });

    it('❌ preview rejeita fórmula injection (=)', async () => {
      const buffer = buildCsvBuffer([
        {
          name: '=CMD',
          model: 'M1',
          assetTag: 'IMP-FORM-1',
          serialNumber: 'SN-FORM-1',
          location: 'Local',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'test.csv')
        .expect(201);

      expect(res.body.errors.length).toBe(1);
      expect(res.body.errors[0].message).toContain('fórmula');
    });

    it('❌ preview rejeita arquivo muito grande (acima de 5MB)', async () => {
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

      await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', bigBuffer, 'test.csv')
        .expect(413);
    });

    it('❌ preview rejeita extensão não suportada', async () => {
      await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('teste'), 'test.txt')
        .expect(400);
    });

    it('✅ preview erros são isolados por linha', async () => {
      const buffer = buildCsvBuffer([
        {
          name: 'Valido',
          model: 'M1',
          assetTag: 'IMP-ISO-1',
          serialNumber: 'SN-ISO-1',
          location: 'Local',
        },
        {
          name: 'Invalido',
          model: 'M2',
          assetTag: 'IMP-ISO-2',
          serialNumber: 'SN-ISO-2',
          location: 'Local',
          status: 'INVALIDO',
        },
        {
          name: 'Valido2',
          model: 'M3',
          assetTag: 'IMP-ISO-3',
          serialNumber: 'SN-ISO-3',
          location: 'Local2',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'test.csv')
        .expect(201);

      expect(res.body.toCreate).toBe(2);
      expect(res.body.errors.length).toBe(1);
    });

    // ── Confirm ────────────────────────────────

    it('❌ confirm rejeita token inválido', async () => {
      const res = await request(app.getHttpServer())
        .post('/equipments/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: 'token-invalido' })
        .expect(400);

      expect(res.body.message).toContain('Token inválido');
    });

    it('❌ confirm rejeita token ausente', async () => {
      const res = await request(app.getHttpServer())
        .post('/equipments/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(res.body.message).toContain('Token é obrigatório');
    });

    it('✅ fluxo completo: preview → confirm cria registros (CSV)', async () => {
      const buffer = buildCsvBuffer([
        {
          name: 'Completo CSV',
          model: 'Modelo X',
          assetTag: 'IMP-FULL-1',
          serialNumber: 'SN-FULL-1',
          location: 'Depósito',
          ipAddress: '192.168.0.10',
          status: 'ESTOQUE',
          description: 'Criado via CSV',
        },
      ]);

      const result = await previewAndConfirm(buffer, 'test.csv');

      expect(result.total).toBe(1);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.errors).toEqual([]);

      const eq = await prisma.equipment.findUnique({
        where: { serialNumber: 'SN-FULL-1' },
      });
      expect(eq).not.toBeNull();
      expect(eq!.name).toBe('Completo CSV');
    });

    it('✅ fluxo completo: preview → confirm cria registros (XLSX)', async () => {
      const buffer = buildXlsxBuffer([
        {
          name: 'Completo XLSX',
          model: 'Modelo Y',
          assetTag: 'IMP-FULL-2',
          serialNumber: 'SN-FULL-2',
          location: 'Escritório',
          status: 'MANUTENCAO',
        },
      ]);

      const result = await previewAndConfirm(buffer, 'test.xlsx');

      expect(result.total).toBe(1);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('✅ confirm faz upsert por serialNumber', async () => {
      await createEquipment({
        assetTag: 'IMP-UPSERT-SN',
        serialNumber: 'SN-UPSERT-SN',
        name: 'Original',
      });

      const buffer = buildCsvBuffer([
        {
          name: 'Atualizado',
          model: 'Latitude 5420',
          assetTag: 'IMP-UPSERT-SN',
          serialNumber: 'SN-UPSERT-SN',
          location: 'Novo Local',
          status: 'MANUTENCAO',
        },
      ]);

      const result = await previewAndConfirm(buffer, 'test.csv');

      expect(result.total).toBe(1);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);

      const eq = await prisma.equipment.findUnique({
        where: { serialNumber: 'SN-UPSERT-SN' },
      });
      expect(eq!.name).toBe('Atualizado');
      expect(eq!.location).toBe('Novo Local');
      expect(eq!.status).toBe('MANUTENCAO');
    });

    it('❌ confirm rejeita assetTag já cadastrado com outro serialNumber', async () => {
      await prisma.equipment.create({
        data: {
          name: 'Por AssetTag',
          model: 'M1',
          assetTag: 'IMP-ASSET-CLASH',
          serialNumber: 'SN-ASSET-OLD',
          location: 'Local Original',
        },
      });

      const buffer = buildCsvBuffer([
        {
          name: 'Tentativa',
          model: 'M2',
          assetTag: 'IMP-ASSET-CLASH',
          serialNumber: 'SN-ASSET-NEW',
          location: 'Local Novo',
        },
      ]);

      const result = await previewAndConfirm(buffer, 'test.csv');

      expect(result.updated).toBe(0);
      expect(result.created).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('IMP-ASSET-CLASH');
      expect(result.errors[0].message).toContain('SN-ASSET-OLD');
    });

    it('✅ confirm respeita erros isolados por linha', async () => {
      const buffer = buildCsvBuffer([
        {
          name: 'Valido',
          model: 'M1',
          assetTag: 'IMP-CONF-1',
          serialNumber: 'SN-CONF-1',
          location: 'Local',
        },
        {
          name: 'Invalido',
          model: 'M2',
          assetTag: 'IMP-CONF-2',
          serialNumber: 'SN-CONF-2',
          location: 'Local',
          status: 'INVALIDO',
        },
        {
          name: 'Valido2',
          model: 'M3',
          assetTag: 'IMP-CONF-3',
          serialNumber: 'SN-CONF-3',
          location: 'Local2',
        },
      ]);

      const result = await previewAndConfirm(buffer, 'test.csv');

      expect(result.created).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('Status inválido');
    });

    it('✅ preview não conta atualização quando dados são idênticos', async () => {
      await createEquipment({
        assetTag: 'IMP-SKIP-TAG',
        serialNumber: 'SN-SKIP-1',
        name: 'Sem Mudança',
        model: 'M1',
        location: 'Local',
      });

      const buffer = buildCsvBuffer([
        {
          name: 'Sem Mudança',
          model: 'M1',
          assetTag: 'IMP-SKIP-TAG',
          serialNumber: 'SN-SKIP-1',
          location: 'Local',
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'test.csv')
        .expect(201);

      expect(res.body.toUpdate).toBe(0);
      expect(res.body.toSkip).toBe(1);
      expect(res.body.rows[0].action).toBe('skip');
    });

    it('✅ modo insert rejeita serialNumber já cadastrado', async () => {
      await createEquipment({
        assetTag: 'IMP-INSERT-EXIST',
        serialNumber: 'SN-INSERT-EXIST',
        name: 'Existente',
      });

      const buffer = buildCsvBuffer([
        {
          name: 'Tentativa Insert',
          model: 'M1',
          assetTag: 'IMP-INSERT-NOVO',
          serialNumber: 'SN-INSERT-EXIST',
          location: 'Local',
        },
      ]);

      const result = await previewAndConfirm(buffer, 'test.csv', 'insert');

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('SN-INSERT-EXIST');
    });
  });
});
