export { NestedSection, useNestedSectionRef } from "./NestedSection";
export {
  TablePageShell,
  TableSectionSurface,
  TableToolbarPanel,
  TableStatusBar,
  RawTableSurface,
  TableLoadingState,
  TableEmptyState,
} from "./table-shell";

/** Global list/table: toolbar, filters, sort, pagination, expandable rows. */
export { default as DataTable } from "./data-table";
export type {
  DataTableColumn,
  DataTableFilter,
  DataTableMultiSelectFilter,
  DataTableSortOption,
  DataTablePaginationMeta,
  DataTableExpandedSection,
  DataTableProps,
} from "./data-table";

/** @deprecated Use `DataTable` */
export { AdminTable } from "./data-table";
export type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableMultiSelectFilter,
  AdminTableSortOption,
  AdminTablePaginationMeta,
  AdminTableExpandedSection,
  AdminTableProps,
} from "./data-table";

export { SectionedDetail } from "./SectionedDetail";
export type {
  SectionType,
  SectionField,
  DetailSectionConfig,
  SectionedDetailProps,
} from "./SectionedDetail";
export {
  ExpandedDetailSurface,
  ExpandedDetailSection,
  DetailFieldsGrid,
  DetailField,
  DetailCard,
  DetailMessage,
} from "./detail-layout";

export { MultiSelectDropdown } from "./MultiSelectDropdown";
export type { MultiSelectOption } from "./MultiSelectDropdown";
