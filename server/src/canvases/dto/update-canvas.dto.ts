// Update Canvas DTO

import { IsOptional, IsString, Allow } from 'class-validator';

export class UpdateCanvasDto {
    @IsOptional()
    @IsString()
    name?: string;

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

    @IsOptional()
    @IsString()
    thumbnail?: string;
}
