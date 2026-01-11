import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthService, Tokens } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';
import { JwtAuthGuard } from './guards';

interface RequestWithUser extends Request {
    user: { id: string; email: string; name?: string; avatar?: string };
}

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() dto: RegisterDto): Promise<Tokens> {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto): Promise<Tokens> {
        return this.authService.login(dto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshDto): Promise<Tokens> {
        return this.authService.refresh(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@Req() req: RequestWithUser) {
        return req.user;
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: RequestWithUser) {
        await this.authService.logout(req.user.id);
        return { message: 'Logged out successfully' };
    }
}
