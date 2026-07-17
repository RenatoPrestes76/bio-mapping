import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { CareProgramService } from '../services/care-program.service.js';
import { EnrollmentService } from '../services/enrollment.service.js';
import { TaskEngineService } from '../services/task-engine.service.js';
import { MilestoneService } from '../services/milestone.service.js';
import { ClinicalNoteService } from '../services/clinical-note.service.js';
import { QuestionnaireService } from '../services/questionnaire.service.js';
import { ApolloDashboardService } from '../services/apollo-dashboard.service.js';
import { MilestoneStatus, ProgramCategory, ProgramStatus } from '@bio/database';

@UseGuards(JwtAuthGuard)
@Controller('apollo')
export class ApolloController {
  constructor(
    private readonly programService: CareProgramService,
    private readonly enrollmentService: EnrollmentService,
    private readonly taskEngine: TaskEngineService,
    private readonly milestoneService: MilestoneService,
    private readonly noteService: ClinicalNoteService,
    private readonly questionnaireService: QuestionnaireService,
    private readonly dashboardService: ApolloDashboardService,
  ) {}

  // Dashboard
  @Get('dashboard')
  getDashboard(@CurrentUser() user: { sub: string; patientId?: string }) {
    const patientId = user.patientId ?? user.sub;
    return this.dashboardService.getDashboard(patientId);
  }

  // Programs
  @Get('programs')
  listPrograms(
    @Query('category') category?: ProgramCategory,
    @Query('status') status?: ProgramStatus,
  ) {
    return this.programService.listPrograms({ category, status });
  }

  @Get('programs/:id')
  getProgram(@Param('id') id: string) {
    return this.programService.getProgram(id);
  }

  @Post('programs')
  createProgram(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      name: string;
      description?: string;
      category: ProgramCategory;
      durationDays?: number;
      objectives?: string[];
      completionCriteria?: string;
    },
  ) {
    return this.programService.createProgram({ ...body, createdBy: user.sub });
  }

  @Patch('programs/:id')
  updateProgram(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; status?: ProgramStatus },
  ) {
    return this.programService.updateProgram(id, body);
  }

  @Delete('programs/:id')
  deleteProgram(@Param('id') id: string) {
    return this.programService.deleteProgram(id);
  }

  @Post('programs/:id/phases')
  addPhase(
    @Param('id') programId: string,
    @Body() body: { name: string; description?: string; order: number; durationDays?: number },
  ) {
    return this.programService.addPhase(programId, body);
  }

  // Enrollments
  @Get('enrollments')
  getEnrollments(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Query('status') status?: string,
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.enrollmentService.getEnrollments(patientId, status as never);
  }

  @Get('enrollments/:id')
  getEnrollment(@Param('id') id: string) {
    return this.enrollmentService.getEnrollment(id);
  }

  @Post('enroll')
  enroll(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Body() body: { programId: string; professionalId?: string; notes?: string },
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.enrollmentService.enroll({ ...body, patientId });
  }

  @Patch('enrollments/:id')
  updateEnrollment(
    @Param('id') id: string,
    @Body() body: { status?: string; progressPct?: number; notes?: string },
  ) {
    if (body.status) {
      return this.enrollmentService.updateStatus(id, body.status as never);
    }
    return this.enrollmentService.getEnrollment(id);
  }

  @Get('enrollments/:id/adherence')
  getAdherence(@Param('id') enrollmentId: string) {
    return this.enrollmentService.calculateAdherence(enrollmentId);
  }

  // Tasks
  @Get('tasks/today')
  getTasksForToday(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.taskEngine.getTasksForToday(patientId, enrollmentId);
  }

  @Post('tasks/:id/complete')
  completeTask(
    @Param('id') taskId: string,
    @CurrentUser() user: { sub: string; patientId?: string },
    @Body() body: { value?: number; notes?: string },
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.taskEngine.completeTask(taskId, patientId, body.value, body.notes);
  }

  @Post('tasks/:id/skip')
  skipTask(
    @Param('id') taskId: string,
    @CurrentUser() user: { sub: string; patientId?: string },
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.taskEngine.skipTask(taskId, patientId);
  }

  // Milestones
  @Get('milestones')
  getMilestonesForPatient(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Query('status') status?: MilestoneStatus,
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.milestoneService.getMilestonesForPatient(patientId, status);
  }

  @Get('enrollments/:id/milestones')
  getMilestonesForEnrollment(@Param('id') enrollmentId: string) {
    return this.milestoneService.getMilestones(enrollmentId);
  }

  // Clinical Notes
  @Get('enrollments/:id/notes')
  getNotesByEnrollment(
    @Param('id') enrollmentId: string,
    @Query('includePrivate') includePrivate?: string,
  ) {
    return this.noteService.getNotesByEnrollment(enrollmentId, includePrivate === 'true');
  }

  @Post('enrollments/:id/notes')
  createNote(
    @Param('id') enrollmentId: string,
    @CurrentUser() user: { sub: string; patientId?: string },
    @Body()
    body: {
      patientId: string;
      title: string;
      content: string;
      noteType?: string;
      isPrivate?: boolean;
    },
  ) {
    return this.noteService.createNote({
      enrollmentId,
      professionalId: user.sub,
      ...body,
    });
  }

  @Patch('notes/:id')
  updateNote(
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; noteType?: string; isPrivate?: boolean },
  ) {
    return this.noteService.updateNote(id, body);
  }

  @Delete('notes/:id')
  deleteNote(@Param('id') id: string) {
    return this.noteService.deleteNote(id);
  }

  // Questionnaires
  @Get('questionnaires')
  listQuestionnaires(@Query('category') category?: string) {
    return this.questionnaireService.listQuestionnaires(category);
  }

  @Get('questionnaires/:id')
  getQuestionnaire(@Param('id') id: string) {
    return this.questionnaireService.getQuestionnaire(id);
  }

  @Post('questionnaires')
  createQuestionnaire(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      title: string;
      description?: string;
      category?: string;
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
    },
  ) {
    return this.questionnaireService.createQuestionnaire({ ...body, createdBy: user.sub });
  }

  @Post('questionnaires/:id/submit')
  submitAnswers(
    @Param('id') questionnaireId: string,
    @CurrentUser() user: { sub: string; patientId?: string },
    @Body()
    body: {
      enrollmentId?: string;
      answers: Array<{ questionId: string; value: string; numericValue?: number }>;
    },
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.questionnaireService.submitAnswers(
      questionnaireId,
      patientId,
      body.enrollmentId,
      body.answers,
    );
  }

  @Get('questionnaires/:id/answers')
  getAnswers(
    @Param('id') questionnaireId: string,
    @CurrentUser() user: { sub: string; patientId?: string },
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.questionnaireService.getAnswers(questionnaireId, patientId);
  }
}
