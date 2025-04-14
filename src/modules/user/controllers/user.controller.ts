import { Controller, Post, Body, Get, Query,UseGuards } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../../../common/dto/create-user.dto';
import { User } from '../../../common/decorators/user.decorator';
import { AuthGuard } from '../../../common/guards/auth.guard'; 



@Controller('api')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto) {
    console.log('Body reçu:', createUserDto); 
    return await this.userService.createUser(createUserDto);
  }

  @Get('agents')
  async getAgents(
    @Query('page') page: string = '1',   
    @Query('limit') limit: string = '10'  // Par défaut la limite est 10
  ) {
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);

    const agents = await this.userService.listerAgentsAvecInfos(pageInt, limitInt);
    return {
      data: agents.data,
      pagination: {
        total: agents.total,
        page: agents.page,
        perPage: agents.perPage,
        lastPage: agents.lastPage,
        from: agents.from,
        to: agents.to,
        hasNextPage: agents.hasNextPage,
        hasPreviousPage: agents.hasPreviousPage,
      },
    };
  }

  @Get('admins')
  async getAdmins(
    @Query('page') page: string = '1',   // Par défaut la première page
    @Query('limit') limit: string = '10'  // Par défaut la limite est 10
  ) {
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);

    const admins = await this.userService.listerAdminsAvecInfos(pageInt, limitInt);
    return {
      data: admins.data,
      pagination: {
        total: admins.total,
        page: admins.page,
        perPage: admins.perPage,
        lastPage: admins.lastPage,
        from: admins.from,
        to: admins.to,
        hasNextPage: admins.hasNextPage,
        hasPreviousPage: admins.hasPreviousPage,
      },
    };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMonProfil(@User() user) {
    return this.userService.getProfil(user);
  }
}
