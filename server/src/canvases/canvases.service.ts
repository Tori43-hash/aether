import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// Inline interfaces instead of DTO classes
interface CreateCanvasData {
    name: string;
    strokes?: unknown[];
    texts?: unknown[];
    transform?: { scale: number; offset: { x: number; y: number } };
}

interface UpdateCanvasData {
    name?: string;
    strokes?: unknown[];
    texts?: unknown[];
    transform?: { scale: number; offset: { x: number; y: number } };
    thumbnail?: string;
}

@Injectable()
export class CanvasesService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string) {
        const canvases = await this.prisma.canvas.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                thumbnail: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return canvases.map((c) => ({
            id: c.id,
            name: c.name,
            thumbnail: c.thumbnail,
            createdAt: c.createdAt.getTime(),
            updatedAt: c.updatedAt.getTime(),
        }));
    }

    async findOne(id: string, userId: string) {
        const canvas = await this.prisma.canvas.findUnique({
            where: { id },
        });

        if (!canvas) {
            throw new NotFoundException(`Canvas with ID ${id} not found`);
        }

        if (canvas.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return {
            id: canvas.id,
            name: canvas.name,
            strokes: canvas.strokes,
            texts: canvas.texts,
            transform: canvas.transform,
            thumbnail: canvas.thumbnail,
            createdAt: canvas.createdAt.getTime(),
            updatedAt: canvas.updatedAt.getTime(),
        };
    }

    async create(userId: string, dto: CreateCanvasData) {
        const canvas = await this.prisma.canvas.create({
            data: {
                name: dto.name || `Холст ${new Date().toLocaleDateString('ru-RU')}`,
                strokes: (dto.strokes ?? []) as Prisma.InputJsonValue,
                texts: (dto.texts ?? []) as Prisma.InputJsonValue,
                transform: (dto.transform ?? { scale: 1, offset: { x: 0, y: 0 } }) as Prisma.InputJsonValue,
                userId,
            },
        });

        return {
            id: canvas.id,
            name: canvas.name,
            strokes: canvas.strokes,
            texts: canvas.texts,
            transform: canvas.transform,
            thumbnail: canvas.thumbnail,
            createdAt: canvas.createdAt.getTime(),
            updatedAt: canvas.updatedAt.getTime(),
        };
    }

    async update(id: string, userId: string, dto: UpdateCanvasData) {
        const existing = await this.prisma.canvas.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Canvas with ID ${id} not found`);
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const canvas = await this.prisma.canvas.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.strokes !== undefined && { strokes: dto.strokes as Prisma.InputJsonValue }),
                ...(dto.texts !== undefined && { texts: dto.texts as Prisma.InputJsonValue }),
                ...(dto.transform !== undefined && { transform: dto.transform as Prisma.InputJsonValue }),
                ...(dto.thumbnail !== undefined && { thumbnail: dto.thumbnail }),
            },
        });

        return {
            id: canvas.id,
            name: canvas.name,
            strokes: canvas.strokes,
            texts: canvas.texts,
            transform: canvas.transform,
            thumbnail: canvas.thumbnail,
            createdAt: canvas.createdAt.getTime(),
            updatedAt: canvas.updatedAt.getTime(),
        };
    }

    async remove(id: string, userId: string) {
        const existing = await this.prisma.canvas.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Canvas with ID ${id} not found`);
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException('Access denied');
        }

        await this.prisma.canvas.delete({
            where: { id },
        });

        return { deleted: true };
    }
}
