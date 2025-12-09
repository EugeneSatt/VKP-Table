import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'https://vkp-table-production.up.railway.app', // фронт на Railway
      'http://localhost:3000',                        // для локальной разработки
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}

bootstrap();

