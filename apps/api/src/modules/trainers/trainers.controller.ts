import type { Request, Response } from 'express';
import { ListTrainersQueryDto, TrainerIdParamsDto } from './trainers.dto.js';
import { trainerService } from './trainers.service.js';

/**
 * Controller: traduce HTTP ↔ servicio.
 * 1. Arma el DTO de entrada desde req (si los datos son inválidos, el DTO lanza 400).
 * 2. Llama al servicio.
 * 3. Responde con el código HTTP adecuado.
 */
export class TrainerController {
  list = async (req: Request, res: Response) => {
    const query = ListTrainersQueryDto.fromQuery(req.query);
    const result = await trainerService.list(query);
    res.json(result);
  };

  getById = async (req: Request, res: Response) => {
    const { id } = TrainerIdParamsDto.fromParams(req.params);
    const trainer = await trainerService.getById(id);
    res.json(trainer);
  };
}

export const trainerController = new TrainerController();
