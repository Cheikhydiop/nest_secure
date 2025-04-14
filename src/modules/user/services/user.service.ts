import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateUserDto } from '../../../common/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { paginateOrFindAll as paginate } from '../../../common/utils/pagination.helper'; 

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // Créer un utilisateur
  async createUser(createUserDto: CreateUserDto) {
    const { nom, prenom, phone, type_login, structure, email, password, empreint, code_pine, role } = createUserDto;

    if (!nom || !prenom || !phone || !type_login) {
      throw new BadRequestException('Les champs nom, prenom, phone et type_login sont requis');
    }

    // Création de l'utilisateur de base
    const user = await this.prisma.user.create({
      data: {
        nom,
        prenom,
        phone,
      },
    });

    if (type_login === 'WEB') {
      // Vérification des champs requis pour un admin
      if (!structure || !email || !password) {
        throw new BadRequestException('Les champs structure, email et password sont requis pour un admin');
      }

      // Hachage du mot de passe pour l'admin
      const hashedPassword = await bcrypt.hash(password, 10);

      // Création de l'admin lié à l'utilisateur
      const admin = await this.prisma.admin.create({
        data: {
          user_id: user.id,
          structure,
          email,
          password: hashedPassword,
        },
      });

      return {
        ...user,
        admin,
      };
    }

    if (type_login === 'MOBILE') {
      // Vérification des champs requis pour un agent
      if (!empreint || !code_pine) {
        throw new BadRequestException('Les champs empreint et code_pine sont requis pour un agent');
      }

      // Création de l'agent lié à l'utilisateur
      const agent = await this.prisma.agent.create({
        data: {
          user_id: user.id,
          empreinte: empreint,
          code_pin: code_pine,
          role: role || 'agent_simple',
        },
      });

      return {
        ...user,
        agent,
      };
    }

    return user;
  }

  async listerAgentsAvecInfos(page: number, limit: number) {
    return paginate(this.prisma, 'agent', {
      page,
      limit,
      findOptions: {
        include: {
          user: true,
        },
      },
    });
  }

  // Lister les admins avec pagination
  async listerAdminsAvecInfos(page: number, limit: number) {
    return paginate(this.prisma, 'admin', {
      page,
      limit,
      findOptions: {
        include: {
          user: true,
        },
      },
    });
  }


  async getProfil(user: { id: number; role: string }) {
    const { id, role } = user;
  
    const userData = await this.prisma.user.findUnique({
      where: { id },
      include: {
        admin: role === 'admin',
        agent: role !== 'admin',
      },
    });
  
    if (!userData) {
      throw new BadRequestException("Utilisateur introuvable");
    }
  
    return userData;
  }
  
}
