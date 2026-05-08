# CI-Specific Training Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework CI training packages so an admin assigns packages to each course instructor during approval, and the CI portal shows only the packages assigned to that instructor.

**Architecture:** Program-level CI training levels remain the curriculum source. Program-level package catalog UI should not be the operational source of truth. Add a CI-specific package assignment model in the backend; `ApproveCIModal` creates package assignments during admin approval; `GET /ci/training/packages` reads those assignments instead of returning all packages for the instructor program.

**Tech Stack:** NestJS 11, Sequelize decorators, Next.js 16 App Router, SWR, existing `components/shared` table shell and Radix UI components.

---

## Current State

- Frontend admin approval lives in `IPA-frontend/app/admin/course-instructor-approvals/components/ApproveCIModal.tsx`.
- Frontend approval service sends only `{ validFrom, validUntil }` through `approveCourseInstructor()` in `IPA-frontend/services/course-instructor.service.ts`.
- Backend approval DTO only has dates in `ipa-new/src/modules/course-instructor/application/dto/approve-ci-application.dto.ts`.
- Backend approval handler is `ipa-new/src/modules/course-instructor/application/services/ci.service.ts`, method `adminApprove()`.
- Backend currently bootstraps all CI training levels on approval in `ipa-new/src/modules/ci-training/application/services/ci-training.service.ts`, method `bootstrapTrainingsForApprovedInstructor()`.
- CI package listing currently returns program-wide packages in `listTrainingPackagesForInstructor()`.
- The previously added frontend route/component at `IPA-frontend/app/admin/catalog/ci-training-packages/page.tsx` is general catalog management and should no longer be presented as the admin workflow for this feature.

## Target Behavior

- Admin opens a pending CI application and clicks approve.
- Approval modal loads the CI's program-level CI training levels.
- Admin creates one or more packages for that CI only.
- The assigned packages must include every CI training level in that instructor's program exactly once.
- Admin cannot approve if any CI training level is left out or used in more than one package.
- Each package has `name`, `code`, `packageOrder`, `fee`, optional `description`, and selected contiguous `trainingLevelIds`.
- Admin cannot approve without at least one package.
- Backend stores these packages against that specific `courseInstructorId`.
- Backend bootstraps `ci_trainings` from the assigned packages only after validating that package coverage equals the full program CI training level set.
- CI portal `Training packages` page shows only that CI's assigned packages.
- CI payment initiation accepts only package IDs assigned to the authenticated CI.

## Data Model Decision

Create a new backend model in the `ci-training` module:

`CITrainingPackageAssignment`

Fields:
- `id: number`
- `instructorId: number`
- `franchiseId: string`
- `programId: number`
- `name: string`
- `code: string`
- `description: string | null`
- `packageOrder: number`
- `fee: number`
- `currency: string` default `INR`
- `trainingLevelIds: number[]` stored as `JSONB`
- `isActive: boolean`
- `assignedBy: number | null`

Indexes:
- unique `(instructorId, packageOrder)`
- unique `(instructorId, code)`
- btree `(instructorId, isActive)`

Do not use `academic-catalog` package rows as the CI-visible package source. Those rows can remain for now if other work depends on them, but this feature must read/write `CITrainingPackageAssignment`.

---

### Task 1: Backend Assignment Persistence

**Files:**
- Create: `ipa-new/src/modules/ci-training/infrastructure/persistence/ci-training-package-assignment.model.ts`
- Create: `ipa-new/src/modules/ci-training/infrastructure/repositories/ci-training-package-assignment.repository.ts`
- Modify: `ipa-new/src/modules/ci-training/infrastructure/persistence/index.ts`
- Modify: `ipa-new/src/modules/ci-training/ci-training.module.ts`
- Modify: `ipa-new/src/modules/ci-training/infrastructure/persistence/ci-training-purchase-package.model.ts`

- [ ] **Step 1: Add package assignment model**

Create `ci-training-package-assignment.model.ts` with this shape:

