import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto, Type_Login } from '../../common/dto/login.dto';
import { TwilioService } from '../../common/twilio/twilio.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private twilioService: TwilioService,
  ) {}

  async login(loginDto: LoginDto) {
    const { type_login, email, password, code_pin, phone, empreinte, otp } = loginDto;

    // Connexion par email et mot de passe pour l'interface web
    if (type_login === Type_Login.WEB) {
      if (!email || !password) {
        throw new BadRequestException('Email et mot de passe requis pour la connexion web');
      }

      const admin = await this.prisma.admin.findUnique({
        where: { email },
        include: { user: true },
      });

      if (!admin) {
        throw new UnauthorizedException('Identifiants invalides');
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Mot de passe incorrect');
      }

      return this.generateToken(admin.user.id, 'admin', admin.structure);
    } 
    // Connexion mobile
    else if (type_login === Type_Login.MOBILE) {
      if (empreinte) {
        const agent = await this.prisma.agent.findFirst({
          where: { empreinte },
          include: { user: true },
        });

        if (!agent) {
          throw new UnauthorizedException('Empreinte non reconnue');
        }

        return this.generateToken(agent.user.id, agent.role, null);
      }
      
      else if (code_pin && phone) {
        const user = await this.prisma.user.findUnique({
          where: { phone },
        });

        if (!user) {
          throw new UnauthorizedException('Utilisateur non trouvé');
        }

        const agent = await this.prisma.agent.findUnique({
          where: { user_id: user.id },
        });

        if (!agent) {
          throw new UnauthorizedException("Cet utilisateur n'est pas un agent");
        }

        if (agent.code_pin !== code_pin) {
          throw new UnauthorizedException('Code PIN incorrect');
        }

        // Génération de l'OTP
        const otpGenerated = this.generateOtp();
        const otpExpiresAt = new Date(Date.now() + 60 * 1000); // Expire dans 1 minute

        // Sauvegarde de l'OTP et de son expiration dans la base de données
        await this.prisma.user.update({
          where: { phone },
          data: {
            otp: otpGenerated,
            otpExpiresAt,
          },
        });

        const formattedPhone = this.formatPhoneNumber(phone);
        const hash = 'FA+T3ZLk28V'; 

        const message = `Votre code de vérification est : ${otpGenerated}\n<#> G_Secure: ${otpGenerated}\n${hash}`;


       await this.twilioService.sendSms(formattedPhone, message);
        return {
          message: 'OTP envoyé. Veuillez vérifier votre téléphone.',
          otpRequired: true,  
        };
      }
      
      else if (otp && phone) {
        const user = await this.prisma.user.findUnique({
          where: { phone },
        });

        if (!user) {
          throw new UnauthorizedException('Utilisateur non trouvé');
        }

        // Vérification de l'OTP
        if (!user.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
          throw new UnauthorizedException('OTP expiré');
        }

        if (user.otp !== otp) {
          throw new UnauthorizedException('OTP invalide');
        }

        await this.prisma.user.update({
          where: { phone },
          data: {
            otp: null,
            otpExpiresAt: null,
          },
        });

        const agent = await this.prisma.agent.findUnique({
          where: { user_id: user.id },
        });

        if (!agent) {
          throw new UnauthorizedException("Cet utilisateur n'est pas un agent");
        }

        return this.generateToken(user.id, agent.role, null);
      }
      
      else {
        throw new BadRequestException('Informations de connexion mobile incomplètes');
      }
    }

    throw new UnauthorizedException('Type de login non reconnu');
  }

  // Nouvelle méthode pour formater les numéros de téléphone
  private formatPhoneNumber(phone: string): string {
    // Si le numéro commence déjà par +, on le retourne tel quel
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Si le numéro commence par 221, on ajoute juste le +
    if (phone.startsWith('221')) {
      return `+${phone}`;
    }
    
    // Sinon, on ajoute le code pays du Sénégal
    return `+221${phone}`;
  }

  private generateToken(userId: number, role: string, structure: string | null) {
    const payload = { id: userId, role, structure };
    return {
      token: this.jwtService.sign(payload),
    };
  }

  // Génération d'un OTP à 6 chiffres
  private generateOtp(): string {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
  }
}