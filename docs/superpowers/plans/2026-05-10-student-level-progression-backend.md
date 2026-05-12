# Student Level Progression — Backend Plan (Sub-project A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `StudentLevelProgression` entity that tracks per-student, per-level state (status, marks, materialsOrdered, certificate), and expose `materialsOrdered` in the student list API.

**Architecture:** New Sequelize model + repository inside the `students` module mirrors the `CITraining` pattern. `StudentEnrollmentService` creates a progression row on enroll/level-advance. `CreateOrderService` sets `materialsOrdered = true` after placing a student order. `StudentRepository.listByFranchise` performs a post-fetch join to attach `materialsOrdered` to each student row.

**Tech Stack:** NestJS, Sequelize v7 (`@sequelize/core`), TypeScript, PostgreSQL. Paths: `@shared/*` → `src/shared-kernel/*`, `@model-pool` → `src/infrastructure/database/model-pool`.

---

### Task 1: StudentLevelProgression Sequelize model

**Files:**
- Create: `ipa-new/src/modules/students/infrastructure/persistence/student-level-progression.model.ts`
- Modify: `ipa-new/src/modules/students/infrastructure/persistence/index.ts`

- [ ] **Step 1: Create the model file**

```typescript
// ipa-new/src/modules/students/infrastructure/persistence/student-level-progression.model.ts
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  NonAttribute,
} from '@sequelize/core';
import {
  Attribute,
  AutoIncrement,
  BelongsTo,
  Default,
  NotNull,
  PrimaryKey,
  Table,
} from '@sequelize/core/decorators-legacy';
import { Student } from './student.model';
import { Level } from '../../../academic-catalog/infrastructure/persistence/level.model';

export type StudentLevelProgressionStatus =
  | 'ENROLLED'
  | 'UNDERGOING'
  | 'COMPLETED'
  | 'FAILED';

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

  @Attribute(DataTypes.BOOLEAN)
  @Default(false)
  declare materialsOrdered: boolean;

  @Attribute(DataTypes.DATE)
  declare materialsOrderedAt: Date | null;

  @Attribute(DataTypes.DATE)
  declare completedAt: Date | null;

  @Attribute(DataTypes.BOOLEAN)
  @Default(false)
  declare certificateIssued: boolean;

  @Attribute(DataTypes.STRING)
  declare certificatePdfPath: string | null;

  @Attribute(DataTypes.DATE)
  declare certificateIssuedAt: Date | null;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare createdBy: number;

  @Attribute(DataTypes.INTEGER)
  declare updatedBy: number | null;

  @BelongsTo(() => Student, { foreignKey: 'studentId' })
  declare student?: NonAttribute<Student | null>;

  @BelongsTo(() => Level, { foreignKey: 'levelId' })
  declare level?: NonAttribute<Level | null>;
}
```

- [ ] **Step 2: Register model in the persistence index**

Open `ipa-new/src/modules/students/infrastructure/persistence/index.ts` and replace its entire contents with:

```typescript
export { Student } from './student.model';
export { StudentLevelProgression } from './student-level-progression.model';

export const studentsModels = [
  require('./student.model').Student,
  require('./student-level-progression.model').StudentLevelProgression,
];
```

- [ ] **Step 3: Start the backend and confirm no import errors**

```bash
cd ipa-new && npm run start:dev
```

Expected: server starts without errors. Stop it with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
cd ipa-new
git add src/modules/students/infrastructure/persistence/student-level-progression.model.ts
git add src/modules/students/infrastructure/persistence/index.ts
git commit -m "feat(students): add StudentLevelProgression model"
```

---

### Task 2: StudentLevelProgression repository

**Files:**
- Create: `ipa-new/src/modules/students/infrastructure/repositories/student-level-progression.repository.ts`

- [ ] **Step 1: Create the repository**

```typescript
// ipa-new/src/modules/students/infrastructure/repositories/student-level-progression.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { Op, Sequelize } from '@sequelize/core';
import { BaseRepository } from '../../../../shared-kernel/repository/base.repository';
import {
  StudentLevelProgression,
  StudentLevelProgressionStatus,
} from '../persistence/student-level-progression.model';

@Injectable()
export class StudentLevelProgressionRepository extends BaseRepository<
  StudentLevelProgression,
  number