```ts
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
import { CourseInstructor } from '@course-instructor/infrastructure/persistence/course-instructor.model';

@Table({
  tableName: 'ci_training_package_assignments',
  timestamps: true,
  indexes: [
    {
      name: 'uq_ci_training_package_assignments_instructor_order',
      unique: true,
      fields: ['instructorId', 'packageOrder'],
    },
    {
      name: 'uq_ci_training_package_assignments_instructor_code',
      unique: true,
      fields: ['instructorId', 'code'],
    },
    {
      name: 'idx_ci_training_package_assignments_instructor_active',
      fields: ['instructorId', 'isActive'],
    },
  ],
})
export class CITrainingPackageAssignment extends Model<
  InferAttributes<CITrainingPackageAssignment>,
  InferCreationAttributes<CITrainingPackageAssignment>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: number;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare instructorId: number;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare franchiseId: string;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare programId: number;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare name: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare code: string;

  @Attribute(DataTypes.TEXT)
  declare description: string | null;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare packageOrder: number;

  @Attribute(DataTypes.DECIMAL(10, 2))
  @NotNull
  declare fee: number;

  @Attribute(DataTypes.STRING)
  @Default('INR')
  @NotNull
  declare currency: string;

  @Attribute(DataTypes.JSONB)
  @NotNull
  declare trainingLevelIds: number[];

  @Attribute(DataTypes.BOOLEAN)
  @Default(true)
  @NotNull
  declare isActive: boolean;

  @Attribute(DataTypes.INTEGER)
  declare assignedBy: number | null;

  @BelongsTo(() => CourseInstructor, { foreignKey: 'instructorId' })
  declare instructor?: NonAttribute<CourseInstructor | null>;
}
```

- [ ] **Step 2: Add repository**

Create `ci-training-package-assignment.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Op } from '@sequelize/core';
import { BaseRepository } from '@infra/database/base.repository';
import { SequelizeService } from '@infra/database/sequelize.service';
import { CITrainingPackageAssignment } from '../persistence/ci-training-package-assignment.model';

@Injectable()
export class CITrainingPackageAssignmentRepository extends BaseRepository<
  CITrainingPackageAssignment,
  number
> {
  constructor(s: SequelizeService) {
    super(CITrainingPackageAssignment, s);
  }

  findActiveByInstructor(instructorId: number) {
    return this.findAll({
      where: { instructorId, isActive: true } as any,
      order: [['packageOrder', 'ASC'], ['id', 'ASC']],
    } as any);
  }

  findByInstructorAndIds(instructorId: number, ids: number[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.findAll({
      where: {
        instructorId,
        id: { [Op.in]: ids },
        isActive: true,
      } as any,
      order: [['packageOrder', 'ASC'], ['id', 'ASC']],
    } as any);
  }
}
```

- [ ] **Step 3: Export and register model/repository**

Update `persistence/index.ts`:

```ts
export { CITrainingPackageAssignment } from './ci-training-package-assignment.model';

import { CITrainingPackageAssignment } from './ci-training-package-assignment.model';

export const ciTrainingModels = [
  CITraining,
  CITrainingAssignment,
  CITrainingPurchase,
  CITrainingPurchasePackage,
  CITrainingSession,
  CITrainingPackageAssignment,
];
```

Preserve existing exports/models in that file; add the assignment model without removing current entries.

Update `ci-training.module.ts` providers:

```ts
import { CITrainingPackageAssignmentRepository } from './infrastructure/repositories/ci-training-package-assignment.repository';

providers: [
  CITrainingPackageAssignmentRepository,
]
```

- [ ] **Step 4: Link purchases to assignment IDs**

Modify `ci-training-purchase-package.model.ts` to support assigned packages:

```ts
import { CITrainingPackageAssignment } from './ci-training-package-assignment.model';

@Attribute(DataTypes.INTEGER)
declare packageId: number | null;

@Attribute(DataTypes.INTEGER)
declare packageAssignmentId: number | null;

@BelongsTo(() => CITrainingPackageAssignment, { foreignKey: 'packageAssignmentId' })
declare packageAssignment?: NonAttribute<CITrainingPackageAssignment | null>;
```

Adjust the unique index to use assignment IDs for the new flow:

```ts
{
  name: 'uq_ci_training_purchase_packages_purchase_assignment',
  unique: true,
  fields: ['purchaseId', 'packageAssignmentId'],
}
```

Keep the old `packageId` relation nullable for existing data compatibility.

