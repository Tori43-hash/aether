import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(dto: RegisterDto): Promise<Tokens> {
        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                name: dto.name,
            },
        });

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email);
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    async login(dto: LoginDto): Promise<Tokens> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

        if (!passwordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(user.id, user.email);
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    async refresh(dto: RefreshDto): Promise<Tokens> {
        try {
            const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(
                dto.refreshToken,
                {
                    secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                },
            );

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user || !user.refreshToken) {
                throw new ForbiddenException('Access denied');
            }

            const tokenValid = await bcrypt.compare(dto.refreshToken, user.refreshToken);

            if (!tokenValid) {
                throw new ForbiddenException('Access denied');
            }

            const tokens = await this.generateTokens(user.id, user.email);
            await this.updateRefreshToken(user.id, tokens.refreshToken);

            return tokens;
        } catch {
            throw new ForbiddenException('Access denied');
        }
    }

    async logout(userId: string): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
        });
    }

    private async generateTokens(userId: string, email: string): Promise<Tokens> {
        const payload = { sub: userId, email };
        const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'fallback';
        const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'fallback';
        // Use numeric seconds: 15 minutes = 900, 7 days = 604800
        const accessExpires = 900;
        const refreshExpires = 604800;

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: accessSecret,
                expiresIn: accessExpires,
            }),
            this.jwtService.signAsync(payload, {
                secret: refreshSecret,
                expiresIn: refreshExpires,
            }),
        ]);

        return { accessToken, refreshToken };
    }

    private async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: hashedToken },
        });
    }
}
