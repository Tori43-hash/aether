import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';

@Injectable()
export class PlansService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string) {
        const plans = await this.prisma.plan.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return plans.map(this.formatPlan);
    }

    async findOne(id: number, userId: string) {
        const plan = await this.prisma.plan.findUnique({
            where: { id },
        });

        if (!plan) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }

        if (plan.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return this.formatPlan(plan);
    }

    async create(userId: string, dto: CreatePlanDto) {
        const plan = await this.prisma.plan.create({
            data: {
                ticker: dto.ticker.toUpperCase(),
                image: dto.image,
                desc: dto.desc,
                userId,
            },
        });

        return this.formatPlan(plan);
    }

    async update(id: number, userId: string, dto: UpdatePlanDto) {
        const existing = await this.prisma.plan.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const plan = await this.prisma.plan.update({
            where: { id },
            data: {
                ...(dto.ticker && { ticker: dto.ticker.toUpperCase() }),
                ...(dto.image !== undefined && { image: dto.image }),
                ...(dto.desc !== undefined && { desc: dto.desc }),
            },
        });

        return this.formatPlan(plan);
    }

    async remove(id: number, userId: string) {
        const existing = await this.prisma.plan.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        await this.prisma.plan.delete({ where: { id } });

        return { message: 'Plan deleted successfully' };
    }

    private formatPlan(plan: any) {
        return {
            id: plan.id,
            ticker: plan.ticker,
            image: plan.image,
            desc: plan.desc,
            createdAt: plan.createdAt.toISOString(),
        };
    }
}
