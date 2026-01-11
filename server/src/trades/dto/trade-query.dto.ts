import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Direction, TradeStyle } from './create-trade.dto';

export class TradeQueryDto {
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    page?: number = 1;

    @IsNumber()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    limit?: number = 50;

    @IsString()
    @IsOptional()
    startDate?: string;

    @IsString()
    @IsOptional()
    endDate?: string;

    @IsString()
    @IsOptional()
    ticker?: string;

    @IsEnum(Direction)
    @IsOptional()
    direction?: Direction;

    @IsEnum(TradeStyle)
    @IsOptional()
    style?: TradeStyle;

    @IsString()
    @IsOptional()
    sortBy?: string = 'date';

    @IsString()
    @IsOptional()
    sortOrder?: 'asc' | 'desc' = 'desc';
}
