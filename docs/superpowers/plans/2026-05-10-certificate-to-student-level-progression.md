# Certificate → StudentLevelProgression Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the `certificate` DB table into `student_level_progressions` so one entity owns student marks, certificate lifecycle, and PDF path, then delete the Certificate model and all its infrastructure.

**Architecture:** `StudentLevelProgression` gains four new columns (`totalMarks`, `instructorId`, `rejectionReason`, `certificateRequestDate`) and replaces `certificateIssued: boolean` with `certificateStatus: string ('NONE'|'PENDING'|'ISSUED'|'REJECTED')`. `CertificateIssuanceService` keeps its method signatures (controllers unchanged) but swaps its data source from `CertificateRepository` to `StudentLevelProgressionRepository`. `findEligibleByFranchise` raw SQL and franchisee-dashboard raw SQL are updated to query `student_level_progressions`. The `Certificate` model, repository, mapper, domain entity are deleted.

**Tech Stack:** NestJS, Sequelize v7 (`@sequelize/core`), TypeScript, PostgreSQL. Path aliases: `@shared/*` → `src/shared-kernel/*`, `@students/*` → `src/modules/students/*`.

---

## File Map

| File | Change |
|---|---|
| `ipa-new/src/modules/students/infrastructure/persistence/student-level-progression.model.ts` | Add 4 columns; replace `certificateIssued: boolean` → `certificateStatus: string` |
| `ipa-new/src/modules/students/infrastructure/repositories/student-level-progression.repository.ts` | Add certificate query/write methods |
| `ipa-new/src/modules/students/application/services/student-level-progression.service.ts` | Add certificate workflow methods (PDF gen, approve, reject, bulk request) |
| `ipa-new/src/modules/students/students.module.ts` | No change needed |
| `ipa-new/src/modules/certification/application/services/certificate-issuance.service.ts` | Replace all `CertificateRepository` usage with SLP repository/service |
| `ipa-new/src/modules/certification/certification.module.ts` | Remove `CertificateRepository`, import `StudentsModule` exports |
| `ipa-new/src/modules/students/infrastructure/repositories/student.repository.ts` | Update `findEligibleByFranchise` raw SQL |
| `ipa-new/src/modules/franchise-onboarding/application/services/franchisee-dashboard.service.ts` | Update raw SQL to query `student_level_progressions` |
| `ipa-new/src/modules/certification/infrastructure/persistence/index.ts` | Remove Certificate from exports and models array |
| **DELETE** `ipa-new/src/modules/certification/infrastructure/persistence/certificate.model.ts` | |
| **DELETE** `ipa-new/src/modules/certification/infrastructure/repositories/certificate.repository.ts` | |
| **DELETE** `ipa-new/src/modules/certification/infrastructure/mappers/certificate.mapper.ts` | |
| **DELETE** `ipa-new/src/modules/certification/domain/entities/certificate.entity.ts` | |
| `IPA-frontend/services/student-progression.service.ts` | Update interface: `certificateIssued → certificateStatus` |

---

### Task 1: Extend StudentLevelProgression model

**Files:**
- Modify: `ipa-new/src/modules/students/infrastructure/persistence/student-level-progression.model.ts`
- Modify: `IPA-frontend/services/student-progression.service.ts`

- [ ] **Step 1: Replace the model file contents**

```typescript
// ipa-new/src/modules/students/infrastructure/persistence/student-level-progression.model.ts
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
} from '@sequelize/core';
import {
  Attribute,
  AutoIncrement,
  Default,
  NotNull,
  PrimaryKey,
  Table,
} from '@sequelize/core/decorators-legacy';

export type StudentLevelProgressionStatus =
  | 'ENROLLED'
  | 'UNDERGOING'
  | 'COMPLETED'
  | 'FAILED';

export type CertificateStatus = 'NONE' | 'PENDING' | 'ISSUED' | 'REJECTED';

@Table({ tableName: 'student_level_progressions', timestamps: true })
export class StudentLevelProgression extends Model<
  InferAttributes<StudentLevelProgression>,
  InferCreationAttributes<StudentLevelProgression>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: number;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare studentId: number;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare levelId: number;

  @Attribute(DataTypes.STRING)
  @Default('ENROLLED')
  declare status: StudentLevelProgressionStatus;

  @Attribute(DataTypes.DECIMAL(5, 2))
  declare marks: number | null;

  @Attribute(DataTypes.DECIMAL(5, 2))
  declare theoryMarks: number | null;

  @Attribute(DataTypes.DECIMAL(5, 2))
  declare totalMarks: number | null;

  @Attribute(DataTypes.INTEGER)
  declare instructorId: number | null;

  @Attribute(DataTypes.BOOLEAN)
  @Default(false)
  declare materialsOrdered: boolean;

  @Attribute(DataTypes.DATE)
  declare materialsOrderedAt: Date | null;

  @Attribute(DataTypes.DATE)
  declare completedAt: Date | null;

  @Attribute(DataTypes.STRING)
  @Default('NONE')
  declare certificateStatus: CertificateStatus;

  @Attribute(DataTypes.DATE)
  declare certificateRequestDate: Date | null;

  @Attribute(DataTypes.DATE)
  declare certificateIssuedAt: Date | null;

  @Attribute(DataTypes.STRING)
  declare certificatePdfPath: string | null;

  @Attribute(DataTypes.STRING)
  declare rejectionReason: string | null;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare createdBy: number;

  @Attribute(DataTypes.INTEGER)
  declare updatedBy: number | null;
}
```

