import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Role } from '@modules/core/entities/role.entity';
import { Permission as PermissionEntity } from '@modules/core/entities/permission.entity';
import { User } from '@modules/core/entities/user.entity';
import { Admin } from '@modules/core/entities/admin.entity';

import { HashingUtil } from '@shared/utils/hashing/hashing.utils';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { EmailService } from '@modules/email/email.service';
import { UserStatus } from '../../../types/enums';
import { Permission as PermissionEnum } from '../../../types/enums/permission.enums';

import { AssignRoleDto, InviteAdminDto, UpdateRoleDto, UserByRoleQueryDto } from '../dtos/roles.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(PermissionEntity) private readonly permissionRepo: Repository<PermissionEntity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    private readonly hashingUtil: HashingUtil,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly emailService: EmailService,
  ) {}

  // ─── Roles ─────────────────────────────────────────────────────────────────

  async getRoles() {
    return this.roleRepo.find({
      relations: ['permissions'],
      order: { createdAt: 'ASC' },
    });
  }

  async getRoleById(id: string) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');

    // Rename (guard against duplicates)
    if (dto.name && dto.name !== role.name) {
      const conflict = await this.roleRepo.findOne({ where: { name: dto.name } });
      if (conflict && conflict.id !== id)
        throw new ConflictException('A role with this name already exists');
      role.name = dto.name;
      await this.roleRepo.save(role);
    }

    // Replace the permission set
    if (dto.permissions) {
      const validNames = new Set(Object.values(PermissionEnum) as string[]);
      const invalid = dto.permissions.filter((p) => !validNames.has(p));
      if (invalid.length)
        throw new BadRequestException(`Unknown permission(s): ${invalid.join(', ')}`);

      await this.permissionRepo.delete({ roleId: role.id });

      const rows = dto.permissions.map((name) =>
        this.permissionRepo.create({ name, roleId: role.id, status: true }),
      );
      await this.permissionRepo.save(rows);
    }

    return this.getRoleById(id);
  }

  // ─── Permissions ─────────────────────────────────────────────────────────────

  /** Catalog of all assignable permissions (from the enum) — used to build the role editor UI */
  getPermissions() {
    return (Object.values(PermissionEnum) as string[]).map((name) => ({ name }));
  }

  async getPermissionById(id: string) {
    const perm = await this.permissionRepo.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!perm) throw new NotFoundException('Permission not found');
    return perm;
  }

  // ─── Assign role to a user or an admin ───────────────────────────────────────

  async assignRole(dto: AssignRoleDto) {
    const role = await this.roleRepo.findOne({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    // Try admin first, fall back to user
    const admin = await this.adminRepo.findOne({ where: { id: dto.userId } });
    if (admin) {
      admin.roleId = role.id;
      admin.role = role.name;
      await this.adminRepo.save(admin);
      return { id: admin.id, role: role.name, type: 'admin' };
    }

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    user.roleId = role.id;
    user.role = role.name as any; // user.role is typed as UserRole enum
    await this.userRepo.save(user);
    return { id: user.id, role: role.name, type: 'user' };
  }

  // ─── Invite an admin (provisioned with a temp password, emailed) ─────────────

  async inviteAdmin(creatorId: string, dto: InviteAdminDto) {
    const existing = await this.adminRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const role = await this.roleRepo.findOne({ where: { name: dto.role } });
    if (!role) throw new NotFoundException('Role not found');

    const tempPassword = this.randomnessUtil.generateRandomStringWithNumbers(10);
    const hashedPassword = await this.hashingUtil.hash(tempPassword);

    const admin = await this.adminRepo.save(
      this.adminRepo.create({
        email: dto.email,
        firstName: dto.first_name,
        lastName: dto.last_name,
        fullName: `${dto.first_name} ${dto.last_name}`,
        roleId: role.id,
        role: role.name,
        password: hashedPassword,
        isEmailVerified: true, // provisioned by an existing admin
        status: UserStatus.ACTIVE,
        createdBy: creatorId,
      }),
    );

    // Best-effort email — don't fail the invite if delivery hiccups
    try {
      await this.emailService.send({
        to: dto.email,
        subject: 'Your Tru Booker admin account',
        html: `
          <p>Hi ${dto.first_name},</p>
          <p>An admin account has been created for you with the role
             <strong>${role.name}</strong>.</p>
          <p>Temporary password: <strong>${tempPassword}</strong></p>
          <p>Please log in and change it immediately.</p>
        `,
      });
    } catch {
      /* logged inside EmailService */
    }

    return {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      status: admin.status,
    };
  }

  // ─── Group users by role (counts) ────────────────────────────────────────────

  async groupUsersByRole() {
    const roles = await this.roleRepo.find({ order: { name: 'ASC' } });
    return Promise.all(
      roles.map(async (r) => ({
        roleId: r.id,
        role: r.name,
        userCount: await this.userRepo.count({ where: { roleId: r.id } }),
      })),
    );
  }

  // ─── Paginated users (searchable, optional role filter) ──────────────────────

  async getUsersByRole(query: UserByRoleQueryDto) {
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roletru', 'role')
      .orderBy('u.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.role) {
      qb.andWhere('u.role = :role', { role: query.role });
    }

    if (query.search) {
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        count: data.length,
        previousPage: page > 1 ? page - 1 : false,
        nextPage: skip + limit < total ? page + 1 : false,
        pageCount: Math.ceil(total / limit),
        totalRecords: total,
      },
    };
  }
}