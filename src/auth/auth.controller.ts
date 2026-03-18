import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SignInDto, SignUpDto } from './dtos/auth';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() body: SignUpDto) {
    return this.authService.signUp(body); // ← retorna o resultado do service
  }

  @Post('signin')
  @HttpCode(200) // ← POST retorna 201 por padrão, signin deve ser 200
  async signIn(@Body() body: SignInDto) {
    return this.authService.signIn(body);
  }
}
