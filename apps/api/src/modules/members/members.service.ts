import { HttpError } from '../../lib/http-error.js';
import { memberRepository } from './members.repository.js';

export class MemberService {
  /**
   * Verifica que el alumno pertenezca al entrenador.
   * Alumno inexistente → 404. Alumno de otro entrenador (o sin entrenador) → 403.
   */
  async assertTrainerOwnsMember(trainerId: string, memberId: string): Promise<void> {
    const assignment = await memberRepository.findTrainerAssignment(memberId);
    if (!assignment) throw HttpError.notFound('Alumno no encontrado');
    if (assignment.trainerId !== trainerId) {
      throw HttpError.forbidden('Este alumno no pertenece a tu grupo');
    }
  }
}

export const memberService = new MemberService();