- [ ] **Step 2: Update the frontend SLP interface**

In `IPA-frontend/services/student-progression.service.ts`, replace the `StudentLevelProgression` interface:

```typescript
export type CertificateStatus = 'NONE' | 'PENDING' | 'ISSUED' | 'REJECTED';

export interface StudentLevelProgression {
  id: number;
  studentId: number;
  levelId: number;
  status: StudentLevelProgressionStatus;
  marks: number | null;
  theoryMarks: number | null;
  totalMarks: number | null;
  instructorId: number | null;
  materialsOrdered: boolean;
  materialsOrderedAt: string | null;
  completedAt: string | null;
  certificateStatus: CertificateStatus;
  certificateRequestDate: string | null;
  certificateIssuedAt: string | null;
  certificatePdfPath: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd ipa-new && npx tsc --noEmit --skipLibCheck
cd IPA-frontend && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd ipa-new && git add src/modules/students/infrastructure/persistence/student-level-progression.model.ts && git commit -m "feat(students): extend StudentLevelProgression with certificate columns"
cd IPA-frontend && git add services/student-progression.service.ts && git commit -m "feat(frontend): update StudentLevelProgression interface for certificate migration"
```

---

### Task 2: Add certificate methods to StudentLevelProgressionRepository

**Files:**
- Modify: `ipa-new/src/modules/students/infrastructure/repositories/student-level-progression.repository.ts`

- [ ] **Step 1: Replace the repository file**

