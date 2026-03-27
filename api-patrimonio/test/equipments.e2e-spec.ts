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
    nome: 'Notebook Dell',
    localizacao: 'Estoque Principal',
    patrimonio: 'PAT-001',
    modelo: 'Latitude 5420',
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
        nome: `Equipamento ${i}`,
        patrimonio: `PAT-BULK-${i}`,
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
        nome: equipmentPayload.nome,
        localizacao: equipmentPayload.localizacao,
        patrimonio: equipmentPayload.patrimonio,
        modelo: equipmentPayload.modelo,
        estado: 'ESTOQUE', // valor default do Prisma
      });
      expect(res.body.id).toBeDefined();
    });

    it('✅ deve criar equipamento com campos opcionais preenchidos', async () => {
      const res = await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...equipmentPayload,
          ip: '192.168.0.1',
          numeroSerie: 'SN-12345',
          descricao: 'Notebook para desenvolvimento',
          estado: 'MANUTENCAO',
        })
        .expect(201);

      expect(res.body.ip).toBe('192.168.0.1');
      expect(res.body.numeroSerie).toBe('SN-12345');
      expect(res.body.descricao).toBe('Notebook para desenvolvimento');
      expect(res.body.estado).toBe('MANUTENCAO');
    });

    it('❌ deve falhar sem o campo "nome"', async () => {
      const { nome, ...semNome } = equipmentPayload;

      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(semNome)
        .expect(400);
    });

    it('❌ deve falhar sem o campo "localizacao"', async () => {
      const { localizacao, ...semLocalizacao } = equipmentPayload;

      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(semLocalizacao)
        .expect(400);
    });

    it('❌ deve falhar sem o campo "modelo"', async () => {
      const { modelo, ...semModelo } = equipmentPayload;

      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(semModelo)
        .expect(400);
    });

    it('❌ deve rejeitar estado inválido', async () => {
      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...equipmentPayload, estado: 'INVALIDO' })
        .expect(400);
    });

    it('❌ deve rejeitar IP em formato incorreto (string aleatória)', async () => {
      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...equipmentPayload, ip: '1211233213' })
        .expect(400);
    });

    it('❌ deve rejeitar IP em formato incorreto (octeto faltando)', async () => {
      await request(app.getHttpServer())
        .post('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...equipmentPayload, ip: '192.168.1' })
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
      await createEquipment({ nome: 'Monitor LG', patrimonio: 'PAT-002' });

      const res = await request(app.getHttpServer())
        .get('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('✅ deve retornar equipamentos ordenados por createdAt desc', async () => {
      await createEquipment({ nome: 'Primeiro', patrimonio: 'PAT-A' });
      await createEquipment({ nome: 'Segundo', patrimonio: 'PAT-B' });

      const res = await request(app.getHttpServer())
        .get('/equipments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // o mais recente deve vir primeiro
      expect(res.body.data[0].nome).toBe('Segundo');
      expect(res.body.data[1].nome).toBe('Primeiro');
    });

    describe('Filtros', () => {
      it('✅ deve filtrar por search no campo nome', async () => {
        await createEquipment();
        await createEquipment({ nome: 'Monitor LG', patrimonio: 'PAT-002' });

        const res = await request(app.getHttpServer())
          .get('/equipments?search=Dell')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].nome).toBe('Notebook Dell');
      });

      it('✅ deve filtrar por search no campo modelo', async () => {
        await createEquipment(); // modelo: Latitude 5420
        await createEquipment({
          nome: 'Monitor LG',
          patrimonio: 'PAT-002',
          modelo: 'UltraSharp',
        });

        const res = await request(app.getHttpServer())
          .get('/equipments?search=UltraSharp')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].nome).toBe('Monitor LG');
      });

      it('✅ deve filtrar por search no campo patrimônio', async () => {
        await createEquipment(); // PAT-001
        await createEquipment({ nome: 'Monitor LG', patrimonio: 'PAT-002' });

        const res = await request(app.getHttpServer())
          .get('/equipments?search=PAT-002')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].nome).toBe('Monitor LG');
      });

      it('✅ search deve ser case-insensitive', async () => {
        await createEquipment(); // nome: Notebook Dell

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

      it('✅ deve filtrar equipamentos por estado', async () => {
        await createEquipment(); // estado: ESTOQUE (default)
        await createEquipment({
          nome: 'Monitor LG',
          patrimonio: 'PAT-002',
          estado: 'MANUTENCAO',
        });

        const res = await request(app.getHttpServer())
          .get('/equipments?estado=MANUTENCAO')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].estado).toBe('MANUTENCAO');
      });

      it('✅ deve combinar filtros search e estado simultaneamente', async () => {
        await createEquipment({ nome: 'Dell Estoque', patrimonio: 'PAT-A' });
        await createEquipment({
          nome: 'Dell Manutencao',
          patrimonio: 'PAT-B',
          estado: 'MANUTENCAO',
        });
        await createEquipment({
          nome: 'LG Manutencao',
          patrimonio: 'PAT-C',
          estado: 'MANUTENCAO',
        });

        const res = await request(app.getHttpServer())
          .get('/equipments?search=Dell&estado=MANUTENCAO')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].nome).toBe('Dell Manutencao');
      });

      it('❌ deve rejeitar estado inválido no filtro', async () => {
        await request(app.getHttpServer())
          .get('/equipments?estado=INVALIDO')
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
        await createMany(3); // 3 itens, limit=2 → página 2 tem só 1

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
        // PaginationDto valida @Max(100)
        await request(app.getHttpServer())
          .get('/equipments?limit=101')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });

      it('❌ deve rejeitar page menor que 1', async () => {
        // PaginationDto valida @Min(1)
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
      expect(res.body.nome).toBe(equipmentPayload.nome);
      expect(res.body.localizacao).toBe(equipmentPayload.localizacao);
      expect(res.body.patrimonio).toBe(equipmentPayload.patrimonio);
      expect(res.body.modelo).toBe(equipmentPayload.modelo);
    });

    it('❌ deve retornar 404 para ID inexistente', async () => {
      // PrismaExceptionFilter mapeia P2025 → 404
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
    it('✅ deve atualizar apenas o nome mantendo demais campos intactos', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nome: 'Notebook Atualizado' })
        .expect(200);

      expect(res.body.nome).toBe('Notebook Atualizado');
      expect(res.body.localizacao).toBe(equipmentPayload.localizacao);
      expect(res.body.patrimonio).toBe(equipmentPayload.patrimonio);
      expect(res.body.modelo).toBe(equipmentPayload.modelo);
    });

    it('✅ deve atualizar o estado do equipamento', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ estado: 'MANUTENCAO' })
        .expect(200);

      expect(res.body.estado).toBe('MANUTENCAO');
    });

    it('✅ deve atualizar múltiplos campos de uma vez', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: 'Novo Nome',
          localizacao: 'Nova Localização',
          estado: 'MANUTENCAO',
        })
        .expect(200);

      expect(res.body.nome).toBe('Novo Nome');
      expect(res.body.localizacao).toBe('Nova Localização');
      expect(res.body.estado).toBe('MANUTENCAO');
    });

    it('✅ deve atualizar o IP com valor válido', async () => {
      const created = await createEquipment();

      const res = await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ip: '10.0.0.1' })
        .expect(200);

      expect(res.body.ip).toBe('10.0.0.1');
    });

    it('❌ deve retornar 404 ao atualizar ID inexistente', async () => {
      // PrismaExceptionFilter mapeia P2025 → 404
      const res = await request(app.getHttpServer())
        .patch('/equipments/id-inexistente')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nome: 'Qualquer' })
        .expect(404);

      expect(res.body.error).toBe('Not Found');
    });

    it('❌ deve rejeitar estado inválido no PATCH', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ estado: 'ESTADO_INVALIDO' })
        .expect(400);
    });

    it('❌ deve rejeitar IP inválido no PATCH', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .patch(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ip: 'nao-e-um-ip' })
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
        .send({ nome: 'Sem Token' })
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

      // confirmação via GET — deve retornar 404
      await request(app.getHttpServer())
        .get(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('❌ deve impedir usuário comum de deletar com 403', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .delete(`/equipments/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`) // role USER
        .expect(403);
    });

    it('❌ deve retornar 401 sem token', async () => {
      const created = await createEquipment();

      await request(app.getHttpServer())
        .delete(`/equipments/${created.id}`)
        .expect(401);
    });

    it('❌ deve retornar 404 ao deletar ID inexistente', async () => {
      // PrismaExceptionFilter mapeia P2025 → 404
      const res = await request(app.getHttpServer())
        .delete('/equipments/id-inexistente')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toBe('Not Found');
    });
  });
});