- [ ] **Step 5: Run backend build**

Run:

```bash
npm run build
```

Expected: Nest build completes without TypeScript errors.

---

### Task 2: Backend Approval Contract

**Files:**
- Modify: `ipa-new/src/modules/course-instructor/application/dto/approve-ci-application.dto.ts`
- Modify: `ipa-new/src/modules/course-instructor/application/services/ci.service.ts`
- Modify: `ipa-new/src/modules/ci-training/application/services/ci-training.service.ts`

- [ ] **Step 1: Extend approval DTO**

Replace the DTO with nested package validation:

```ts
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ApproveCiTrainingPackageDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageOrder: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee: number;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  trainingLevelIds: number[];
}

export class ApproveCiApplicationDto {
  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApproveCiTrainingPackageDto)
  trainingPackages: ApproveCiTrainingPackageDto[];
}
```

- [ ] **Step 2: Add package assignment method**

In `CITrainingService`, inject `CITrainingPackageAssignmentRepository`.

Add methods:

```ts
type ApprovalPackageInput = {
  name: string;
  code: string;
  description?: string;
  packageOrder: number;
  fee: number;
  trainingLevelIds: number[];
};

private normalizeLevelIds(levelIds: number[]) {
  return [...new Set(levelIds.filter((id) => Number.isInteger(id) && id > 0))];
}

private async validateApprovalPackages(ci: CIModel, packages: ApprovalPackageInput[]) {
  if (!packages.length) {
    throw new ErrorException('BAD_REQUEST', 'At least one CI training package is required');
  }

  const orderSet = new Set<number>();
  const codeSet = new Set<string>();
  const usedLevels = new Set<number>();
  const validLevels = await this.catalog.findTrainingLevelsByProgram(ci.programId);
  if (!validLevels.length) {
    throw new ErrorException('BAD_REQUEST', 'This program has no CI training levels to package');
  }
  const validById = new Map(validLevels.map((level) => [level.id, level]));

  for (const pkg of packages) {
    if (orderSet.has(pkg.packageOrder)) {
      throw new ErrorException('BAD_REQUEST', 'Package order must be unique for this instructor');
    }
    orderSet.add(pkg.packageOrder);

    const code = pkg.code.trim().toLowerCase();
    if (codeSet.has(code)) {
      throw new ErrorException('BAD_REQUEST', 'Package code must be unique for this instructor');
    }
    codeSet.add(code);

    const levelIds = this.normalizeLevelIds(pkg.trainingLevelIds);
    if (!levelIds.length) {
      throw new ErrorException('BAD_REQUEST', 'Each package must include at least one training level');
    }

    const levels = levelIds
      .map((id) => validById.get(id))
      .filter((level): level is NonNullable<typeof level> => !!level)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    if (levels.length !== levelIds.length) {
      throw new ErrorException('BAD_REQUEST', 'Package levels must belong to the instructor program');
    }

    for (let i = 1; i < levels.length; i += 1) {
      if (levels[i].displayOrder !== levels[i - 1].displayOrder + 1) {
        throw new ErrorException('BAD_REQUEST', 'Package levels must be contiguous');
      }
    }

    for (const levelId of levelIds) {
      if (usedLevels.has(levelId)) {
        throw new ErrorException('BAD_REQUEST', 'Training levels cannot overlap across packages for one instructor');
      }
      usedLevels.add(levelId);
    }
  }

  const requiredLevelIds = new Set(validLevels.map((level) => level.id));
  const missingLevelIds = [...requiredLevelIds].filter((id) => !usedLevels.has(id));
  if (missingLevelIds.length) {
    throw new ErrorException(
      'BAD_REQUEST',
      `All CI training levels must be included in packages. Missing level IDs: ${missingLevelIds.join(', ')}`,
    );
  }

  return packages
    .slice()
    .sort((a, b) => a.packageOrder - b.packageOrder)
    .map((pkg) => ({
      ...pkg,
      trainingLevelIds: this.normalizeLevelIds(pkg.trainingLevelIds),
    }));
}

async assignPackagesForApprovedInstructor(input: {
  instructorId: number;
  adminId: number;
  packages: ApprovalPackageInput[];
}) {
  const ci = await this.ensureInstructor(input.instructorId);
  const normalized = await this.validateApprovalPackages(ci, input.packages);

  const existing = await this.packageAssignments.findActiveByInstructor(ci.id);
  if (existing.length) {
    throw new ErrorException('INVALID_STATE', 'Training packages are already assigned to this instructor');
  }

  await Promise.all(
    normalized.map((pkg) =>
      this.packageAssignments.create({
        instructorId: ci.id,
        franchiseId: ci.franchiseId,
        programId: ci.programId,
        name: pkg.name.trim(),
        code: pkg.code.trim(),
        description: pkg.description?.trim() || null,
        packageOrder: pkg.packageOrder,
        fee: pkg.fee,
        currency: 'INR',
        trainingLevelIds: pkg.trainingLevelIds,
        isActive: true,
        assignedBy: input.adminId,
      } as any),
    ),
  );

  return this.bootstrapTrainingsForApprovedInstructor(ci.id);
}
```

