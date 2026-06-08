// contact-support.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AuthUser } from '@shared/decorators/authUser.decorator';

import { ContactSupportQueryDto, ContactSupportStatus, CreateContactSupportDto } from 'src/types/enums';
import { ContactSupportService } from '../services/contact-support.service';

@ApiTags('Contact Support')
@Controller('v1/contact-support')
export class ContactSupportController {
  constructor(private readonly contactSupportService: ContactSupportService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a contact support request' })
  create(@Body() dto: CreateContactSupportDto, @AuthUser() user?: any) {
    return this.contactSupportService.create(dto, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-requests')
  @ApiOperation({ summary: 'Get current user contact requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  getUserRequests(@AuthUser() user: any, @Query() query: ContactSupportQueryDto) {
    return this.contactSupportService.getUserRequests(user.email, query);
  }

  // ── Admin routes ──────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all contact requests (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ContactSupportStatus })
  getAllRequests(@Query() query: ContactSupportQueryDto) {
    return this.contactSupportService.getAllRequests(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get single contact request' })
  @ApiParam({ name: 'id', type: String })
  getById(@Param('id') id: string) {
    return this.contactSupportService.getById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update contact request status (Admin)' })
  @ApiParam({ name: 'id', type: String })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ContactSupportStatus,
  ) {
    return this.contactSupportService.updateStatus(id, status);
  }
}