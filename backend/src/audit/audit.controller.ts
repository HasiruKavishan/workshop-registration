import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser, Role, Roles } from '../common/roles';
import { AuditService } from './audit.service';

class AuditQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}

@Controller('audit-logs')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  list(@CurrentUser() user: AuthUser, @Query() q: AuditQuery) {
    return this.audit.list(user.role, q.page, q.pageSize);
  }
}