```typescript
// ipa-new/src/modules/students/infrastructure/repositories/student-level-progression.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { Op, Sequelize } from '@sequelize/core';
import { BaseRepository } from '../../../../shared-kernel/repository/base.repository';
import {
  StudentLevelProgression,
  StudentLevelProgressionStatus,
  CertificateStatus,
} from '../persistence/student-level-progression.model';
import { Student } from '../persistence/student.model';
import { PaginationService } from '../../../../shared-kernel/pagination/pagination.service';
import { ListQueryDto } from '../../../../shared-kernel/pagination/pagination.dto';

@Injectable()
export class StudentLevelProgressionRepository extends BaseRepository<
  StudentLevelProgression,
  number
> {
  constructor(
    @Inject('SEQUELIZE') s: Sequelize,
    private readonly pagination: PaginationService,
  ) {
    super(StudentLevelProgression, s);
  }

  async findByStudentAndLevel(
    studentId: number,
    levelId: number,
  ): Promise<StudentLevelProgression | null> {
    return this.findOne({ studentId, levelId } as any);
  }

  async findAllByStudent(studentId: number): Promise<StudentLevelProgression[]> {
    return this.findAll({ where: { studentId } as any } as any);
  }

  /** Returns a map of studentId → progression row for a list of (studentId, levelId) pairs. */
  async findByStudentLevelPairs(
    pairs: Array<{ studentId: number; levelId: number }>,
  ): Promise<Map<number, StudentLevelProgression>> {
    if (!pairs.length) return new Map();
    const studentIds = pairs.map((p) => p.studentId);
    const levelIds = [...new Set(pairs.map((p) => p.levelId))];
    const rows = (await StudentLevelProgression.findAll({
      where: {
        studentId: { [Op.in]: studentIds },
        levelId: { [Op.in]: levelIds },
      } as any,
    } as any)) as StudentLevelProgression[];
    const map = new Map<number, StudentLevelProgression>();
    for (const row of rows) {
      const match = pairs.find(
        (p) => p.studentId === row.studentId && p.levelId === row.levelId,
      );
      if (match) map.set(row.studentId, row);
    }
    return map;
  }

  async setMaterialsOrdered(studentIds: number[], levelIds: number[]): Promise<void> {
    if (!studentIds.length) return;
    await StudentLevelProgression.update(
      { materialsOrdered: true, materialsOrderedAt: new Date() } as any,
      {
        where: {
          studentId: { [Op.in]: studentIds },
          levelId: { [Op.in]: levelIds },
        } as any,
      },
    );
  }

  async updateStatus(
    id: number,
    status: StudentLevelProgressionStatus,
    extra: Partial<Pick<StudentLevelProgression, 'marks' | 'theoryMarks' | 'completedAt' | 'updatedBy'>>,
  ): Promise<void> {
    await StudentLevelProgression.update(
      { status, ...extra } as any,
      { where: { id } as any },
    );
  }

  // ── Certificate methods ─────────────────────────────────────────────────────

  /**
   * Set certificate status to PENDING + enter marks for a batch of students.
   * Matches existing SLP rows by (studentId, levelId).
   */
  async bulkSetCertificatePending(
    entries: Array<{
      studentId: number;
      levelId: number;
      instructorId: number;
      marksObtained: number | null;
      totalMarks: number | null;
      updatedBy: number;
    }>,
  ): Promise<void> {
    if (!entries.length) return;
    await this.sequelize.transaction(async (transaction) => {
      for (const entry of entries) {
        await StudentLevelProgression.update(
          {
            certificateStatus: 'PENDING',
            certificateRequestDate: new Date(),
            marks: entry.marksObtained ?? null,
            totalMarks: entry.totalMarks ?? null,
            instructorId: entry.instructorId,
            updatedBy: entry.updatedBy,
          } as any,
          {
            where: { studentId: entry.studentId, levelId: entry.levelId } as any,
            transaction,
          },
        );
      }
    });
  }

  async setCertificateIssued(
    id: number,
    pdfPath: string,
    adminId: number,
  ): Promise<void> {
    await StudentLevelProgression.update(
      {
        certificateStatus: 'ISSUED',
        certificateIssuedAt: new Date(),
        certificatePdfPath: pdfPath,
        updatedBy: adminId,
      } as any,
      { where: { id } as any },
    );
  }

  async setCertificateRejected(
    id: number,
    reason: string,
    adminId: number,
  ): Promise<void> {
    await StudentLevelProgression.update(
      {
        certificateStatus: 'REJECTED',
        rejectionReason: reason,
        updatedBy: adminId,
      } as any,
      { where: { id } as any },
    );
  }

  /** List certificate-related SLP rows for a franchise (via student join). */
  async listCertificatesForFranchise(franchiseId: string, query: ListQueryDto) {
    const studentIds = await this.studentIdsForFranchise(franchiseId);
    if (!studentIds.length) return this.emptyPage(query);

    const extraWhere: Record<string, unknown> = {
      studentId: { [Op.in]: studentIds },
      certificateStatus: { [Op.ne]: 'NONE' },
    };
    if ((query as any).status) {
      extraWhere.certificateStatus = (query as any).status;
    }

    return this.pagination.paginateWithQuery<StudentLevelProgression>(
      StudentLevelProgression,
      query,
      {
        extraWhere,
        searchFields: [],
        defaultSortField: 'id',
      },
    );
  }

  /** List certificate-related SLP rows for a specific student in a franchise. */
  async listCertificatesForStudent(
    studentId: number,
    franchiseId: string,
    query: ListQueryDto,
  ) {
    const studentIds = await this.studentIdsForFranchise(franchiseId);
    if (!studentIds.includes(studentId)) return this.emptyPage(query);

    return this.pagination.paginateWithQuery<StudentLevelProgression>(
      StudentLevelProgression,
      query,
      {
        staticWhere: { studentId },
        extraWhere: { certificateStatus: { [Op.ne]: 'NONE' } },
        searchFields: [],
        defaultSortField: 'id',
      },
    );
  }

  /** List all certificate-related SLP rows for admin. */
  async listCertificatesForAdmin(query: ListQueryDto) {
    const extraWhere: Record<string, unknown> = {
      certificateStatus: { [Op.ne]: 'NONE' },
    };
    if ((query as any).status) extraWhere.certificateStatus = (query as any).status;

    return this.pagination.paginateWithQuery<StudentLevelProgression>(
      StudentLevelProgression,
      query,
      {
        extraWhere,
        searchFields: [],
        defaultSortField: 'id',
      },
    );
  }

  private async studentIdsForFranchise(franchiseId: string): Promise<number[]> {
    const students = (await Student.findAll({
      where: { franchiseId } as any,
      attributes: ['id'],
    } as any)) as Student[];
    return students.map((s) => s.id);
  }

  private emptyPage(query: ListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return Promise.resolve({ rows: [], total: 0, page, limit });
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ipa-new && npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ipa-new
git add src/modules/students/infrastructure/repositories/student-level-progression.repository.ts
git commit -m "feat(students): add certificate query/write methods to StudentLevelProgressionRepository"
```

---

### Task 3: Move certificate workflow into StudentLevelProgressionService

**Files:**
- Modify: `ipa-new/src/modules/students/application/services/student-level-progression.service.ts`

The service needs PDF generation. Import these — they are already available via `pdf-lib` (used in `certificate-issuance.service.ts`) and `fs`/`path` (Node built-ins). Also inject `LevelRepository`, `StudentsReadFacade`, `FranchiseeRepository` and `StreamTransitionRepository` — these are already exported from their respective modules and available when `StudentsModule` imports `AcademicCatalogModule` and `PartnerIdentityModule`.

- [ ] **Step 1: Replace the service file**

