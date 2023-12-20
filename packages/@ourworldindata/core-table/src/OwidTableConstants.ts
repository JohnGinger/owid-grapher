import { CoreRow, Integer, Time, Year } from "./CoreTableConstants.js"
import { ColumnTypeNames, CoreColumnDef } from "./CoreColumnDef.js"
import {
    ColumnSlug,
    PrimitiveType,
    OwidProcessingLevel,
} from "@ourworldindata/utils"

export enum OwidTableSlugs {
    entityName = "entityName",
    entityColor = "entityColor",
    entityId = "entityId",
    entityCode = "entityCode",
    time = "time",
    day = "day",
    year = "year",
    date = "date",
}

enum OwidTableNames {
    Entity = "Entity",
    Code = "Code",
}

export type EntityName = string
export type EntityCode = string
export type EntityId = number

// Todo: coverage, datasetId, and datasetName can just be on source, right? or should we flatten source onto this?
export interface OwidColumnDef extends CoreColumnDef {
    owidVariableId?: number
    coverage?: string
    datasetId?: number
    datasetName?: string
    isDailyMeasurement?: boolean // todo: remove after mysql time refactor
    annotationsColumnSlug?: ColumnSlug
    nonRedistributable?: boolean
    skipParsing?: boolean
    catalogPath?: string
    owidProcessingLevel?: OwidProcessingLevel
    owidSchemaVersion?: number
}

export const OwidEntityNameColumnDef = {
    name: OwidTableNames.Entity,
    slug: OwidTableSlugs.entityName,
    type: ColumnTypeNames.EntityName,
}

export const OwidEntityIdColumnDef = {
    slug: OwidTableSlugs.entityId,
    type: ColumnTypeNames.EntityId,
}

export const OwidEntityCodeColumnDef = {
    name: OwidTableNames.Code,
    slug: OwidTableSlugs.entityCode,
    type: ColumnTypeNames.EntityCode,
}

export const StandardOwidColumnDefs: OwidColumnDef[] = [
    OwidEntityNameColumnDef,
    OwidEntityIdColumnDef,
    OwidEntityCodeColumnDef,
]

// This is a row with the additional columns specific to our OWID data model
export interface OwidRow extends CoreRow {
    entityName: EntityName
    time: Time
    entityCode?: EntityCode
    entityId?: EntityId
    year?: Year
    day?: Integer
    date?: string
}

export interface OwidVariableRow<ValueType extends PrimitiveType> {
    entityName: EntityName
    time: Time
    value: ValueType
    originalValue?: ValueType
}
