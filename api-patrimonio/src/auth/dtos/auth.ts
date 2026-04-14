import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class SignUpDto {
  @IsString()
  @MinLength(2, {
    context: { min: 2 },
  })
  @MaxLength(100, {
    context: { max: 100 },
  })
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, {
    context: { min: 8 },
  })
  @MaxLength(72, {
    context: { max: 72 },
  }) // limite do bcrypt
  password: string;
}

export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, {
    context: { min: 8 },
  })
  @MaxLength(72, {
    context: { max: 72 },
  })
  @IsNotEmpty()
  password: string;
}