```typescript
// ipa-new/src/modules/students/application/services/student-level-progression.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ErrorException } from '@shared/errors/error-exception';
import { EventPublisher } from '@shared/events/event-publisher';
import { DomainEvent } from '@shared/events/domain-events.enum';
import { CertificateIssuedEvent } from '@shared/events/domain-events.classes';
import { resolveProjectRoot } from '@infra/paths/project-root';
import { ListQueryDto } from '@shared/pagination/pagination.dto';
import { StudentLevelProgressionRepository } from '../../infrastructure/repositories/student-level-progression.repository';
import { StudentLevelProgressionStatus, CertificateStatus } from '../../infrastructure/persistence/student-level-progression.model';
import { StudentsReadFacade } from './students-read.facade';
import { StudentRepository } from '../../infrastructure/repositories/student.repository';
import { LevelRepository } from '../../../academic-catalog/infrastructure/repositories/level.repository';
import { StreamTransitionRepository } from '../../../academic-catalog/infrastructure/repositories/stream-transition.repository';
import { FranchiseeRepository } from '../../../partner-identity/infrastructure/repositories/franchisee.repository';
import { CertificateTemplateRepository } from '../../../certification/infrastructure/repositories/certificate-template.repository';

@Injectable()
export class StudentLevelProgressionService {
  private readonly log = new Logger(StudentLevelProgressionService.name);

  constructor(
    private readonly repo: StudentLevelProgressionRepository,
    private readonly studentsFacade: StudentsReadFacade,
    private readonly studentRepo: StudentRepository,
    private readonly levels: LevelRepository,
    private readonly streamTransitions: StreamTransitionRepository,
    private readonly franchisees: FranchiseeRepository,
    private readonly certTemplates: CertificateTemplateRepository,
    private readonly events: EventPublisher,
  ) {}

  // ── Progression lifecycle ───────────────────────────────────────────────────

  listByStudent(studentId: number) {
    return this.repo.findAllByStudent(studentId);
  }

  getCurrent(studentId: number, levelId: number) {
    return this.repo.findByStudentAndLevel(studentId, levelId);
  }

  async createForLevel(studentId: number, levelId: number, createdBy: number) {
    const existing = await this.repo.findByStudentAndLevel(studentId, levelId);
    if (existing) return existing;
    return this.repo.create({
      studentId,
      levelId,
      status: 'ENROLLED',
      marks: null,
      theoryMarks: null,
      totalMarks: null,
      instructorId: null,
      materialsOrdered: false,
      materialsOrderedAt: null,
      completedAt: null,
      certificateStatus: 'NONE',
      certificateRequestDate: null,
      certificateIssuedAt: null,
      certificatePdfPath: null,
      rejectionReason: null,
      createdBy,
      updatedBy: null,
    } as any);
  }

  async updateMarksAndStatus(
    progressionId: number,
    dto: {
      status?: StudentLevelProgressionStatus;
      marks?: number | null;
      theoryMarks?: number | null;
      updatedBy: number;
    },
  ) {
    const row = await this.repo.findById(progressionId);
    if (!row) throw new ErrorException('NOT_FOUND', 'Progression not found');
    const newStatus = dto.status ?? (row.status as StudentLevelProgressionStatus);
    const completedAt =
      newStatus === 'COMPLETED' && row.status !== 'COMPLETED' ? new Date() : row.completedAt;
    await this.repo.updateStatus(progressionId, newStatus, {
      marks: dto.marks !== undefined ? dto.marks : row.marks,
      theoryMarks: dto.theoryMarks !== undefined ? dto.theoryMarks : row.theoryMarks,
      completedAt,
      updatedBy: dto.updatedBy,
    });
    return this.repo.findById(progressionId);
  }

  async setMaterialsOrdered(pairs: Array<{ studentId: number; levelId: number }>) {
    if (!pairs.length) return;
    await this.repo.setMaterialsOrdered(
      pairs.map((p) => p.studentId),
      pairs.map((p) => p.levelId),
    );
  }

  // ── Certificate workflow ────────────────────────────────────────────────────

  listCertificatesForFranchise(franchiseId: string, query: ListQueryDto) {
    return this.repo.listCertificatesForFranchise(franchiseId, query);
  }

  listCertificatesForStudent(studentId: number, franchiseId: string, query: ListQueryDto) {
    return this.repo.listCertificatesForStudent(studentId, franchiseId, query);
  }

  listCertificatesForAdmin(query: ListQueryDto) {
    return this.repo.listCertificatesForAdmin(query);
  }

  async bulkRequestCertificate(
    franchiseeId: number,
    franchiseId: string,
    dto: {
      programId: number;
      levelId: number;
      courseInstructorId: number;
      students: Array<{ studentId: number; marksObtained?: number; totalMarks?: number }>;
    },
  ) {
    const entries = dto.students.map((s) => ({
      studentId: s.studentId,
      levelId: dto.levelId,
      instructorId: dto.courseInstructorId,
      marksObtained: s.marksObtained ?? null,
      totalMarks: s.totalMarks ?? null,
      updatedBy: franchiseeId,
    }));
    await this.repo.bulkSetCertificatePending(entries);
    return this.repo.listCertificatesForFranchise(franchiseId, {});
  }

  async approveCertificate(progressionId: number, adminId: number) {
    const row = await this.repo.findById(progressionId);
    if (!row) throw new ErrorException('NOT_FOUND', 'Progression not found');
    if (row.certificateStatus !== 'PENDING') {
      throw new ErrorException('INVALID_STATE', 'Certificate is not in Pending state');
    }

    const student = await this.studentsFacade.findById(row.studentId);
    if (!student) throw new ErrorException('NOT_FOUND', 'Student not found');

    const template = await this.certTemplates.findActiveByProgram(student.programId);
    if (!template) throw new ErrorException('NOT_FOUND', 'Certificate template not found');

    const pdfBytes = await this.buildPdfBytesForProgression(row, student, template);
    if (!pdfBytes) throw new ErrorException('INTERNAL', 'PDF generation failed');

    const pdfRelPath = `certificates/progression-${progressionId}.pdf`;
    const absPath = path.join(resolveProjectRoot(), 'uploads', pdfRelPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, pdfBytes);

    await this.repo.setCertificateIssued(progressionId, pdfRelPath, adminId);
    await this.advanceStudentAfterCertificate(row.studentId, row.levelId, student.programId, adminId);

    const issueDate = new Date().toISOString().slice(0, 10);
    const event = new CertificateIssuedEvent(
      progressionId,
      row.studentId,
      student.name ?? '',
      student.email ?? null,
      student.franchiseId,
      row.createdBy,
      student.programId,
      row.levelId,
      issueDate,
      Buffer.from(pdfBytes),
    );
    try {
      await this.events.publish(DomainEvent.CERTIFICATION_CERTIFICATE_ISSUED, event);
    } catch (e) {
      this.log.warn(`certificate-issued event failed for progression ${progressionId}: ${e}`);
    }

    return this.repo.findById(progressionId);
  }

  async rejectCertificate(progressionId: number, reason: string, adminId: number) {
    const row = await this.repo.findById(progressionId);
    if (!row) throw new ErrorException('NOT_FOUND', 'Progression not found');
    if (row.certificateStatus !== 'PENDING') {
      throw new ErrorException('INVALID_STATE', 'Certificate is not in Pending state');
    }
    await this.repo.setCertificateRejected(progressionId, reason, adminId);
    return this.repo.findById(progressionId);
  }

  async buildCertificatePdfBuffer(
    progressionId: number,
    expectedFranchiseId?: string,
  ): Promise<Uint8Array> {
    const row = await this.repo.findById(progressionId);
    if (!row) throw new ErrorException('NOT_FOUND', 'Progression not found');

    const student = await this.studentsFacade.findById(row.studentId);
    if (!student) throw new ErrorException('NOT_FOUND', 'Student not found');
    if (expectedFranchiseId && student.franchiseId !== expectedFranchiseId) {
      throw new ErrorException('NOT_FOUND', 'Progression not found');
    }

    const template = await this.certTemplates.findActiveByProgram(student.programId);
    if (!template) throw new ErrorException('NOT_FOUND', 'Certificate template not found');

    const pdfBytes = await this.buildPdfBytesForProgression(row, student, template);
    if (!pdfBytes) throw new ErrorException('INTERNAL', 'PDF generation failed');
    return pdfBytes;
  }

  private async advanceStudentAfterCertificate(
    studentId: number,
    completedLevelId: number,
    programId: number,
    adminId: number,
  ): Promise<void> {
    const completedLevel = await this.levels.findById(completedLevelId);
    if (!completedLevel) return;
    const nextInStream = await this.levels.findNextAfterDisplayOrder(
      completedLevel.streamId,
      programId,
    );
    if (nextInStream) {
      await this.studentRepo.updateLevel(studentId, nextInStream.id, adminId);
      return;
    }
    const transition = await this.streamTransitions.findOneForProgramFromStream(
      programId,
      completedLevel.streamId,
    );
    if (!transition) return;
    const transitionLevel = await this.levels.findByStreamProgramDisplayOrder(
      transition.toStreamId,
      programId,
      transition.toLevelDisplayOrder,
    );
    if (!transitionLevel) return;
    await this.studentRepo.updateLevel(studentId, transitionLevel.id, adminId);
  }

  private async buildPdfBytesForProgression(
    row: Awaited<ReturnType<StudentLevelProgressionRepository['findById']>>,
    student: { name: string; franchiseId: string; programId: number; levelId: number },
    template: Awaited<ReturnType<CertificateTemplateRepository['findActiveByProgram']>>,
  ): Promise<Uint8Array | null> {
    try {
      const level = await this.levels.findById(row!.levelId);
      const franchisee = await this.franchisees.findById(row!.createdBy);
      const franchiseeRaw = franchisee?.get({ plain: true }) as { name?: string } | undefined;

      const fields: Record<string, string> = {
        student_name: student.name ?? '',
        student_level: level?.name ?? '',
        student_program: String(student.programId),
        franchise_name: student.franchiseId,
        year: String(new Date().getFullYear()),
        franchisee: franchiseeRaw?.name ?? '',
      };

      const templatePath = path.isAbsolute(template!.templatePdfPath)
        ? template!.templatePdfPath
        : path.join(resolveProjectRoot(), 'uploads', template!.templatePdfPath);
      const basePdfBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(basePdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const coords = template!.fieldCoordinates as Record<string, any>;
      const pages = pdfDoc.getPages();

      for (const [key, coord] of Object.entries(coords)) {
        const text = fields[key] ?? '';
        const rect: number[] | undefined = coord.rect;
        const size: number = coord.size ?? 13;
        const pageIndex = (coord.page ?? 1) - 1;
        const page = pages[pageIndex] ?? pages[0];
        let x: number;
        let y: number;
        if (rect && rect.length >= 4) {
          const textWidth = font.widthOfTextAtSize(text, size);
          const rectWidth = rect[2] - rect[0];
          x = rect[0] + (rectWidth - textWidth) / 2;
          const textHeight = font.heightAtSize(size);
          const rectHeight = rect[3] - rect[1];
          y = rect[1] + (rectHeight - textHeight) / 2;
        } else {
          x = coord.x ?? 0;
          y = coord.y ?? 0;
        }
        page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
      }
      return await pdfDoc.save();
    } catch (e) {
      this.log.warn(`PDF generation failed for progression ${row!.id}: ${e}`);
      return null;
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ipa-new && npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ipa-new
git add src/modules/students/application/services/student-level-progression.service.ts
git commit -m "feat(students): add certificate workflow to StudentLevelProgressionService"
```

