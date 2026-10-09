import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser, FRONT_OFFICE, Roles } from '../common/roles';
import { CancelRegistrationDto, ListRegistrationsQuery, RegisterAttendeeDto } from './registrations.dto';
import { RegistrationsService } from './registrations.service';

@Controller()
@Roles(...FRONT_OFFICE)
export class RegistrationsController {
  constructor(private regs: RegistrationsService) {}

  @Get('workshops/:id/registrations')
  list(@Param('id', ParseUUIDPipe) id: string, @Query() q: ListRegistrationsQuery) {
    return this.regs.listForWorkshop(id, q.status);
  }

  @Post('workshops/:id/registrations')
  register(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RegisterAttendeeDto, @CurrentUser() actor: AuthUser) {
    return this.regs.register(id, dto, actor);
  }

  @Post('registrations/:id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelRegistrationDto, @CurrentUser() actor: AuthUser) {
    return this.regs.cancel(id, dto.reason, actor);
  }
}
