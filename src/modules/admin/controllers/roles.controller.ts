import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { PermissionsGuard } from '@shared/guards/permissions.guard';
import { AdminOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';

import { RolesService } from '../services/roles.service';
import { AssignRoleDto, InviteAdminDto, UpdateRoleDto, UserByRoleQueryDto } from '../dtos/roles.dto';

@ServiceName('admin')
@ApiTags('Admin - Roles & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('v1/admin')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @AdminOnly()
  @Get('get-roles')
  @ApiOperation({ summary: 'List all roles with their permissions' })
  getRoles() {
    return this.rolesService.getRoles();
  }

  @AdminOnly()
  @Get('get-role-by-id/:id')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiParam({ name: 'id', type: String })
  getRoleById(@Param('id') id: string) {
    return this.rolesService.getRoleById(id);
  }

  @AdminOnly()
  @Put('update-roles/:id')
  @ApiOperation({ summary: 'Update a role name and/or its permissions' })
  @ApiParam({ name: 'id', type: String })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }

  @AdminOnly()
  @Get('get-permissions')
  @ApiOperation({ summary: 'List the catalog of assignable permissions' })
  getPermissions() {
    return this.rolesService.getPermissions();
  }

  @AdminOnly()
  @Get('get-permission-by-id/:id')
  @ApiOperation({ summary: 'Get a permission record by ID' })
  @ApiParam({ name: 'id', type: String })
  getPermissionById(@Param('id') id: string) {
    return this.rolesService.getPermissionById(id);
  }

  @AdminOnly()
  @Post('assign-role-to-user')
  @ApiOperation({ summary: 'Assign a role to a user or admin' })
  assignRole(@Body() dto: AssignRoleDto) {
    return this.rolesService.assignRole(dto);
  }

  @AdminOnly()
  @Post('invite-admin')
  @ApiOperation({ summary: 'Invite (create) an admin with a role' })
  inviteAdmin(@Body() dto: InviteAdminDto, @AuthUser() user: any) {
    return this.rolesService.inviteAdmin(user.sub, dto);
  }

  @AdminOnly()
  @Get('group-users-by-role')
  @ApiOperation({ summary: 'User counts grouped by role' })
  groupUsersByRole() {
    return this.rolesService.groupUsersByRole();
  }

  @AdminOnly()
  @Get('user-by-role')
  @ApiOperation({ summary: 'Paginated, searchable users with their role' })
  getUsersByRole(@Query() query: UserByRoleQueryDto) {
    return this.rolesService.getUsersByRole(query);
  }
}