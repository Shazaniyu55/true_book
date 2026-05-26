import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { ContactSupportService } from '../services/contact-support.service';

import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CreateContactSupportUseCase } from '../usecases/create-support.usecase';
import { GetContactSupportUseCase } from '../usecases/get-support.usecase';
import { UpdateContactSupportUseCase } from '../usecases/update-support.usecase';
import { ContactSupportResponseDto, CreateContactSupportDto, UpdateContactSupportDto } from '../dtos/dto';
import { ContactSupportStatus, UserRole } from 'src/types/enums';
import { ServiceName } from '@shared/decorators/servicename.decorators';

@ServiceName('contact-support') // For kill switch targeting
@ApiTags('Contact Support')
@Controller('v1/contact-support')
export class ContactSupportController {
  constructor(
    private readonly createContactSupportUseCase: CreateContactSupportUseCase,
    private readonly getContactSupportUseCase: GetContactSupportUseCase,
    private readonly updateContactSupportUseCase: UpdateContactSupportUseCase,
    private readonly contactSupportService: ContactSupportService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new contact support request' })
  @ApiResponse({
    status: 201,
    description: 'Support request created successfully',
    type: ContactSupportResponseDto,
  })
  async create(@Body() dto: CreateContactSupportDto) {
    return this.createContactSupportUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contact support requests' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of support requests',
  })
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.contactSupportService.getAllContactSupports(page, limit);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact support statistics' })
  @ApiResponse({
    status: 200,
    description: 'Support statistics',
  })
  async getStatistics() {
    return this.contactSupportService.getStatistics();
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact support requests by status' })
  @ApiParam({
    name: 'status',
    enum: ContactSupportStatus,
    description: 'Status filter',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  async getByStatus(
    @Param('status') status: ContactSupportStatus,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.contactSupportService.getContactSupportsByStatus(status, page, limit);
  }

  @Get('user-type/:userType')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact support requests by user type' })
  @ApiParam({
    name: 'userType',
    enum: UserRole,
    description: 'User type filter',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  async getByUserType(
    @Param('userType') userType: UserRole,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.contactSupportService.getContactSupportsByUserType(userType, page, limit);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending contact support requests' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  async getPending(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.contactSupportService.getPendingRequests(page, limit);
  }

  @Get('email/:email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact support requests by email' })
  @ApiParam({
    name: 'email',
    description: 'Email address',
  })
  async getByEmail(@Param('email') email: string) {
    return this.contactSupportService.getContactSupportsByEmail(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific contact support request' })
  @ApiParam({
    name: 'id',
    description: 'Support request ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Support request details',
    type: ContactSupportResponseDto,
  })
  async getById(@Param('id') id: string) {
    return this.getContactSupportUseCase.execute(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a contact support request' })
  @ApiParam({
    name: 'id',
    description: 'Support request ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Support request updated successfully',
    type: ContactSupportResponseDto,
  })
  async update(@Param('id') id: string, @Body() dto: UpdateContactSupportDto) {
    return this.updateContactSupportUseCase.execute(id, dto);
  }

  @Put(':id/status/:status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update contact support request status' })
  @ApiParam({
    name: 'id',
    description: 'Support request ID',
  })
  @ApiParam({
    name: 'status',
    enum: ContactSupportStatus,
    description: 'New status',
  })
  async updateStatus(
    @Param('id') id: string,
    @Param('status') status: ContactSupportStatus,
  ) {
    return this.contactSupportService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact support request' })
  @ApiParam({
    name: 'id',
    description: 'Support request ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Support request deleted successfully',
  })
  async delete(@Param('id') id: string) {
    return this.contactSupportService.deleteContactSupport(id);
  }
}