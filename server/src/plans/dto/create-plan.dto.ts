import { IsString, IsOptional } from 'class-validator';

export class CreatePlanDto {
    @IsString()
    ticker: string;

    @IsString()
    @IsOptional()
    image?: string;

    @IsString()
    @IsOptional()
    desc?: string;
}