> {
  constructor(@Inject('SEQUELIZE') s: Sequelize) {
    super(StudentLevelProgression, s);
  }

  async findByStudentAndLevel(
    studentId: number,
    levelId: number,
  ): Promise<StudentLevelProgression | null> {
    return this.findOne({ studentId, levelId } as any);
  }

  async findAllByStudent(
    studentId: number,
  ): Promise<StudentLevelProgression[]> {
    return this.findAll({ where: { studentId } as any } as any);
  }

  async getMaterialsOrderedMap(
    studentIds: number[],
  ): Promise<Map<number, boolean>> {
    if (!studentIds.length) return new Map();
    // We fetch ALL progressions for the given students, then the caller
    // matches each to the student's current levelId.
    const rows = (await StudentLevelProgression.findAll({
      where: { studentId: { [Op.in]: studentIds } } as any,
      attributes: ['studentId', 'levelId', 'materialsOrdered'],
    } as any)) as StudentLevelProgression[];
    const result = new Map<number, { levelId: number; materialsOrdered: boolean }>();
    for (const row of rows) {
      result.set(row.studentId, { levelId: row.levelId, materialsOrdered: row.materialsOrdered });
    }
    return new Map(
      [...result.entries()].map(([sid, v]) => [sid, v.materialsOrdered]),
    );
  }

  /** Returns a map of studentId -> progression row for a list of (studentId, levelId) pairs. */
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

  async setMaterialsOrdered(
    studentIds: number[],
    levelIds: number[],
  ): Promise<void> {
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
}
```

- [ ] **Step 2: Start the backend and confirm no errors**

```bash
cd ipa-new && npm run start:dev
```

Expected: starts without errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
cd ipa-new
git add src/modules/students/infrastructure/repositories/student-level-progression.repository.ts
git commit -m "feat(students): add StudentLevelProgressionRepository"
```

---

### Task 3: StudentLevelProgressionService

**Files:**
- Create: `ipa-new/src/modules/students/application/services/student-level-progression.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// ipa-new/src/modules/students/application/services/student-level-progression.service.ts
import { Injectable } from '@nestjs/common';
import { ErrorException } from '@shared/errors/error-exception';
import { StudentLevelProgressionRepository } from '../../infrastructure/repositories/student-level-progression.repository';
import { StudentLevelProgressionStatus } from '../../infrastructure/persistence/student-level-progression.model';

@Injectable()
export class StudentLevelProgressionService {
  constructor(private readonly repo: StudentLevelProgressionRepository) {}

  listByStudent(studentId: number) {
    return this.repo.findAllByStudent(studentId);
  }

  async getCurrent(studentId: number, levelId: number) {
    return this.repo.findByStudentAndLevel(studentId, levelId);
  }

  async createForLevel(
    studentId: number,
    levelId: number,
    createdBy: number,
  ) {
    const existing = await this.repo.findByStudentAndLevel(studentId, levelId);
    if (existing) return existing;
    return this.repo.create({
      studentId,
      levelId,
      status: 'ENROLLED',
      marks: null,
      theoryMarks: null,
      materialsOrdered: false,
      materialsOrderedAt: null,
      completedAt: null,
      certificateIssued: false,
      certificatePdfPath: null,
      certificateIssuedAt: null,
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
      newStatus === 'COMPLETED' && row.status !== 'COMPLETED'
        ? new Date()
        : row.completedAt;

    await this.repo.updateStatus(progressionId, newStatus, {
      marks: dto.marks !== undefined ? dto.marks : row.marks,
      theoryMarks: dto.theoryMarks !== undefined ? dto.theoryMarks : row.theoryMarks,
      completedAt,
      updatedBy: dto.updatedBy,
    });
    return this.repo.findById(progressionId);
  }

  async setMaterialsOrdered(
    pairs: Array<{ studentId: number; levelId: number }>,
  ) {
    if (!pairs.length) return;
    await this.repo.setMaterialsOrdered(
      pairs.map((p) => p.studentId),
      pairs.map((p) => p.levelId),
    );
  }
}
```

- [ ] **Step 2: Start the backend and confirm no errors**

```bash
cd ipa-new && npm run start:dev
```

Expected: no errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
cd ipa-new
git add src/modules/students/application/services/student-level-progression.service.ts
git commit -m "feat(students): add StudentLevelProgressionService"
```

---

### Task 4: Create progression on student enroll and level advance

**Files:**
- Modify: `ipa-new/src/modules/students/application/services/student-enrollment.service.ts`

- [ ] **Step 1: Inject the progression service and update `enroll` and `updateLevel`**

Replace the entire file contents:

```typescript
// ipa-new/src/modules/students/application/services/student-enrollment.service.ts
import { Injectable } from "@nestjs/common";
import { StudentRepository } from "../../infrastructure/repositories/student.repository";
import { StudentMapper } from "../../infrastructure/mappers/student.mapper";
import { StudentNotFoundError } from "../../students.errors";
import { ErrorException } from "@shared/errors/error-exception";
import { ListQueryDto } from "@shared/pagination/pagination.dto";
import { EnrollStudentDto } from "../dto/enroll-student.dto";
import { StudentLevelProgressionService } from "./student-level-progression.service";
import { uuidv7 } from "uuidv7";

@Injectable()
export class StudentEnrollmentService {
  constructor(
    private readonly repo: StudentRepository,
    private readonly progression: StudentLevelProgressionService,
  ) {}

  listByFranchise(franchiseId: string, query: ListQueryDto = {}) {
    return this.repo.listByFranchise(franchiseId, query);
  }

  listForAdmin(query: ListQueryDto = {}) {
    return this.repo.listForAdmin(query);
  }

  findById(id: number) {
    return this.repo.findById(id);
  }

  async findByIdForFranchise(id: number, franchiseId: string) {
    const s = await this.repo.findById(id);
    if (!s) throw new StudentNotFoundError();
    if (s.franchiseId !== franchiseId) throw new ErrorException("FORBIDDEN");
    return s;
  }

  listEligible(franchiseId: string) {
    return this.repo.findEligibleByFranchise(franchiseId);
  }

  async updateLevel(studentId: number, levelId: number, updatedBy: number) {
    const row = await this.repo.findById(studentId);
    if (!row) throw new StudentNotFoundError();
    StudentMapper.toDomain(row).promoteToLevel(levelId, updatedBy);
    await this.repo.updateLevel(studentId, levelId, updatedBy);
    // Create a fresh progression row for the new level (materialsOrdered = false)
    await this.progression.createForLevel(studentId, levelId, updatedBy);
  }

  async enroll(
    franchiseeId: number,
    franchiseId: string,
    dto: EnrollStudentDto,
  ) {
    const rollNo = uuidv7();
    const student = await this.repo.create({
      franchiseId,
      programId: dto.programId,
      levelId: dto.levelId,
      name: dto.name,
      rollNo,
      sex: dto.sex,
      dateOfBirth: dto.dateOfBirth,
      fatherName: dto.fatherName ?? null,
      fatherOccupation: dto.fatherOccupation ?? null,
      fatherQualification: dto.fatherQualification ?? null,
      motherName: dto.motherName ?? null,
      motherOccupation: dto.motherOccupation ?? null,
      motherQualification: dto.motherQualification ?? null,
      residentialAddress: dto.residentialAddress ?? null,
      fatherContactNo: dto.fatherContactNo ?? null,
      motherContactNo: dto.motherContactNo ?? null,
      email: dto.email ?? null,
      standard: dto.standard ?? null,
      dateOfJoining: dto.dateOfJoining ?? new Date().toISOString().slice(0, 10),
      createdBy: franchiseeId,
    } as any);
    // Create initial progression row for starting level
    await this.progression.createForLevel(student.id, dto.levelId, franchiseeId);
    return student;
  }
}
```

- [ ] **Step 2: Start the backend and confirm no errors**

```bash
cd ipa-new && npm run start:dev
```

Expected: no errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
cd ipa-new
git add src/modules/students/application/services/student-enrollment.service.ts
git commit -m "feat(students): create progression row on enroll and level advance"
```

---

### Task 5: Attach `materialsOrdered` to student list responses

**Files:**
- Modify: `ipa-new/src/modules/students/infrastructure/repositories/student.repository.ts`

- [ ] **Step 1: Import StudentLevelProgression and add post-fetch merge in `listByFranchise`**

Add the import at the top of the file (after existing imports):

```typescript
import { StudentLevelProgression } from '../persistence/student-level-progression.model';
import { Op } from '@sequelize/core';
```

Replace the `listByFranchise` method:

```typescript
async listByFranchise(franchiseId: string, query: ListQueryDto) {
  const extraWhere: Record<string, unknown> = {};

  const statusVal = (query as any).status?.trim().toLowerCase();
  if (statusVal === "active") extraWhere.isActive = true;
  if (statusVal === "inactive") extraWhere.isActive = false;

  const levelIdVal = (query as any).levelId;
  if (levelIdVal && Number.isInteger(Number(levelIdVal))) {
    extraWhere.levelId = Number(levelIdVal);
  }

  const idStatusVal = (query as any).idStatus?.trim();
  if (idStatusVal) {
    extraWhere.idIssued =
      idStatusVal === "Not Issued" ? "Not Requested" : idStatusVal;
  }

  const result = await this.pagination.paginateWithQuery<Student>(Student, query, {
    staticWhere: { franchiseId },
    extraWhere: Object.keys(extraWhere).length ? extraWhere : undefined,
    searchFields: ["name", "rollNo", "email"],
    defaultSortField: "id",
    include: [{ model: Level, attributes: ["id", "name", "code", "streamId"] }],
  });

  // Attach materialsOrdered from the student's current-level progression
  if (result.rows.length > 0) {
    const pairs = result.rows.map((s) => ({ studentId: s.id, levelId: s.levelId }));
    const studentIds = pairs.map((p) => p.studentId);
    const levelIds = [...new Set(pairs.map((p) => p.levelId))];

    const progressions = (await StudentLevelProgression.findAll({
      where: {
        studentId: { [Op.in]: studentIds },
        levelId: { [Op.in]: levelIds },
      } as any,
      attributes: ['studentId', 'levelId', 'materialsOrdered'],
    } as any)) as StudentLevelProgression[];

    const progressionMap = new Map<number, boolean>();
    for (const p of progressions) {
      const student = result.rows.find((s) => s.id === p.studentId && s.levelId === p.levelId);
      if (student) progressionMap.set(p.studentId, p.materialsOrdered);
    }

    for (const student of result.rows) {
      (student as any).materialsOrdered = progressionMap.get(student.id) ?? false;
    }
  }

  return result;
}
```

- [ ] **Step 2: Verify `GET /student` now returns `materialsOrdered`**

Start the server and call the endpoint:

```bash
cd ipa-new && npm run start:dev
# In another terminal:
curl -s -b "your-cookie" http://localhost:5000/student | jq '.data.rows[0].materialsOrdered'
```

Expected: `false` (or `true` for students with an existing order).

- [ ] **Step 3: Commit**

```bash
cd ipa-new
git add src/modules/students/infrastructure/repositories/student.repository.ts
git commit -m "feat(students): include materialsOrdered from current progression in student list"
```

---

### Task 6: Set `materialsOrdered = true` after placing a student order

**Files:**
- Modify: `ipa-new/src/modules/order-management/application/services/create-order.service.ts`

- [ ] **Step 1: Import `StudentLevelProgression` and set flag after order creation**

Add this import at the top of `create-order.service.ts` (with the other model imports):

```typescript
import { StudentLevelProgression } from '../../../students/infrastructure/persistence/student-level-progression.model';
```

Find the block at the end of `execute()` that starts with `if ((paymentStatus === OrderPaymentStatus.FREE || paymentStatus === OrderPaymentStatus.PAID) && created) {`.

Inside that block, after the `await this.outbox.publish(...)` call, add:

```typescript
// Set materialsOrdered on each student's progression for their current level
const pairsToUpdate = students.map((s) => ({ studentId: s.id, levelId: s.levelId }));
if (pairsToUpdate.length > 0) {
  const studentIds = pairsToUpdate.map((p) => p.studentId);
  const levelIds = [...new Set(pairsToUpdate.map((p) => p.levelId))];
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
```

- [ ] **Step 2: Start the backend and confirm no errors**

```bash
cd ipa-new && npm run start:dev
```

Expected: no errors. Stop with Ctrl+C.

- [ ] **Step 3: End-to-end smoke test**

1. Call `GET /student` → note a student with `materialsOrdered: false`
2. Place a student order via `POST /order` for that student
3. Call `GET /student` again → the same student should now show `materialsOrdered: true`

- [ ] **Step 4: Commit**

```bash
cd ipa-new
git add src/modules/order-management/application/services/create-order.service.ts
git commit -m "feat(orders): set materialsOrdered on student progression after order placed"
```

---

### Task 7: Progression controller (marks entry + list)

**Files:**
- Create: `ipa-new/src/modules/students/controllers/student-progression.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
// ipa-new/src/modules/students/controllers/student-progression.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { FranchiseeJwtGuard } from '../../../infrastructure/auth/franchisee-jwt.guard';
import { FranchiseOperationalAccessGuard } from '../../../infrastructure/auth/franchise-operational-access.guard';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import { FranchiseeJwtPayload } from '../../../infrastructure/auth/auth.types';
import { StudentLevelProgressionService } from '../application/services/student-level-progression.service';
import { StudentEnrollmentService } from '../application/services/student-enrollment.service';
import { StudentNotFoundError } from '../students.errors';
import { ErrorException } from '@shared/errors/error-exception';

class UpdateProgressionDto {
  @IsOptional()
  @IsEnum(['ENROLLED', 'UNDERGOING', 'COMPLETED', 'FAILED'])
  status?: 'ENROLLED' | 'UNDERGOING' | 'COMPLETED' | 'FAILED';

  @IsOptional()
  @IsNumber()
  @Min(0)
  marks?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  theoryMarks?: number | null;
}

@Controller('student/:studentId/progression')
@UseGuards(FranchiseeJwtGuard, FranchiseOperationalAccessGuard)
export class StudentProgressionController {
  constructor(
    private readonly progressionService: StudentLevelProgressionService,
    private readonly enrollmentService: StudentEnrollmentService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: FranchiseeJwtPayload,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    const student = await this.enrollmentService.findByIdForFranchise(studentId, user.franchiseId);
    if (!student) throw new StudentNotFoundError();
    return this.progressionService.listByStudent(studentId);
  }

  @Patch(':progressionId')
  async update(
    @CurrentUser() user: FranchiseeJwtPayload,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('progressionId', ParseIntPipe) progressionId: number,
    @Body() dto: UpdateProgressionDto,
  ) {
    // Verify the student belongs to this franchise
    await this.enrollmentService.findByIdForFranchise(studentId, user.franchiseId);
    return this.progressionService.updateMarksAndStatus(progressionId, {
      status: dto.status,
      marks: dto.marks,
      theoryMarks: dto.theoryMarks,
      updatedBy: user.sub,
    });
  }
}
```

- [ ] **Step 2: Register in `students.module.ts`**

Open `ipa-new/src/modules/students/students.module.ts` and replace with:

```typescript
import { Module } from '@nestjs/common';
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

- [ ] **Step 3: Start the backend and confirm no errors**

```bash
cd ipa-new && npm run start:dev
```

Expected: starts without errors. Stop with Ctrl+C.

- [ ] **Step 4: Verify the endpoints exist**

```bash
curl -s http://localhost:5000 | head
# Check NestJS logs include routes for /student/:studentId/progression
```

- [ ] **Step 5: Commit**

```bash
cd ipa-new
git add src/modules/students/controllers/student-progression.controller.ts
git add src/modules/students/students.module.ts
git commit -m "feat(students): add StudentProgressionController and wire module"
```

---

### Task 8: Frontend — add `materialsOrdered` to `StudentData`

**Files:**
- Modify: `IPA-frontend/services/student.service.ts`

- [ ] **Step 1: Add `materialsOrdered` to the `StudentData` interface**

In `IPA-frontend/services/student.service.ts`, find the `StudentData` interface (line 32) and add the field after `updatedBy`:

```typescript
export interface StudentData {
  id: number;
  franchiseId: string;
  programId: number;
  name: string;
  rollNo: string;
  dateOfBirth: Date;
  sex: string;
  fatherName: string;
  fatherQualification: string;
  fatherOccupation: string;
  motherName: string;
  motherQualification: string;
  motherOccupation: string;
  residentialAddress: string;
  fatherContactNo: string;
  motherContactNo: string;
  mail: string;
  standard: string;
  levelId?: number;
  level: StudentLevel | string | { id: number; name: string; code: string; streamId: number };
  stream: StudentStream | string;
  isActive: boolean;
  idIssued: StudentIdStatus;
  deactivateDate?: Date;
  dateOfJoining?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
  updatedBy: number;
  materialsOrdered?: boolean;
}
```

- [ ] **Step 2: Map it in `mapStudentRow`**

In the same file, find `mapStudentRow` and add after `updatedBy: Number(row.updatedBy ?? 0),`:

```typescript
    materialsOrdered: Boolean(row.materialsOrdered ?? false),
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd IPA-frontend && npx tsc --noEmit
```

Expected: no errors related to `materialsOrdered`.

- [ ] **Step 4: Commit**

```bash
cd IPA-frontend
git add services/student.service.ts
git commit -m "feat(frontend): add materialsOrdered to StudentData"
```

---

### Task 9: Frontend — student-progression service and hook

**Files:**
- Create: `IPA-frontend/services/student-progression.service.ts`
- Create: `IPA-frontend/hooks/api/student-progression.hooks.ts`

- [ ] **Step 1: Create the service**

```typescript
// IPA-frontend/services/student-progression.service.ts
import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export type StudentLevelProgressionStatus =
  | 'ENROLLED'
  | 'UNDERGOING'
  | 'COMPLETED'
  | 'FAILED';

export interface StudentLevelProgression {
  id: number;
  studentId: number;
  levelId: number;
  status: StudentLevelProgressionStatus;
  marks: number | null;
  theoryMarks: number | null;
  materialsOrdered: boolean;
  materialsOrderedAt: string | null;
  completedAt: string | null;
  certificateIssued: boolean;
  certificatePdfPath: string | null;
  certificateIssuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProgressionDto {
  status?: StudentLevelProgressionStatus;
  marks?: number | null;
  theoryMarks?: number | null;
}

export async function getStudentProgressions(
  studentId: number,
): Promise<StudentLevelProgression[]> {
  const response = await api.get(`/student/${studentId}/progression`);
  const data = unwrapData<unknown>(response);
  return Array.isArray(data) ? (data as StudentLevelProgression[]) : [];
}

export async function updateStudentProgression(
  studentId: number,
  progressionId: number,
  dto: UpdateProgressionDto,
): Promise<StudentLevelProgression> {
  const response = await api.patch(
    `/student/${studentId}/progression/${progressionId}`,
    dto,
  );
  return unwrapData<StudentLevelProgression>(response);
}
```

- [ ] **Step 2: Create the hook**

```typescript
// IPA-frontend/hooks/api/student-progression.hooks.ts
"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getStudentProgressions,
  updateStudentProgression,
  type StudentLevelProgression,
  type UpdateProgressionDto,
} from "@/services/student-progression.service";

const PROGRESSION_KEY = (studentId: number) => ["student-progression", studentId];

export function useStudentProgressions(studentId: number) {
  const q = useQuery({
    queryKey: PROGRESSION_KEY(studentId),
    queryFn: () => getStudentProgressions(studentId),
    enabled: studentId > 0,
  });
  return {
    progressions: q.data ?? [] as StudentLevelProgression[],
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export function useUpdateStudentProgression(studentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ progressionId, dto }: { progressionId: number; dto: UpdateProgressionDto }) =>
      updateStudentProgression(studentId, progressionId, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROGRESSION_KEY(studentId) });
    },
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd IPA-frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd IPA-frontend
git add services/student-progression.service.ts
git add hooks/api/student-progression.hooks.ts
git commit -m "feat(frontend): add student-progression service and hook"
```

---

## Self-review checklist

- [x] `StudentLevelProgression` model created with all spec fields (no `practicalMarks`)
- [x] Registered in `studentsModels` and model-pool via the index
- [x] `createForLevel` called on both enroll and `updateLevel` — new level gets `materialsOrdered = false`
- [x] `execute()` in `CreateOrderService` sets `materialsOrdered = true` on matching progressions after order placed
- [x] `listByFranchise` attaches `materialsOrdered` to each student row via post-fetch merge
- [x] Controller exposes `GET /student/:id/progression` and `PATCH /student/:id/progression/:id`
- [x] `StudentData` in frontend has `materialsOrdered?: boolean`
- [x] Frontend service + hook created for progression CRUD
