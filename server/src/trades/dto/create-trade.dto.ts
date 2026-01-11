import {
    IsString,
    IsNumber,
    IsOptional,
    IsDateString,
    IsEnum,
    ValidateNested,
    IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum Direction {
    Long = 'Long',
    Short = 'Short',
}

export enum TradeStyle {
    Scalping = 'Scalping',
    Intraday = 'Intraday',
    Intraweek = 'Intraweek',
    Swing = 'Swing',
}

export enum TdaCondition {
    met = 'met',
    not_met = 'not_met',
    partial = 'partial',
}

export class TdaItemDto {
    @IsString()
    label: string;

    @IsEnum(TdaCondition)
    condition: TdaCondition;

    @IsString()
    @IsOptional()
    note?: string;
}

export class CreateTradeDto {
    @IsDateString()
    date: string;

    @IsDateString()
    entryDate: string;

    @IsDateString()
    @IsOptional()
    exitDate?: string;

    @IsString()
    ticker: string;

    @IsEnum(Direction)
    direction: Direction;

    @IsEnum(TradeStyle)
    @IsOptional()
    style?: TradeStyle;

    @IsNumber()
    @IsOptional()
    risk?: number;

    @IsNumber()
    pnl: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TdaItemDto)
    @IsOptional()
    tda?: TdaItemDto[];
}
