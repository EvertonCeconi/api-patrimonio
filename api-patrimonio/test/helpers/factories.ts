import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/prisma/prisma.service';

export interface UserData {
  name: string;
  email: string;
  password: string;
}

export interface CreatedUser {
  token: string;
  user: UserData & { id: string };
}

export async function createAdmin(
  app: INestApplication,
  overrides?: Partial<UserData>,
): Promise<CreatedUser> {
  const data: UserData = {
    name: 'Admin Teste',
    email: `admin-${randomUUID().slice(0, 8)}@test.com`,
    password: '12345678',
    ...overrides,
  };

  const signupRes = await request(app.getHttpServer())
    .post('/auth/signup')
    .send(data);

  if (signupRes.status !== 201) {
    throw new Error(
      `createAdmin: signup esperava 201, recebeu ${signupRes.status}. Body: ${JSON.stringify(signupRes.body)}`,
    );
  }

  const prisma = app.get(PrismaService);

  const user = await prisma.user.update({
    where: { email: data.email },
    data: { role: 'ADMIN', isActive: true },
  });

  const signinRes = await request(app.getHttpServer())
    .post('/auth/signin')
    .send({ email: data.email, password: data.password });

  return {
    token: signinRes.body.access_token,
    user: { ...data, id: user.id },
  };
}

export async function createRegularUser(
  app: INestApplication,
  overrides?: Partial<UserData>,
): Promise<CreatedUser> {
  const data: UserData = {
    name: 'Usuário Comum',
    email: `user-${randomUUID().slice(0, 8)}@test.com`,
    password: '12345678',
    ...overrides,
  };

  const signupRes = await request(app.getHttpServer())
    .post('/auth/signup')
    .send(data);

  if (signupRes.status !== 201) {
    throw new Error(
      `createRegularUser: signup esperava 201, recebeu ${signupRes.status}. Body: ${JSON.stringify(signupRes.body)}`,
    );
  }

  const prisma = app.get(PrismaService);

  const user = await prisma.user.update({
    where: { email: data.email },
    data: { isActive: true },
  });

  const signinRes = await request(app.getHttpServer())
    .post('/auth/signin')
    .send({ email: data.email, password: data.password });

  return {
    token: signinRes.body.access_token,
    user: { ...data, id: user.id },
  };
}
