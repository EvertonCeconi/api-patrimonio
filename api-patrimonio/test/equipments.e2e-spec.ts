import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

describe('Equipments (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let adminToken: string;
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
    model: 'Latitude 5420',
    serialNumber: 'SN-001',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new PrismaExceptionFilter());
    await app.init();
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

  async function createEquipment(
    overrides: Partial<typeof equipmentPayload> = {},
    token = accessToken,
  ) {
    const payload = {
      ...equipmentPayload,
      serialNumber: `SN-TEST-${randomUUID().slice(0, 8)}`,
      ...overrides,
    };
    const res = await request(app.getHttpServer())
      .post('/equipments')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    return res.body;
  }

  // ── AUTH GUARD ───────────────────────────────

  it('deve retornar 401 sem token', async () => {
    await request(app.getHttpServer()).get('/equipments').expect(401);
  });

  // ── POST ─────────────────────────────────────

  describe('POST /equipments', () => {
    it('deve criar equipamento com campos opcionais', async () => {
      const res = await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...equipmentPayload,
          ipAddress: '192.168.0.1',
          description: 'Notebook para dev',
          status: 'MANUTENCAO',
        })
        .expect(201);

      expect(res.body.ipAddress).toBe('192.168.0.1');
      expect(res.body.status).toBe('MANUTENCAO');
      expect(res.body.id).toBeDefined();
    });

    it('deve rejeitar payload inválido (validação plugada)', async () => {
      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Incompleto' })
        .expect(400);
    });
  });

  // ── GET ──────────────────────────────────────

  describe('GET /equipments', () => {
    it('deve listar equipamentos paginados', async () => {
      await createEquipment();
      await createEquipment({ name: 'Monitor' });

      const res = await request(app.getHttpServer())
        .get('/equipments?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(2);
    });

    it('deve rejeitar limit acima do máximo', async () => {
      await request(app.getHttpServer())
        .get('/equipments?limit=101')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  // ── GET /:id ────────────────────────────────

  describe('GET /equipments/:id', () => {
    it('deve retornar equipamento por ID', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .get(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(created.id);
    });

    it('deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/equipments/id-que-nao-existe')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ── PATCH ────────────────────────────────────

  describe('PATCH /equipments/:id', () => {
    it('deve atualizar nome do equipamento', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Atualizado' })
        .expect(200);

      expect(res.body.name).toBe('Atualizado');
    });

    it('deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/equipments/id-inexistente')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Qualquer' })
        .expect(404);
    });
  });

  // ── DELETE ───────────────────────────────────

  describe('DELETE /equipments/:id', () => {
    it('admin deve conseguir deletar equipamento', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .delete(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('deve impedir usuário comum de deletar', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .delete(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });

  // ── EXPORT CSV ───────────────────────────────

  describe('GET /equipments/export/csv', () => {
    it('deve exportar CSV com equipamentos', async () => {
      await createEquipment({ ipAddress: '10.0.0.1' });

      const res = await request(app.getHttpServer())
        .get('/equipments/export/csv')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Notebook Dell');
      expect(res.text).toContain('10.0.0.1');
    });

    it('deve falhar sem token', async () => {
      await request(app.getHttpServer())
        .get('/equipments/export/csv')
        .expect(401);
    });
  });

  // ── EXPORT XLSX ──────────────────────────────

  describe('GET /equipments/export/xlsx', () => {
    it('deve exportar XLSX com equipamentos', async () => {
      await createEquipment();

      const res = await request(app.getHttpServer())
        .get('/equipments/export/xlsx')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('spreadsheetml');
    });

    it('deve falhar sem token', async () => {
      await request(app.getHttpServer())
        .get('/equipments/export/xlsx')
        .expect(401);
    });
  });

  // ── IMPORT ───────────────────────────────────

  describe('POST /equipments/import', () => {
    function buildCsvBuffer(rows: Record<string, string>[]): Buffer {
      const header =
        'name;model;serialNumber;location;ipAddress;status;description';
      const data = rows.map((r) =>
        [
          'name',
          'model',
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

    async function previewAndConfirm(buffer: Buffer, filename: string) {
      const previewRes = await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, filename)
        .expect(201);

      expect(previewRes.body.token).toBeDefined();

      return request(app.getHttpServer())
        .post('/equipments/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: previewRes.body.token })
        .expect(201);
    }

    it('deve falhar sem token no preview', async () => {
      await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .expect(401);
    });

    it('deve rejeitar arquivo acima de 5MB', async () => {
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

      await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', bigBuffer, 'test.csv')
        .expect(413);
    });

    it('deve rejeitar extensão não suportada', async () => {
      await request(app.getHttpServer())
        .post('/equipments/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('teste'), 'test.txt')
        .expect(400);
    });

    it('fluxo completo CSV: preview → confirm', async () => {
      const buffer = buildCsvBuffer([
        {
          name: 'Importado CSV',
          model: 'Modelo X',
          serialNumber: 'SN-CSV',
          location: 'Depósito',
        },
      ]);

      const confirmRes = await previewAndConfirm(buffer, 'test.csv');
      expect(confirmRes.body.created).toBe(1);

      const eq = await prisma.equipment.findUnique({
        where: { serialNumber: 'SN-CSV' },
      });
      expect(eq).not.toBeNull();
    });

    it('fluxo completo XLSX: preview → confirm', async () => {
      const buffer = buildXlsxBuffer([
        {
          name: 'Importado XLSX',
          model: 'Modelo Y',
          serialNumber: 'SN-XLSX',
          location: 'Escritório',
        },
      ]);

      const confirmRes = await previewAndConfirm(buffer, 'test.xlsx');
      expect(confirmRes.body.created).toBe(1);
    });

    it('upsert: atualiza registro existente pelo serialNumber', async () => {
      await createEquipment({
        serialNumber: 'SN-UPSERT',
        name: 'Original',
      });

      const buffer = buildCsvBuffer([
        {
          name: 'Atualizado',
          model: 'Latitude 5420',
          serialNumber: 'SN-UPSERT',
          location: 'Novo Local',
        },
      ]);

      const confirmRes = await previewAndConfirm(buffer, 'test.csv');
      expect(confirmRes.body.updated).toBe(1);
    });
  });
});
