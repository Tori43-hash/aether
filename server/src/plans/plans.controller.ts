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
    ParseIntPipe,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';

interface RequestWithUser extends Request {
    user: { id: string; email: string };
}

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
    constructor(private plansService: PlansService) { }

    @Get()
    findAll(@Req() req: RequestWithUser) {
        return this.plansService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
        return this.plansService.findOne(id, req.user.id);
    }

    @Post()
    create(@Body() dto: CreatePlanDto, @Req() req: RequestWithUser) {
        return this.plansService.create(req.user.id, dto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePlanDto,
        @Req() req: RequestWithUser,
    ) {
        return this.plansService.update(id, req.user.id, dto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
        return this.plansService.remove(id, req.user.id);
    }
}
