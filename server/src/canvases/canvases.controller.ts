import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { CanvasesService } from './canvases.service';
import { JwtAuthGuard } from '../auth/guards';

interface RequestWithUser extends Request {
    user: { id: string; email: string };
}

// Raw DTO interfaces (no class-transformer)
interface CreateCanvasBody {
    name: string;
    strokes?: unknown[];
    texts?: unknown[];
    transform?: { scale: number; offset: { x: number; y: number } };
}

interface UpdateCanvasBody {
    name?: string;
    strokes?: unknown[];
    texts?: unknown[];
    transform?: { scale: number; offset: { x: number; y: number } };
    thumbnail?: string;
}

@Controller('canvases')
@UseGuards(JwtAuthGuard)
export class CanvasesController {
    constructor(private canvasesService: CanvasesService) { }

    @Get()
    findAll(@Req() req: RequestWithUser) {
        return this.canvasesService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
        return this.canvasesService.findOne(id, req.user.id);
    }

    @Post()
    create(@Body() body: CreateCanvasBody, @Req() req: RequestWithUser) {
        return this.canvasesService.create(req.user.id, body);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() body: UpdateCanvasBody,
        @Req() req: RequestWithUser,
    ) {
        return this.canvasesService.update(id, req.user.id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: RequestWithUser) {
        return this.canvasesService.remove(id, req.user.id);
    }
}
