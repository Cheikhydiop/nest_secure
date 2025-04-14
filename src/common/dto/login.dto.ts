import { IsString, IsNotEmpty, IsEnum, IsOptional, ValidateIf } from 'class-validator';

export enum Type_Login {
  WEB = 'WEB',
  MOBILE = 'MOBILE'
}

export class LoginDto {
  @IsEnum(Type_Login, { message: "Type de login invalide, valeurs acceptées: WEB, MOBILE" })
  @IsNotEmpty({ message: "Le type de login est requis" })
  type_login: Type_Login;

  // Champs pour login WEB
  @ValidateIf(o => o.type_login === Type_Login.WEB)
  @IsNotEmpty({ message: "L'email est requis" })
  @IsString()
  email?: string;

  @ValidateIf(o => o.type_login === Type_Login.WEB)
  @IsNotEmpty({ message: "Le mot de passe est requis" })
  @IsString()
  password?: string;

  // Numéro de téléphone (requis pour PIN et OTP)
  @ValidateIf(o => o.type_login === Type_Login.MOBILE && !o.empreinte)
  @IsNotEmpty({ message: "Le numéro de téléphone est requis pour la connexion mobile" })
  @IsString()
  phone?: string;

  // Champs pour login MOBILE (par code PIN)
  @ValidateIf(o => o.type_login === Type_Login.MOBILE && !o.empreinte && !o.otp)
  @IsNotEmpty({ message: "Le code PIN est requis pour ce type de connexion mobile" })
  @IsString()
  code_pin?: string;

  // Champ pour login MOBILE (par empreinte)
  @ValidateIf(o => o.type_login === Type_Login.MOBILE && !o.code_pin && !o.otp)
  @IsNotEmpty({ message: "L'empreinte est requise pour ce type de connexion mobile" })
  @IsString()
  empreinte?: string;

  // Champ pour la vérification de l'OTP
  @ValidateIf(o => o.type_login === Type_Login.MOBILE && !o.code_pin && !o.empreinte)
  @IsString()
  otp?: string;
}