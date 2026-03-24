import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Equipments (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let jwtService: JwtService;

  const user = {
    name: 'Teste Equip',
    email: 'equip@test.com',
    password: '12345678',
  };

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

    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    jwtService = app.get(JwtService);

    await request(app.getHttpServer()).post('/auth/signup').send(user);

    const res = await request(app.getHttpServer()).post('/auth/signin').send({
      email: user.email,
      password: user.password,
    });

    accessToken = res.body.access_token;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  }, 15000);

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

  it('✅ deve acessar rota protegida com token', async () => {
    const res = await request(app.getHttpServer())
      .get('/equipments')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual({
      message: 'rota protegida!',
    });
  });
});
