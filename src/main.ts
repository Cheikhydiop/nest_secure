import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Active express.json() pour analyser le corps de la requête
  app.use(express.json());

  // Affiche les logs avant d'initier la validation
  app.use((req, res, next) => {
    console.log('Request body:', req.body); // 🔍 Affiche le corps brut de la requête
    next();
  });



  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true, // Transforme les données reçues en type attendu
    }),
  );
  

  const config = new DocumentBuilder()
    .setTitle('API G-Secure')
    .setDescription('Documentation de l’API de gestion des securite physique')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  
  app.enableCors({
    origin: '*', // En production, limitez aux domaines spécifiques
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();


