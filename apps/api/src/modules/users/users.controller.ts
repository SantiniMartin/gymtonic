import type { Request, Response } from 'express';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto, UserIdParamsDto } from './users.dto.js';
import { userService } from './users.service.js';

export class UserController {
  list = async (req: Request, res: Response) => {
    const query = ListUsersQueryDto.fromQuery(req.query);
    const result = await userService.list(query);
    res.json(result);
  };

  getById = async (req: Request, res: Response) => {
    const { id } = UserIdParamsDto.fromParams(req.params);
    const user = await userService.getById(id);
    res.json(user);
  };

  create = async (req: Request, res: Response) => {
    const dto = CreateUserDto.fromBody(req.body);
    const user = await userService.create(dto, req.user!.id);
    res.status(201).json(user);
  };

  update = async (req: Request, res: Response) => {
    const { id } = UserIdParamsDto.fromParams(req.params);
    const dto = UpdateUserDto.fromBody(req.body);
    const user = await userService.update(id, dto, req.user!.id);
    res.json(user);
  };
}

export const userController = new UserController();
