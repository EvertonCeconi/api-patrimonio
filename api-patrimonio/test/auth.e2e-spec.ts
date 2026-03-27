import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const user = {
    name: 'Teste',
    email: 'teste@email.com',
    password: '12345678',
  };

  const getCookie = (res: request.Response) => {
    const raw = res.headers['set-cookie'] as string[];
    return raw?.[0]?.split(';')[0];
  };

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
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  }, 15000);

  // =========================
  // SIGNUP
  // =========================

  it('✅ deve cadastrar usuário', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);
  });

  it('❌ deve falhar sem name', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: user.email, password: user.password })
      .expect(400);
  });

  it('❌ deve falhar com senha curta', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ name: user.name, email: user.email, password: '123' })
      .expect(400);
  });

  // =========================
  // SIGNIN
  // =========================

  it('✅ deve fazer login com sucesso', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send(user);

    const response = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: user.email, password: user.password })
      .expect(201);

    expect(response.body).toHaveProperty('access_token');
  });

  it('❌ deve falhar com senha errada', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send(user);

    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: user.email, password: 'senha_errada' })
      .expect(401);
  });

  it('❌ deve falhar com usuário inexistente', async () => {
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: 'naoexiste@email.com', password: '12345678' })
      .expect(401);
  });

  it('❌ deve falhar sem email', async () => {
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ password: '12345678' })
      .expect(400);
  });

  it('❌ deve falhar sem senha', async () => {
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: user.email })
      .expect(400);
  });

  // =========================
  // REFRESH TOKEN
  // =========================

  it('✅ deve retornar novo access_token com cookie válido', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send(user);

    const signinRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: user.email, password: user.password });

    const cookie = getCookie(signinRes);

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .expect(201);

    expect(refreshRes.body).toHaveProperty('access_token');
  });

  it('❌ deve falhar no refresh sem cookie', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });

  it('✅ deve gerar novo refresh_token a cada refresh (rotation)', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send(user);

    const signinRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: user.email, password: user.password });

    const firstCookie = getCookie(signinRes);

    const firstRefresh = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', firstCookie);

    const secondCookie = getCookie(firstRefresh);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', secondCookie)
      .expect(201);
  });

  // =========================
  // LOGOUT
  // =========================

  it('✅ deve fazer logout e invalidar o token', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send(user);

    const signinRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: user.email, password: user.password });

    const cookie = getCookie(signinRes);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('✅ deve fazer logout mesmo sem cookie', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(201);
  });
});
