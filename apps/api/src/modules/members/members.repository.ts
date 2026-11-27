import { prisma } from '../../db/prisma.js';

export class MemberRepository {
  /**
   * Devuelve el entrenador asignado al alumno (puede ser null si todavía no eligió),
   * o null si el alumno no existe.
   */
  findTrainerAssignment(memberId: string): Promise<{ trainerId: string | null } | null> {
    return prisma.memberProfile.findUnique({
      where: { userId: memberId },
      select: { trainerId: true },
    });
  }
}

export const memberRepository = new MemberRepository();
