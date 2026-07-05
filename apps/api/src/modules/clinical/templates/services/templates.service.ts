import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../../common/audit/audit-log.service';
import { paginated, PaginatedResponse } from '../../../../common/dto/pagination.dto';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { CreateSectionDto } from '../dto/create-section.dto';
import { CreateFieldDto } from '../dto/create-field.dto';
import { FilterTemplatesDto } from '../dto/filter-templates.dto';
import { TemplateResponseDto, toTemplateResponse } from '../dto/template-response.dto';

interface Actor { sub: string; role: string }

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async create(dto: CreateTemplateDto, actor: Actor, context: AuditContext): Promise<TemplateResponseDto> {
    if (actor.role === 'PATIENT') throw new ForbiddenException('Pacientes não podem criar templates');

    const template = await this.prisma.assessmentTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        organizationId: dto.organizationId ?? null,
        createdBy: actor.sub,
        scoringEngine: dto.scoringEngine ?? 'weighted-sum',
        scoringConfig: dto.scoringConfig ? (dto.scoringConfig as object) : undefined,
        isActive: dto.isActive ?? true,
      },
      include: { sections: { include: { fields: true } } },
    });

    await this.audit.log('TEMPLATE_CREATED', { ...context, userId: actor.sub, metadata: { templateId: template.id } });
    return toTemplateResponse(template as any);
  }

  async findAll(dto: FilterTemplatesDto, actor: Actor): Promise<PaginatedResponse<TemplateResponseDto>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (dto.category) where.category = dto.category;
    if (dto.organizationId) where.organizationId = dto.organizationId;
    if (dto.isActive !== undefined) where.isActive = dto.isActive;

    // PATIENT only sees active templates
    if (actor.role === 'PATIENT') where.isActive = true;

    const [templates, total] = await this.prisma.$transaction([
      this.prisma.assessmentTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { sections: { include: { fields: true } } },
      }),
      this.prisma.assessmentTemplate.count({ where }),
    ]);

    return paginated(templates.map((t) => toTemplateResponse(t as any)), total, page, limit);
  }

  async findOne(id: string): Promise<TemplateResponseDto> {
    const template = await this.prisma.assessmentTemplate.findFirst({
      where: { id, deletedAt: null },
      include: { sections: { include: { fields: true } } },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    return toTemplateResponse(template as any);
  }

  async update(id: string, dto: UpdateTemplateDto, actor: Actor, context: AuditContext): Promise<TemplateResponseDto> {
    if (actor.role === 'PATIENT') throw new ForbiddenException();
    const template = await this.prisma.assessmentTemplate.findFirst({ where: { id, deletedAt: null } });
    if (!template) throw new NotFoundException('Template não encontrado');

    const updated = await this.prisma.assessmentTemplate.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category && { category: dto.category }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.scoringEngine && { scoringEngine: dto.scoringEngine }),
        ...(dto.scoringConfig !== undefined && { scoringConfig: dto.scoringConfig as object }),
        version: { increment: 1 },
      },
      include: { sections: { include: { fields: true } } },
    });

    await this.audit.log('TEMPLATE_UPDATED', { ...context, userId: actor.sub, metadata: { templateId: id } });
    return toTemplateResponse(updated as any);
  }

  async remove(id: string, actor: Actor, context: AuditContext): Promise<void> {
    if (actor.role === 'PATIENT') throw new ForbiddenException();
    const template = await this.prisma.assessmentTemplate.findFirst({ where: { id, deletedAt: null } });
    if (!template) throw new NotFoundException('Template não encontrado');

    await this.prisma.assessmentTemplate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.audit.log('TEMPLATE_DELETED', { ...context, userId: actor.sub, metadata: { templateId: id } });
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  async addSection(templateId: string, dto: CreateSectionDto, actor: Actor): Promise<void> {
    if (actor.role === 'PATIENT') throw new ForbiddenException();
    const template = await this.prisma.assessmentTemplate.findFirst({ where: { id: templateId, deletedAt: null } });
    if (!template) throw new NotFoundException('Template não encontrado');

    const maxOrder = await this.prisma.assessmentSection.count({ where: { templateId } });
    await this.prisma.assessmentSection.create({
      data: { templateId, title: dto.title, description: dto.description, order: dto.order ?? maxOrder },
    });
    await this.prisma.assessmentTemplate.update({ where: { id: templateId }, data: { version: { increment: 1 } } });
  }

  async updateSection(sectionId: string, dto: CreateSectionDto, actor: Actor): Promise<void> {
    if (actor.role === 'PATIENT') throw new ForbiddenException();
    const section = await this.prisma.assessmentSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Seção não encontrada');
    await this.prisma.assessmentSection.update({
      where: { id: sectionId },
      data: { title: dto.title, description: dto.description, ...(dto.order !== undefined && { order: dto.order }) },
    });
  }

  async removeSection(sectionId: string, actor: Actor): Promise<void> {
    if (actor.role === 'PATIENT') throw new ForbiddenException();
    const section = await this.prisma.assessmentSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Seção não encontrada');
    await this.prisma.assessmentSection.delete({ where: { id: sectionId } });
  }

  // ── Fields ──────────────────────────────────────────────────────────────

  async addField(sectionId: string, dto: CreateFieldDto, actor: Actor): Promise<void> {
    if (actor.role === 'PATIENT') throw new ForbiddenException();
    const section = await this.prisma.assessmentSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Seção não encontrada');

    const maxOrder = await this.prisma.assessmentField.count({ where: { sectionId } });
    await this.prisma.assessmentField.create({
      data: {
        sectionId,
        label: dto.label,
        description: dto.description,
        placeholder: dto.placeholder,
        fieldType: dto.fieldType,
        required: dto.required ?? false,
        order: dto.order ?? maxOrder,
        min: dto.min,
        max: dto.max,
        unit: dto.unit,
        defaultValue: dto.defaultValue,
        options: dto.options ? (dto.options as object) : undefined,
        validationRules: dto.validationRules ? (dto.validationRules as object) : undefined,
        scoringWeight: dto.scoringWeight,
      },
    });
  }

  async updateField(fieldId: string, dto: CreateFieldDto, actor: Actor): Promise<void> {
    if (actor.role === 'PATIENT') throw new ForbiddenException();
    const field = await this.prisma.assessmentField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Campo não encontrado');
    await this.prisma.assessmentField.update({
      where: { id: fieldId },
      data: {
        label: dto.label,
        description: dto.description,
        placeholder: dto.placeholder,
        fieldType: dto.fieldType,
        required: dto.required,
        order: dto.order,
        min: dto.min,
        max: dto.max,
        unit: dto.unit,
        defaultValue: dto.defaultValue,
        options: dto.options as any,
        validationRules: dto.validationRules as any,
        scoringWeight: dto.scoringWeight,
      },
    });
  }

  async removeField(fieldId: string, actor: Actor): Promise<void> {
    if (actor.role === 'PATIENT') throw new ForbiddenException();
    const field = await this.prisma.assessmentField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Campo não encontrado');
    await this.prisma.assessmentField.delete({ where: { id: fieldId } });
  }
}
