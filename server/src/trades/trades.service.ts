import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTradeDto, UpdateTradeDto, TradeQueryDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TradesService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string, query: TradeQueryDto) {
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            ticker,
            direction,
            style,
            sortBy = 'date',
            sortOrder = 'desc',
        } = query;

        const where: Prisma.TradeWhereInput = {
            userId,
            ...(startDate && {
                date: {
                    gte: new Date(startDate),
                    ...(endDate && { lte: new Date(endDate) }),
                },
            }),
            ...(ticker && { ticker: { contains: ticker, mode: 'insensitive' } }),
            ...(direction && { direction }),
            ...(style && { style }),
        };

        const [trades, total] = await Promise.all([
            this.prisma.trade.findMany({
                where,
                include: { tdaItems: true },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.trade.count({ where }),
        ]);

        return {
            data: trades.map(this.formatTrade),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number, userId: string) {
        const trade = await this.prisma.trade.findUnique({
            where: { id },
            include: { tdaItems: true },
        });

        if (!trade) {
            throw new NotFoundException(`Trade with ID ${id} not found`);
        }

        if (trade.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return this.formatTrade(trade);
    }

    async create(userId: string, dto: CreateTradeDto) {
        const trade = await this.prisma.trade.create({
            data: {
                date: new Date(dto.date),
                entryDate: new Date(dto.entryDate),
                exitDate: dto.exitDate ? new Date(dto.exitDate) : null,
                ticker: dto.ticker.toUpperCase(),
                direction: dto.direction,
                style: dto.style,
                risk: dto.risk ?? 1.0,
                pnl: dto.pnl,
                userId,
                tdaItems: dto.tda
                    ? {
                        create: dto.tda.map((item) => ({
                            label: item.label,
                            condition: item.condition,
                            note: item.note,
                        })),
                    }
                    : undefined,
            },
            include: { tdaItems: true },
        });

        return this.formatTrade(trade);
    }

    async bulkCreate(userId: string, dtos: CreateTradeDto[]) {
        const results = await Promise.all(
            dtos.map((dto) => this.create(userId, dto)),
        );
        return results;
    }

    async update(id: number, userId: string, dto: UpdateTradeDto) {
        // Check ownership
        const existing = await this.prisma.trade.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Trade with ID ${id} not found`);
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        // If updating TDA items, delete existing and create new
        if (dto.tda) {
            await this.prisma.tdaItem.deleteMany({ where: { tradeId: id } });
        }

        const trade = await this.prisma.trade.update({
            where: { id },
            data: {
                ...(dto.date && { date: new Date(dto.date) }),
                ...(dto.entryDate && { entryDate: new Date(dto.entryDate) }),
                ...(dto.exitDate !== undefined && {
                    exitDate: dto.exitDate ? new Date(dto.exitDate) : null,
                }),
                ...(dto.ticker && { ticker: dto.ticker.toUpperCase() }),
                ...(dto.direction && { direction: dto.direction }),
                ...(dto.style !== undefined && { style: dto.style }),
                ...(dto.risk !== undefined && { risk: dto.risk }),
                ...(dto.pnl !== undefined && { pnl: dto.pnl }),
                ...(dto.tda && {
                    tdaItems: {
                        create: dto.tda.map((item) => ({
                            label: item.label,
                            condition: item.condition,
                            note: item.note,
                        })),
                    },
                }),
            },
            include: { tdaItems: true },
        });

        return this.formatTrade(trade);
    }

    async remove(id: number, userId: string) {
        const existing = await this.prisma.trade.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Trade with ID ${id} not found`);
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        await this.prisma.trade.delete({ where: { id } });

        return { message: 'Trade deleted successfully' };
    }

    private formatTrade(trade: any) {
        return {
            id: trade.id,
            date: trade.date.toISOString().split('T')[0],
            entryDate: trade.entryDate.toISOString().replace('.000Z', '').replace('T', 'T'),
            exitDate: trade.exitDate?.toISOString().replace('.000Z', '').replace('T', 'T'),
            ticker: trade.ticker,
            direction: trade.direction,
            style: trade.style,
            risk: trade.risk,
            pnl: trade.pnl,
            tda: trade.tdaItems?.map((item: any) => ({
                label: item.label,
                condition: item.condition === 'not_met' ? 'not-met' : item.condition,
                note: item.note,
            })),
        };
    }
}
