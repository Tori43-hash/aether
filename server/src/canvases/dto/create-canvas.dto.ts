// Create Canvas DTO

import { IsNotEmpty, IsOptional, IsString, Allow } from 'class-validator';

export class CreateCanvasDto {
    @IsNotEmpty()
    @IsString()
    name!: string;

    // Use @Allow() to skip transformation - preserves raw JSON structure
    @IsOptional()
    @Allow()
    strokes?: unknown[];

    @IsOptional()
    @Allow()
    texts?: unknown[];

    @IsOptional()
    @Allow()
    transform?: {
        scale: number;
        offset: { x: number; y: number };
    };
}
