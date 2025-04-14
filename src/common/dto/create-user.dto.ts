export enum Type_Login {
    WEB = 'WEB',
    MOBILE = 'MOBILE'
  }
  
  import { IsString, IsOptional, IsEnum, IsEmail, MinLength, IsNotEmpty, ValidateIf } from 'class-validator';
  import { Agent_Role } from '@prisma/client';
  
  export class CreateUserDto {
    @IsString()
    @MinLength(2)
    nom: string;
  
    @IsString()
    @MinLength(2)
    prenom: string;
  
    @IsString()
    @MinLength(9)
    phone: string;
  
    @IsEnum(Type_Login)
    @IsNotEmpty()
    type_login: Type_Login; // MOBILE ou WEB
  
    // Champs pour les utilisateurs de type WEB (admin)
    @ValidateIf(o => o.type_login === Type_Login.WEB)
    @IsNotEmpty({ message: 'La structure est requise pour les utilisateurs web' })
    @IsString()
    structure?: string;
  
    @ValidateIf(o => o.type_login === Type_Login.WEB)
    @IsNotEmpty({ message: 'L\'email est requis pour les utilisateurs web' })
    @IsEmail()
    email?: string;
  
    @ValidateIf(o => o.type_login === Type_Login.WEB)
    @IsNotEmpty({ message: 'Le mot de passe est requis pour les utilisateurs web' })
    @IsString()
    @MinLength(6)
    password?: string;
  
    // Champs pour les utilisateurs de type MOBILE (agent)
    @ValidateIf(o => o.type_login === Type_Login.MOBILE)
    @IsNotEmpty({ message: 'L\'empreinte est requise pour les utilisateurs mobile' })
    @IsString()
    empreint?: string;
  
    @ValidateIf(o => o.type_login === Type_Login.MOBILE)
    @IsNotEmpty({ message: 'Le code PIN est requis pour les utilisateurs mobile' })
    @IsString()
    code_pine?: string;
  
    @ValidateIf(o => o.type_login === Type_Login.MOBILE)
    @IsEnum(Agent_Role)
    @IsOptional()
    role?: Agent_Role; // Valeur par défaut sera 'agent_simple'
  }