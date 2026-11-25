import { HttpError } from '../../lib/http-error.js';
import type { PaginatedResponseDto } from '../../lib/pagination.js';
import { ListUsersQueryDto, UserResponseDto } from './users.dto.js';
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
}

export const userService = new UserService();
