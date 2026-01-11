import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TradesModule } from './trades/trades.module';
import { PlansModule } from './plans/plans.module';
import { CanvasesModule } from './canvases/canvases.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    TradesModule,
    PlansModule,
    CanvasesModule,
  ],
})
export class AppModule { }