- [ ] **Step 3: Bootstrap assigned full-coverage package levels**

Change `bootstrapTrainingsForApprovedInstructor()` so it uses assignments and refuses incomplete package coverage:

```ts
async bootstrapTrainingsForApprovedInstructor(instructorId: number) {
  const ci = await this.ensureInstructor(instructorId);
  const existing = await this.trainings.findAll({
    where: { instructorId } as any,
    order: [['displayOrder', 'ASC']],
  } as any);
  if (existing.length) return existing;

  const assignments = await this.packageAssignments.findActiveByInstructor(instructorId);
  const assignedLevelIds = [
    ...new Set(assignments.flatMap((pkg) => pkg.trainingLevelIds ?? [])),
  ];
  if (!assignedLevelIds.length) return [];

  const allLevels = await this.catalog.findTrainingLevelsByProgram(ci.programId);
  const requiredLevelIds = new Set(allLevels.map((level) => level.id));
  const missingLevelIds = [...requiredLevelIds].filter(
    (id) => !assignedLevelIds.includes(id),
  );
  if (missingLevelIds.length) {
    throw new ErrorException(
      'INVALID_STATE',
      `Instructor package assignments do not cover all CI training levels. Missing level IDs: ${missingLevelIds.join(', ')}`,
    );
  }

  const levels = allLevels
    .filter((level) => assignedLevelIds.includes(level.id))
    .sort((a, b) =>
      a.displayOrder === b.displayOrder
        ? a.id - b.id
        : a.displayOrder - b.displayOrder,
    );

  await this.trainings.bulkCreateRows(
    levels.map((level, index) => ({
      instructorId,
      trainingLevelId: level.id,
      displayOrder: index + 1,
      amount: Number(level.fee ?? 0),
      paid: false,
      isActive: false,
      isCompleted: false,
      additionalDetails: null,
    })) as any,
  );

  return this.getTrainingsOrdered(instructorId);
}
```

- [ ] **Step 4: Call assignment during admin approval**

In `CIService.adminApprove()`, accept packages:

```ts
async adminApprove(
  id: number,
  adminId: number,
  validity: { validFrom: string; validUntil: string },
  admin?: AdminJwtPayload,
  trainingPackages: ApprovalPackageInput[] = [],
) {
```

Before publishing the approval event, call:

```ts
await this.ciTraining.assignPackagesForApprovedInstructor({
  instructorId: approved.id,
  adminId,
  packages: trainingPackages,
});
```

Update the controller call:

```ts
return this.ci.adminApprove(
  id,
  admin.sub,
  { validFrom: dto.validFrom, validUntil: dto.validUntil },
  admin,
  dto.trainingPackages,
);
```

- [ ] **Step 5: Keep event listener idempotent**

`onCourseInstructorApproved()` can stay as a fallback, but it must not create all program levels when no assignments exist. With the changed bootstrap method, it will return `[]` if no packages are assigned.

- [ ] **Step 6: Run backend build**

Run:

```bash
npm run build
```

Expected: build passes.

---

### Task 3: Backend CI Package Listing And Purchase