---

### Task 4: Redirect CertificateIssuanceService to StudentLevelProgressionService

**Files:**
- Modify: `ipa-new/src/modules/certification/application/services/certificate-issuance.service.ts`
- Modify: `ipa-new/src/modules/certification/certification.module.ts`

The controllers (`CertificationFranchiseeController`, `CertificationAdminController`) keep the same routes and inject `CertificateIssuanceService` — so we keep this class but replace its internals.

- [ ] **Step 1: Replace CertificateIssuanceService**

```typescript
// ipa-new/src/modules/certification/application/services/certificate-issuance.service.ts
import { Injectable } from '@nestjs/common';
import { ListQueryDto } from '@shared/pagination/pagination.dto';
import { StudentLevelProgressionService } from '@students/application/services/student-level-progression.service';
import { CITrainingReadFacade } from '@ci-training/application/services/ci-training-read.facade';
import {
  CertificateIneligibleInstructorError,
  CertificateStudentMismatchError,
} from '../certification.errors';
import { BulkCertificateRequestDto } from '../dto/bulk-certificate-request.dto';
import { StudentsReadFacade } from '@students/application/facades/students-read.facade';

@Injectable()
export class CertificateIssuanceService {
  constructor(
    private readonly progression: StudentLevelProgressionService,
    private readonly students: StudentsReadFacade,
    private readonly ciTrainingReads: CITrainingReadFacade,
  ) {}

  listForFranchise(franchiseId: string, query: ListQueryDto = {}) {
    return this.progression.listCertificatesForFranchise(franchiseId, query);
  }

  listForStudentInFranchise(studentId: number, franchiseId: string, query: ListQueryDto = {}) {
    return this.progression.listCertificatesForStudent(studentId, franchiseId, query);
  }

  listForAdmin(query: ListQueryDto = {}) {
    return this.progression.listCertificatesForAdmin(query);
  }

  async bulkRequestCertificate(
    franchiseeId: number,
    franchiseId: string,
    dto: BulkCertificateRequestDto,
  ) {
    const eligible = await this.ciTrainingReads.listEligibleForCertificate(
      franchiseId,
      [dto.levelId],
      dto.programId,
    );
    if (!eligible.some((ci) => ci.id === dto.courseInstructorId)) {
      throw new CertificateIneligibleInstructorError();
    }

    const studentViews = await Promise.all(
      dto.students.map((entry) =>
        this.students.findByIdForFranchise(entry.studentId, franchiseId),
      ),
    );
    const mismatch = studentViews.some(
      (v) => !v || v.programId !== dto.programId || v.levelId !== dto.levelId,
    );
    if (mismatch) throw new CertificateStudentMismatchError();

    return this.progression.bulkRequestCertificate(franchiseeId, franchiseId, dto);
  }

  approveCertificate(id: number, adminId: number) {
    return this.progression.approveCertificate(id, adminId);
  }

  buildCertificatePdfBuffer(id: number, expectedFranchiseId?: string) {
    return this.progression.buildCertificatePdfBuffer(id, expectedFranchiseId);
  }

  rejectCertificate(id: number, reason: string, adminId: number) {
    return this.progression.rejectCertificate(id, reason, adminId);
  }
}
```

