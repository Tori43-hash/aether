import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
    ParseIntPipe,
} from '@nestjs/common';
import { TradesService } from './trades.service';
import { CreateTradeDto, UpdateTradeDto, TradeQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';

interface RequestWithUser extends Request {
    user: { id: string; email: string };
}

@Controller('trades')
@UseGuards(JwtAuthGuard)
export class TradesController {
    constructor(private tradesService: TradesService) { }

    @Get()
    findAll(@Req() req: RequestWithUser, @Query() query: TradeQueryDto) {
        return this.tradesService.findAll(req.user.id, query);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
        return this.tradesService.findOne(id, req.user.id);
    }

    @Post()
    create(@Body() dto: CreateTradeDto, @Req() req: RequestWithUser) {
        return this.tradesService.create(req.user.id, dto);
    }

    @Post('bulk')
    bulkCreate(@Body() dtos: CreateTradeDto[], @Req() req: RequestWithUser) {
        return this.tradesService.bulkCreate(req.user.id, dtos);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTradeDto,
        @Req() req: RequestWithUser,
    ) {
        return this.tradesService.update(id, req.user.id, dto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
        return this.tradesService.remove(id, req.user.id);
    }
}
