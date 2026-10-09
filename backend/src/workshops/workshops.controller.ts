import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser, FRONT_OFFICE, Role, Roles } from '../common/roles';
import { CreateWorkshopDto, ListWorkshopsQuery, UpdateWorkshopDto } from './workshops.dto';
import { WorkshopsService } from './workshops.service';

@Controller('workshops')
export class WorkshopsController {
  constructor(private workshops: WorkshopsService) {}

  @Get() @Roles(...FRONT_OFFICE)
  list(@Query() q: ListWorkshopsQuery) {
    return this.workshops.list(q);
  }

  @Get(':id') @Roles(...FRONT_OFFICE)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.workshops.findOne(id);
  }

  @Post() @Roles(Role.MANAGER)
  create(@Body() dto: CreateWorkshopDto, @CurrentUser() actor: AuthUser) {
    return this.workshops.create(dto, actor);
  }

  @Patch(':id') @Roles(Role.MANAGER)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkshopDto, @CurrentUser() actor: AuthUser) {
    return this.workshops.update(id, dto, actor);
  }
}
