import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as BaseAuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthGuard extends BaseAuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      // Log de l'erreur pour déboguer
      console.log('Erreur d\'authentification :', err);
      console.log('Utilisateur non trouvé dans la requête :', user);
      
      throw new UnauthorizedException('Accès refusé, authentification requise');
    }
    return user;
  }
}