**Files:**
- Modify: `ipa-new/src/modules/ci-training/application/services/ci-training.service.ts`
- Modify: `ipa-new/src/modules/ci-training/controllers/ci-auth.controller.ts`
- Modify: `ipa-new/src/modules/ci-training/infrastructure/repositories/ci-training-purchase-package.repository.ts`

- [ ] **Step 1: Return assignment packages to CI portal**

Replace `listTrainingPackagesForInstructor()` catalog read with assignment read:

```ts
async listTrainingPackagesForInstructor(instructorId: number) {
  await this.ensureInstructor(instructorId);
  const packages = await this.packageAssignments.findActiveByInstructor(instructorId);
  const purchases = await this.purchases.findPendingOrPaidByInstructor(instructorId);
  const purchaseMap = new Map<number, PurchaseStatus>();
  for (const row of purchases) {
    if (row.status === 'PENDING' || row.status === 'PAID') {
      purchaseMap.set(row.id, row.status);
    }
  }

  const links = await this.purchasePackages.findByPurchaseIds([...purchaseMap.keys()]);
  const assignmentStatus = new Map<number, PurchaseStatus>();
  for (const row of links) {
    if (row.packageAssignmentId == null) continue;
    const state = purchaseMap.get(row.purchaseId);
    if (!state) continue;
    const existing = assignmentStatus.get(row.packageAssignmentId);
    if (existing === 'PAID') continue;
    if (!existing || state === 'PAID') assignmentStatus.set(row.packageAssignmentId, state);
  }

  return packages.map((pkg) => ({
    id: pkg.id,
    programId: pkg.programId,
    name: pkg.name,
    code: pkg.code,
    description: pkg.description,
    packageOrder: pkg.packageOrder,
    fee: Number(pkg.fee ?? 0),
    currency: pkg.currency,
    isActive: pkg.isActive,
    trainingLevelIds: pkg.trainingLevelIds ?? [],
    purchaseStatus: assignmentStatus.get(pkg.id) ?? 'UNPAID',
    isPurchased: assignmentStatus.get(pkg.id) === 'PAID',
  }));
}
```

- [ ] **Step 2: Validate purchase against assignment IDs**

In `initiatePackagePurchase()`, replace catalog lookup:

```ts
const packages = await this.packageAssignments.findByInstructorAndIds(
  ci.id,
  uniquePackageIds,
);
if (packages.length !== uniquePackageIds.length) {
  throw new ErrorException('BAD_REQUEST', 'Invalid training package selection');
}
```

Continue using package order validation, previous reservation checks, and total amount calculation against assignment rows.

- [ ] **Step 3: Store assignment link in purchase package rows**

When bulk creating purchase package rows:

```ts
await this.purchasePackages.bulkCreateRows(
  sorted.map((row) => ({
    purchaseId: purchase.id,
    packageId: null,
    packageAssignmentId: row.id,
    packageOrder: row.packageOrder,
    packageCode: row.code,
    packageName: row.name,
    packageFee: row.fee,
    trainingLevelIds: row.trainingLevelIds ?? [],
  })) as any,
);
```

- [ ] **Step 4: Update repository helper if needed**

Ensure `findByPurchaseIds()` returns `packageAssignmentId`:

```ts
findByPurchaseIds(purchaseIds: number[]) {
  if (!purchaseIds.length) return Promise.resolve([]);
  return this.findAll({
    where: { purchaseId: { [Op.in]: purchaseIds } } as any,
  } as any);
}
```

- [ ] **Step 5: Run backend build**

Run:

```bash
npm run build
```

Expected: build passes.

---

### Task 4: Frontend Approval Modal Package Builder

**Files:**
- Modify: `IPA-frontend/services/course-instructor.service.ts`
- Modify: `IPA-frontend/app/admin/course-instructor-approvals/components/ApproveCIModal.tsx`
- Use existing service: `IPA-frontend/services/training-level.service.ts`

- [ ] **Step 1: Extend frontend service contract**

In `services/course-instructor.service.ts`, update:

```ts
export interface ApproveCourseInstructorTrainingPackage {
  name: string;
  code: string;
  description?: string;
  packageOrder: number;
  fee: number;
  trainingLevelIds: number[];
}

export interface ApproveCourseInstructorRequest {
  validFrom: string;
  validUntil: string;
  trainingPackages: ApproveCourseInstructorTrainingPackage[];
}
```

