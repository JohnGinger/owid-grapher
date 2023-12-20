import { ColumnSlug } from "@ourworldindata/utils"
import { ColumnTypeNames, CoreColumnDef } from "./CoreColumnDef.js"
import { CoreTable } from "./CoreTable.js"
import { OwidColumnDef, OwidTableSlugs } from "./OwidTableConstants.js"

export function timeColumnSlugFromColumnDef(
    def: OwidColumnDef
): OwidTableSlugs.day | OwidTableSlugs.year {
    return def.isDailyMeasurement ? OwidTableSlugs.day : OwidTableSlugs.year
}

export function makeOriginalTimeSlugFromColumnSlug(slug: ColumnSlug): string {
    return `${slug}-originalTime`
}

export function makeOriginalValueSlugFromColumnSlug(slug: ColumnSlug): string {
    return `${slug}-originalValue`
}

export function getOriginalTimeColumnSlug(
    table: CoreTable,
    slug: ColumnSlug
): ColumnSlug {
    const originalTimeSlug = makeOriginalTimeSlugFromColumnSlug(slug)
    if (table.has(originalTimeSlug)) return originalTimeSlug
    return table.timeColumn.slug
}

export function getOriginalValueColumnSlug(
    table: CoreTable,
    slug: ColumnSlug
): ColumnSlug | undefined {
    const originalValueSlug = makeOriginalValueSlugFromColumnSlug(slug)
    if (table.has(originalValueSlug)) return originalValueSlug
    return undefined
}

export function toPercentageColumnDef(
    columnDef: CoreColumnDef,
    type = ColumnTypeNames.Percentage
): CoreColumnDef {
    // drops all values that can hinder the correct display of a percentage column
    // (e.g. a "kWh" unit or a numDecimalPlaces value of 0)
    return {
        ...columnDef,
        type,
        unit: undefined,
        shortUnit: undefined,
        display: {
            ...columnDef.display,
            unit: undefined,
            shortUnit: undefined,
            numDecimalPlaces: undefined,
            conversionFactor: undefined,
        },
    }
}