- [ ] **Step 2: Update CertificationModule**

```typescript
// ipa-new/src/modules/certification/certification.module.ts
import { Module } from '@nestjs/common';
import { CITrainingModule } from '../ci-training/ci-training.module';
import { StudentsModule } from '../students/students.module';
import { PartnerIdentityModule } from '../partner-identity/partner-identity.module';
import { AcademicCatalogModule } from '../academic-catalog/academic-catalog.module';
import { CertificateTemplateRepository } from './infrastructure/repositories/certificate-template.repository';
import { CertificateIssuanceService } from './application/services/certificate-issuance.service';
import { CertificateTemplateService } from './application/services/certificate-template.service';
import { CertificationFranchiseeController } from './controllers/franchisee-auth.controller';
import { CertificationAdminController } from './controllers/admin-auth.controller';

@Module({
  imports: [StudentsModule, CITrainingModule, PartnerIdentityModule, AcademicCatalogModule],
  controllers: [CertificationFranchiseeController, CertificationAdminController],
  providers: [
    CertificateTemplateRepository,
    CertificateIssuanceService,
    CertificateTemplateService,
  ],
  exports: [CertificateIssuanceService],
})
export class CertificationModule {}
```

- [ ] **Step 3: Update StudentsModule to import the modules needed by the new service**