- [ ] **Step 2: Load levels in approval modal**

In `ApproveCIModal.tsx`, import:

```ts
import useSWR from 'swr';
import { Plus, Trash2 } from 'lucide-react';
import { getTrainingLevelsByProgram, type TrainingLevel } from '@/services/training-level.service';
```

Add state:

```ts
type ApprovalPackageForm = {
  name: string;
  code: string;
  description: string;
  packageOrder: number;
  fee: string;
  trainingLevelIds: number[];
};

const [packages, setPackages] = useState<ApprovalPackageForm[]>([
  {
    name: 'Package 1',
    code: 'PKG-1',
    description: '',
    packageOrder: 1,
    fee: '',
    trainingLevelIds: [],
  },
]);
```

Load levels:

```ts
const levelsQuery = useSWR(
  instructor?.programId ? ['approval-ci-levels', instructor.programId] : null,
  () => getTrainingLevelsByProgram(Number(instructor!.programId)),
);
```

- [ ] **Step 3: Add local validation helpers**

Add:

```ts
function validatePackageLevels(selectedIds: number[], allLevels: TrainingLevel[]) {
  if (!selectedIds.length) return 'Select at least one training level.';
  const orderById = new Map(allLevels.map((level) => [level.id, level.displayOrder]));
  const orders = selectedIds
    .map((id) => orderById.get(id))
    .filter((order): order is number => Number.isFinite(order))
    .sort((a, b) => a - b);
  if (orders.length !== selectedIds.length) return 'Package contains an invalid level.';
  for (let i = 1; i < orders.length; i += 1) {
    if (orders[i] !== orders[i - 1] + 1) return 'Package levels must be contiguous.';
  }
  return null;
}

function validatePackages(allLevels: TrainingLevel[]) {
  if (!allLevels.length) return 'This program has no CI training levels to package.';
  if (!packages.length) return 'Add at least one training package.';
  const orders = new Set<number>();
  const codes = new Set<string>();
  const usedLevels = new Set<number>();
  for (const pkg of packages) {
    if (!pkg.name.trim() || !pkg.code.trim()) return 'Each package needs a name and code.';
    if (orders.has(pkg.packageOrder)) return 'Package order must be unique.';
    orders.add(pkg.packageOrder);
    const code = pkg.code.trim().toLowerCase();
    if (codes.has(code)) return 'Package code must be unique.';
    codes.add(code);
    if (Number(pkg.fee) < 0 || pkg.fee.trim() === '') return 'Each package needs a valid fee.';
    const levelError = validatePackageLevels(pkg.trainingLevelIds, allLevels);
    if (levelError) return levelError;
    for (const id of pkg.trainingLevelIds) {
      if (usedLevels.has(id)) return 'Training levels cannot be used in more than one package.';
      usedLevels.add(id);
    }
  }
  const missingLevels = allLevels.filter((level) => !usedLevels.has(level.id));
  if (missingLevels.length) {
    return `Every CI training level must be included. Missing: ${missingLevels
      .map((level) => level.name || level.code || `Level ${level.displayOrder}`)
      .join(', ')}.`;
  }
  return null;
}
```

- [ ] **Step 4: Send packages on approval**

Before `approveCourseInstructor()`:

```ts
const levels = levelsQuery.data ?? [];
const packageError = validatePackages(levels);
if (packageError) {
  toast({ title: 'Validation error', description: packageError, variant: 'destructive' });
  return;
}
```

Call:

```ts
await approveCourseInstructor(instructor.id, {
  validFrom,
  validUntil,
  trainingPackages: packages.map((pkg) => ({
    name: pkg.name.trim(),
    code: pkg.code.trim(),
    description: pkg.description.trim() || undefined,
    packageOrder: pkg.packageOrder,
    fee: Number(pkg.fee),
    trainingLevelIds: pkg.trainingLevelIds,
  })),
});
```

- [ ] **Step 5: Add modal UI**

Before the `return`, add these helpers:

