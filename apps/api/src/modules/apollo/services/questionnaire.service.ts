import { Injectable, NotFoundException } from '@nestjs/common';
import { QuestionnaireRepository } from '../repositories/questionnaire.repository.js';

@Injectable()
export class QuestionnaireService {
  constructor(private readonly repo: QuestionnaireRepository) {}

  async createQuestionnaire(data: {
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
    return this.repo.create(data);
  }

  async listQuestionnaires(category?: string) {
    return this.repo.findAll(category);
  }

  async getQuestionnaire(id: string) {
    const q = await this.repo.findById(id);
    if (!q) throw new NotFoundException(`Questionnaire ${id} not found`);
    return q;
  }

  async submitAnswers(questionnaireId: string, patientId: string, enrollmentId: string | undefined, answers: Array<{
    questionId: string;
    value: string;
    numericValue?: number;
  }>) {
    const q = await this.getQuestionnaire(questionnaireId);
    const requiredIds = new Set(q.questions.filter((qu) => qu.required).map((qu) => qu.id));
    const answeredIds = new Set(answers.map((a) => a.questionId));
    const missing = [...requiredIds].filter((id) => !answeredIds.has(id));
    if (missing.length > 0) {
      throw new Error(`Missing required questions: ${missing.join(', ')}`);
    }
    return this.repo.submitAnswers(questionnaireId, patientId, enrollmentId, answers);
  }

  async getAnswers(questionnaireId: string, patientId: string) {
    return this.repo.findAnswers(questionnaireId, patientId);
  }
}