Open `ipa-new/src/modules/students/students.module.ts` and add `AcademicCatalogModule`, `PartnerIdentityModule`, `CertificationModule` to imports (for `LevelRepository`, `StreamTransitionRepository`, `FranchiseeRepository`, `CertificateTemplateRepository`):

**Problem**: `CertificationModule` imports `StudentsModule` and `StudentsModule` would import `CertificationModule` — a circular NestJS module dependency. To avoid this, inject `CertificateTemplateRepository` directly in `StudentsModule` rather than through `CertificationModule`.

Replace `ipa-new/src/modules/students/students.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AcademicCatalogModule } from '../academic-catalog/academic-catalog.module';
import { PartnerIdentityModule } from '../partner-identity/partner-identity.module';
import { CertificateTemplateRepository } from '../certification/infrastructure/repositories/certificate-template.repository';
import { StudentRepository } from './infrastructure/repositories/student.repository';
import { StudentLevelProgressionRepository } from './infrastructure/repositories/student-level-progression.repository';
import { StudentEnrollmentService } from './application/services/student-enrollment.service';
import { StudentIdCardService } from './application/services/student-id-card.service';
import { StudentLevelProgressionService } from './application/services/student-level-progression.service';
import { StudentsReadFacade } from './application/facades/students-read.facade';
import {
  StudentFranchiseeController,
  IdCardFranchiseeController,
} from './controllers/franchisee-auth.controller';
import {
  StudentAdminController,
  IdCardAdminController,
} from './controllers/admin-auth.controller';
import { StudentProgressionController } from './controllers/student-progression.controller';

@Module({
  imports: [AcademicCatalogModule, PartnerIdentityModule],
  controllers: [
    StudentFranchiseeController,
    IdCardFranchiseeController,
    StudentAdminController,
    IdCardAdminController,
    StudentProgressionController,
  ],
  providers: [
    StudentRepository,
    StudentLevelProgressionRepository,
    StudentEnrollmentService,
    StudentIdCardService,
    StudentLevelProgressionService,
    StudentsReadFacade,
    CertificateTemplateRepository,
  ],
  exports: [
    StudentEnrollmentService,
    StudentsReadFacade,
    StudentRepository,
    StudentLevelProgressionService,
    StudentLevelProgressionRepository,
  ],
})
export class StudentsModule {}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd ipa-new && npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd ipa-new
git add src/modules/certification/application/services/certificate-issuance.service.ts
git add src/modules/certification/certification.module.ts
git add src/modules/students/students.module.ts
git commit -m "feat(certification): redirect CertificateIssuanceService to StudentLevelProgressionService"
```

---

### Task 5: Update `findEligibleByFranchise` to query StudentLevelProgression

**Files:**
- Modify: `ipa-new/src/modules/students/infrastructure/repositories/student.repository.ts`

- [ ] **Step 1: Replace only the `findEligibleByFranchise` method**

Find the `findEligibleByFranchise` method (around line 161) and replace it:

```typescript
async findEligibleByFranchise(franchiseId: string): Promise<Student[]> {
  const lastIssuedAt = `(
    SELECT MAX(slp."certificateIssuedAt")
    FROM student_level_progressions slp
    WHERE slp."studentId" = "Student"."id"
      AND slp."certificateStatus" = 'ISSUED'
  )`;

  const hasPendingCertificate = `EXISTS (
    SELECT 1
    FROM student_level_progressions slp
    WHERE slp."studentId" = "Student"."id"
      AND slp."levelId" = "Student"."levelId"
      AND slp."certificateStatus" = 'PENDING'
  )`;

  return Student.findAll({
    where: {
      franchiseId,
      isActive: true,
      [Op.and]: literal(`(
        NOT ${hasPendingCertificate}
        AND (
          (${lastIssuedAt} IS NULL
            AND NOW() - "Student"."dateOfJoining"::timestamp
                >= "level"."durationInMonths" * INTERVAL '1 month')
          OR (${lastIssuedAt} IS NOT NULL
            AND NOW() - ${lastIssuedAt}::timestamp
                >= "level"."durationInMonths" * INTERVAL '1 month')
        )
      )`),
    } as any,

    attributes: {
      include: [
        [literal(lastIssuedAt), 'lastCertIssuedAt'],
        [
          literal(`
            CASE
              WHEN ${lastIssuedAt} IS NULL
                THEN 'no_certificate'
              ELSE 'duration_exceeded'
            END
          `),
          'eligibilityReason',
        ],
      ],
    },

    include: [
      {
        model: Level,
        attributes: ['id', 'name', 'durationInMonths'],
      },
    ],
  } as any);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ipa-new && npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ipa-new
git add src/modules/students/infrastructure/repositories/student.repository.ts
git commit -m "feat(students): update findEligibleByFranchise to query student_level_progressions"
```

---

### Task 6: Update franchisee-dashboard raw SQL

