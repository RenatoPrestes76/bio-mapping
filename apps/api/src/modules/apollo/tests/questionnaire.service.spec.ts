import { NotFoundException } from '@nestjs/common';
import { QuestionnaireService } from '../services/questionnaire.service.js';

const questions = [
  { id: 'q-1', text: 'Você tem histórico de doença cardíaca?', questionType: 'YES_NO', required: true, order: 1 },
  { id: 'q-2', text: 'Nível de atividade física atual', questionType: 'SCALE', required: false, order: 2 },
];

const questionnaire = {
  id: 'q-form-1',
  title: 'PAR-Q',
  description: 'Physical Activity Readiness Questionnaire',
  category: 'FITNESS',
  questions,
  createdAt: new Date(),
};

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn().mockResolvedValue(questionnaire),
  findAll: jest.fn().mockResolvedValue([questionnaire]),
  findById: jest.fn().mockResolvedValue(questionnaire),
  submitAnswers: jest.fn().mockResolvedValue({ id: 'ans-set-1' }),
  findAnswers: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('QuestionnaireService', () => {
  let service: QuestionnaireService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    repo = makeRepo();
    service = new QuestionnaireService(repo as never);
  });

  describe('createQuestionnaire', () => {
    it('creates and returns questionnaire', async () => {
      const result = await service.createQuestionnaire({
        title: 'PAR-Q',
        category: 'FITNESS',
        createdBy: 'user-1',
        questions: [{ text: 'Você tem histórico?', questionType: 'YES_NO', required: true, order: 1 }],
      });
      expect(result).toBe(questionnaire);
    });
  });

  describe('listQuestionnaires', () => {
    it('returns all questionnaires', async () => {
      const result = await service.listQuestionnaires();
      expect(result).toEqual([questionnaire]);
    });

    it('passes category filter', async () => {
      await service.listQuestionnaires('FITNESS');
      expect(repo.findAll).toHaveBeenCalledWith('FITNESS');
    });
  });

  describe('getQuestionnaire', () => {
    it('returns questionnaire when found', async () => {
      const result = await service.getQuestionnaire('q-form-1');
      expect(result).toBe(questionnaire);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getQuestionnaire('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('submitAnswers', () => {
    const answers = [
      { questionId: 'q-1', value: 'Não' },
      { questionId: 'q-2', value: '3', numericValue: 3 },
    ];

    it('submits answers when all required questions answered', async () => {
      const result = await service.submitAnswers('q-form-1', 'patient-1', undefined, answers);
      expect(result).toEqual({ id: 'ans-set-1' });
      expect(repo.submitAnswers).toHaveBeenCalled();
    });

    it('throws when required question is missing', async () => {
      const partialAnswers = [{ questionId: 'q-2', value: '3' }]; // missing q-1 (required)
      await expect(
        service.submitAnswers('q-form-1', 'patient-1', undefined, partialAnswers),
      ).rejects.toThrow('Missing required questions');
    });

    it('succeeds when only optional questions missing', async () => {
      const onlyRequired = [{ questionId: 'q-1', value: 'Sim' }];
      const result = await service.submitAnswers('q-form-1', 'patient-1', undefined, onlyRequired);
      expect(result).toEqual({ id: 'ans-set-1' });
    });

    it('passes enrollmentId when provided', async () => {
      await service.submitAnswers('q-form-1', 'patient-1', 'enroll-1', answers);
      expect(repo.submitAnswers).toHaveBeenCalledWith('q-form-1', 'patient-1', 'enroll-1', answers);
    });
  });

  describe('getAnswers', () => {
    it('returns answers from repo', async () => {
      repo.findAnswers.mockResolvedValue([{ id: 'a-1', value: 'Não' }]);
      const result = await service.getAnswers('q-form-1', 'patient-1');
      expect(result).toHaveLength(1);
    });
  });
});
