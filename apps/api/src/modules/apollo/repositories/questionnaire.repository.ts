import { Injectable } from '@nestjs/common';
import { Prisma } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class QuestionnaireRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    title: string;
    description?: string;
    category?: string;
    createdBy: string;
    questions: Array<{
      text: string;
      questionType: string;
      required?: boolean;
      order: number;
      options?: unknown;
      minValue?: number;
      maxValue?: number;
      unit?: string;
    }>;
  }) {
    const { questions, ...qData } = data;
    return this.prisma.questionnaire.create({
      data: {
        ...qData,
        questions: {
          create: questions.map((q) => ({ ...q, options: q.options as Prisma.InputJsonValue | undefined })),
        },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll(category?: string) {
    return this.prisma.questionnaire.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      include: { questions: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.questionnaire.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async submitAnswers(questionnaireId: string, patientId: string, enrollmentId: string | undefined, answers: Array<{
    questionId: string;
    value: string;
    numericValue?: number;
  }>) {
    return this.prisma.answer.createManyAndReturn({
      data: answers.map((a) => ({ questionnaireId, patientId, enrollmentId, ...a })),
    });
  }

  async findAnswers(questionnaireId: string, patientId: string) {
    return this.prisma.answer.findMany({
      where: { questionnaireId, patientId },
      include: { question: { select: { text: true, questionType: true, order: true } } },
      orderBy: { answeredAt: 'desc' },
    });
  }
}