**Files:**
- Modify: `ipa-new/src/modules/franchise-onboarding/application/services/franchisee-dashboard.service.ts`

- [ ] **Step 1: Locate and replace the two `certificate` table queries**

Find the two raw SQL queries that query `FROM certificate WHERE "franchiseId" = :franchiseId` and replace them:

```typescript
// Replace:
//   SELECT COUNT(*) as cnt FROM certificate WHERE "franchiseId" = :franchiseId
// With:
`SELECT COUNT(*) as cnt
 FROM student_level_progressions slp
 JOIN students s ON s.id = slp."studentId"
 WHERE s."franchiseId" = :franchiseId
   AND slp."certificateStatus" != 'NONE'`

// Replace:
//   SELECT COUNT(*) as cnt FROM certificate WHERE "franchiseId" = :franchiseId AND status = 'Pending'
// With:
`SELECT COUNT(*) as cnt
 FROM student_level_progressions slp
 JOIN students s ON s.id = slp."studentId"
 WHERE s."franchiseId" = :franchiseId
   AND slp."certificateStatus" = 'PENDING'`
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd ipa-new && npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ipa-new
git add src/modules/franchise-onboarding/application/services/franchisee-dashboard.service.ts
git commit -m "feat(franchise-onboarding): update dashboard certificate counts to query student_level_progressions"
```

---

### Task 7: Delete Certificate infrastructure and update persistence index

**Files:**
- Delete: `ipa-new/src/modules/certification/infrastructure/persistence/certificate.model.ts`
- Delete: `ipa-new/src/modules/certification/infrastructure/repositories/certificate.repository.ts`
- Delete: `ipa-new/src/modules/certification/infrastructure/mappers/certificate.mapper.ts`
- Delete: `ipa-new/src/modules/certification/domain/entities/certificate.entity.ts`
- Modify: `ipa-new/src/modules/certification/infrastructure/persistence/index.ts`
- Modify: `ipa-new/src/modules/certification/certification.errors.ts` — remove certificate-specific errors no longer referenced

- [ ] **Step 1: Delete the four files**

```bash
cd ipa-new
rm src/modules/certification/infrastructure/persistence/certificate.model.ts
rm src/modules/certification/infrastructure/repositories/certificate.repository.ts
rm src/modules/certification/infrastructure/mappers/certificate.mapper.ts
rm src/modules/certification/domain/entities/certificate.entity.ts
```

- [ ] **Step 2: Update persistence index**

Replace `ipa-new/src/modules/certification/infrastructure/persistence/index.ts`:

```typescript
export { CertificateTemplate } from './certificate-template.model';

export const certificationModels = [
  require('./certificate-template.model').CertificateTemplate,
];
```

- [ ] **Step 3: Remove unused errors from certification.errors.ts**

Read `ipa-new/src/modules/certification/certification.errors.ts` and keep only errors still referenced by `CertificateIssuanceService` (i.e., `CertificateIneligibleInstructorError`, `CertificateStudentMismatchError`) and errors referenced by the progression service (`CertificateNotFoundError`, `CertificatePdfGenerationError`). Remove `CertificateAlreadyProcessedError`, `CertificateTemplateNotFoundError` only if they are no longer imported anywhere.

Check what's still imported:
```bash
cd ipa-new
grep -rn "CertificateAlreadyProcessed\|CertificateTemplateNotFound\|CertificateNotFound\|CertificatePdfGeneration\|CertificateIneligible\|CertificateStudentMismatch" src --include="*.ts"
```

Remove any error class that has zero remaining references.

- [ ] **Step 4: Verify TypeScript**

```bash
cd ipa-new && npx tsc --noEmit --skipLibCheck
```

Expected: no errors. If errors appear, they point to files still importing the deleted entities — fix each one.

- [ ] **Step 5: Commit**

```bash
cd ipa-new
git add -A src/modules/certification/
git commit -m "feat(certification): delete Certificate model/repo/mapper/entity — data now in StudentLevelProgression"
```

---

## Self-review checklist

- [x] Task 1 adds `totalMarks`, `instructorId`, `rejectionReason`, `certificateRequestDate`; replaces `certificateIssued: bool` with `certificateStatus: string`
- [x] Task 2 repository methods handle franchiseId-less SLP via student join
- [x] Task 3 service PDF builder uses injected repos, avoids direct model imports (no new cycles)
- [x] Task 4 `CertificateIssuanceService` is a thin facade — same controller contract, different internals
- [x] Task 4 avoids `CertificationModule` ↔ `StudentsModule` circular NestJS module dependency by injecting `CertificateTemplateRepository` directly in `StudentsModule`
- [x] Task 5 raw SQL uses `"certificateStatus"` and `"certificateIssuedAt"` (Sequelize camelCase column names)
- [x] Task 6 dashboard SQL joins `students` to get `franchiseId` (not on SLP directly)
- [x] Task 7 deletes all four infrastructure files; leaves `CertificateTemplate` model intact
- [x] `EventPublisher` + `CertificateIssuedEvent` — communications module unchanged (receives same event payload)
- [x] Platform-admin dashboard uses `CertificateIssuanceService.listForAdmin` — unchanged after Task 4 redirect