```tsx
const sortedTrainingLevels = (levelsQuery.data ?? [])
  .slice()
  .sort((a, b) =>
    a.displayOrder === b.displayOrder
      ? a.id - b.id
      : a.displayOrder - b.displayOrder,
  );

const updatePackage = (
  index: number,
  patch: Partial<ApprovalPackageForm>,
) => {
  setPackages((prev) =>
    prev.map((pkg, currentIndex) =>
      currentIndex === index ? { ...pkg, ...patch } : pkg,
    ),
  );
};

const togglePackageLevel = (index: number, levelId: number) => {
  setPackages((prev) =>
    prev.map((pkg, currentIndex) => {
      if (currentIndex !== index) return pkg;
      const hasLevel = pkg.trainingLevelIds.includes(levelId);
      return {
        ...pkg,
        trainingLevelIds: hasLevel
          ? pkg.trainingLevelIds.filter((id) => id !== levelId)
          : [...pkg.trainingLevelIds, levelId],
      };
    }),
  );
};

const coveredLevelCount = new Set(
  packages.flatMap((pkg) => pkg.trainingLevelIds),
).size;
```

In the form, after validity dates, add this compact package builder:

```tsx
<div className="space-y-3 border-t pt-4">
  <div className="flex items-center justify-between gap-3">
    <Label>Training packages</Label>
    <span className="text-xs text-muted-foreground">
      {coveredLevelCount} / {sortedTrainingLevels.length} levels covered
    </span>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() =>
        setPackages((prev) => [
          ...prev,
          {
            name: `Package ${prev.length + 1}`,
            code: `PKG-${prev.length + 1}`,
            description: '',
            packageOrder: prev.length + 1,
            fee: '',
            trainingLevelIds: [],
          },
        ])
      }
    >
      <Plus className="mr-2 h-4 w-4" />
      Package
    </Button>
  </div>

  {packages.map((pkg, index) => (
    <div key={`${pkg.code}-${index}`} className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Package {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={packages.length === 1}
          onClick={() =>
            setPackages((prev) =>
              prev
                .filter((_, currentIndex) => currentIndex !== index)
                .map((item, nextIndex) => ({
                  ...item,
                  packageOrder: nextIndex + 1,
                })),
            )
          }
          aria-label="Remove package"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`package-name-${index}`}>Name</Label>
          <Input
            id={`package-name-${index}`}
            value={pkg.name}
            onChange={(event) =>
              updatePackage(index, { name: event.target.value })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`package-code-${index}`}>Code</Label>
          <Input
            id={`package-code-${index}`}
            value={pkg.code}
            onChange={(event) =>
              updatePackage(index, { code: event.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`package-fee-${index}`}>Fee</Label>
          <Input
            id={`package-fee-${index}`}
            type="number"
            min="0"
            step="0.01"
            value={pkg.fee}
            onChange={(event) =>
              updatePackage(index, { fee: event.target.value })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`package-description-${index}`}>Description</Label>
          <Input
            id={`package-description-${index}`}
            value={pkg.description}
            onChange={(event) =>
              updatePackage(index, { description: event.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Training levels</Label>
        <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
          {levelsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading levels...</p>
          ) : sortedTrainingLevels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No CI training levels found for this program.
            </p>
          ) : (
            sortedTrainingLevels.map((level) => (
              <label
                key={level.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={pkg.trainingLevelIds.includes(level.id)}
                  onChange={() => togglePackageLevel(index, level.id)}
                />
                <span>
                  {level.displayOrder}. {level.name} ({level.code})
                </span>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  ))}
</div>
```

Keep the modal width around `sm:max-w-[720px]` because level checkboxes need space.

- [ ] **Step 6: Run frontend validation**

Run:

```bash
npm run lint
npm run build
```

Expected: lint has no errors; build passes.

---

### Task 5: Remove General Package UI From Admin Programs

**Files:**
- Modify: `IPA-frontend/app/admin/profile/components/ProgramManagement.tsx`
- Modify or delete: `IPA-frontend/app/admin/catalog/ci-training-packages/page.tsx`
- Modify: `IPA-frontend/app/admin/ci-training/ci-training-section.tsx`

- [ ] **Step 1: Remove program-level package tab**

In `ProgramManagement.tsx`, remove:

```ts
import { CITrainingPackagesManager } from '@/app/admin/catalog/ci-training-packages/page';
```

