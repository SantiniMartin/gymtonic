import { HttpError } from '../../lib/http-error.js';
import type { PaginatedResponseDto } from '../../lib/pagination.js';
import { hashPassword } from '../../lib/password.js';
import { CreateUserDto, ListUsersQueryDto, UserResponseDto } from './users.dto.js';
import { userRepository } from './users.repository.js';

export class UserService {
  async list(query: ListUsersQueryDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const { pagination, role, status, search } = query;

    const { items, total } = await userRepository.findMany({
      role,
      status,
      search,
      skip: pagination.skip,
      take: pagination.pageSize,
    });

    return {
      items: items.map(UserResponseDto.fromEntity),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getById(id: string): Promise<UserResponseDto> {
    const user = await userRepository.findById(id);
    if (!user) throw HttpError.notFound('Usuario no encontrado');
    return UserResponseDto.fromEntity(user);
  }

  async create(dto: CreateUserDto, actorId: string): Promise<UserResponseDto> {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw HttpError.conflict('Ya existe un usuario con ese email');

    const passwordHash = await hashPassword(dto.password);
    const user = await userRepository.create(
      {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
      },
      actorId,
    );

    return UserResponseDto.fromEntity(user);
  }
}

export const userService = new UserService();
