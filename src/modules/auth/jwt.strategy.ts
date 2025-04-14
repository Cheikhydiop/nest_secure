import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { id: number; role: string; structure?: string }) {
    const { id: userId, role, structure } = payload;
  
    // Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },  // Utilisation de 'id' pour rechercher l'utilisateur
    });
  
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }
  
    const roleEntity =
      role === 'admin'
        ? await this.prisma.admin.findUnique({ where: { user_id: userId } })
        : await this.prisma.agent.findUnique({ where: { user_id: userId } });
  
    if (!roleEntity) {
      throw new UnauthorizedException(`${role} non trouvé`);
    }
  
    return {
      id: userId,  // Utilisation de 'id' ici aussi
      role,
      phone: user.phone,
      structure,
    };
  }
  
  
}