Remove the `Packages` subtab from `CITrainingCatalogPanel`. The CI Training section under Programs should only manage the CI training level ladder.

- [ ] **Step 2: Remove packages tab from admin CI training page**

In `ci-training-section.tsx`, remove the import and tab:

```ts
import { CITrainingPackagesManager } from '../catalog/ci-training-packages/page';
```

Remove:

```tsx
<TabsTrigger value="packages">Packages</TabsTrigger>
<TabsContent value="packages">
  <CITrainingPackagesManager />
</TabsContent>
```

- [ ] **Step 3: Delete or quarantine catalog page**

Preferred: delete `app/admin/catalog/ci-training-packages/page.tsx` because there is no `/admin/catalog` workflow and the feature is CI-specific.

If deletion causes imports to fail, first remove all imports from Program and CI Training sections, then delete the route.

- [ ] **Step 4: Run frontend build**

Run:

```bash
npm run build
```

Expected: route list no longer includes `/admin/catalog/ci-training-packages`.

---

### Task 6: CI Platform Package Page

**Files:**
- Modify: `IPA-frontend/services/ci-training.service.ts`
- Modify: `IPA-frontend/app/ci/training/packages/page.tsx`

- [ ] **Step 1: Align package type with backend assignment response**

Update type:

```ts
export interface CITrainingPackageItem {
  id: number;
  programId: number;
  name: string;
  code: string;
  description?: string | null;
  packageOrder: number;
  trainingLevelIds: number[];
  fee: number;
  currency?: string;
  isActive: boolean;
  purchaseStatus: 'UNPAID' | 'PENDING' | 'PAID';
  isPurchased: boolean;
}
```

- [ ] **Step 2: Fix package status rendering**

In `app/ci/training/packages/page.tsx`, render:

```tsx
{pkg.purchaseStatus === 'PAID' ? (
  <Badge className="bg-green-100 text-green-800">
    <CheckCircle className="mr-1 h-3.5 w-3.5" />
    Purchased
  </Badge>
) : pkg.purchaseStatus === 'PENDING' ? (
  <Badge variant="secondary">Payment pending</Badge>
) : (
  <Badge variant="secondary">Available</Badge>
)}
```

Disable purchase for pending packages:

```tsx
disabled={purchasingId != null || pkg.purchaseStatus === 'PENDING'}
```

- [ ] **Step 3: Update empty state copy**

Use:

```tsx
No training packages have been assigned to your profile yet.
```

- [ ] **Step 4: Run frontend build**

Run:

```bash
npm run build
```

Expected: build passes and `/ci/training/packages` renders.

---

### Task 7: Verification Scenario

**Manual scenario:**
- Create or identify a program with CI training levels.
- Create a pending CI application for that program.
- Admin tries approving the CI with one CI training level left out.
- Confirm approval is blocked with a missing-level validation message.
- Admin approves the CI and creates packages that cover every program CI training level exactly once:
  - Package 1: first contiguous set of levels.
  - Package 2: remaining contiguous set of levels.
- Login as that CI.
- Visit `/ci/training/packages`.
- Confirm only those two packages are visible.
- Buy Package 1.
- Confirm Package 1 becomes purchased and Package 2 remains available or next-purchasable.
- Visit `/ci/training/progress`.
- Confirm all program CI training levels exist in progress because the assigned packages cover the full ladder.

**Backend commands:**

Run from `C:\Users\Administrator\Desktop\IPA\ipa-new`:

```bash
npm run build
npm run test:e2e
```

Expected: build passes; e2e suite passes or reports only unrelated existing failures.

**Frontend commands:**

Run from `C:\Users\Administrator\Desktop\IPA\IPA-frontend`:

```bash
npm run lint
npm run build
```

Expected: lint has no errors; build passes.

---

## Self-Review Notes

- Spec coverage: Covers admin approval package creation, required full-level package coverage, CI-specific persistence, CI package listing, CI purchase validation, progress bootstrap, and removal of general admin package UI.
- Placeholder scan: No `TBD` or deferred implementation steps.
- Type consistency: Frontend `trainingPackages` matches backend `ApproveCiApplicationDto`; backend purchase flow treats CI package IDs as assignment IDs in the CI context.
