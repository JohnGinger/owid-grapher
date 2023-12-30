import type { GrapherProgrammaticInterface } from "./Grapher"

export const GRAPHER_EMBEDDED_FIGURE_ATTR = "data-grapher-src"
export const GRAPHER_EMBEDDED_FIGURE_CONFIG_ATTR = "data-grapher-config"

export const GRAPHER_PAGE_BODY_CLASS = "StandaloneGrapherOrExplorerPage"
export const GRAPHER_SETTINGS_DRAWER_ID = "grapher-settings-drawer"

export const GRAPHER_IS_IN_IFRAME_CLASS = "IsInIframe"

export const DEFAULT_GRAPHER_CONFIG_SCHEMA =
    "https://files.ourworldindata.org/schemas/grapher-schema.003.json"

export const DEFAULT_GRAPHER_ENTITY_TYPE = "country or region"
export const DEFAULT_GRAPHER_ENTITY_TYPE_PLURAL = "countries and regions"

export const DEFAULT_GRAPHER_WIDTH = 850
export const DEFAULT_GRAPHER_HEIGHT = 600

export const DEFAULT_GRAPHER_FRAME_PADDING = 16
export const STATIC_EXPORT_DETAIL_SPACING = 8

export const GRAPHER_DARK_TEXT = "#5b5b5b"

export enum CookieKey {
    isAdmin = "isAdmin",
}

export const BASE_FONT_SIZE = 16

export const ThereWasAProblemLoadingThisChart = `There was a problem loading this chart`

export const WorldEntityName = "World"

export const getVariableDataRoute = (
    dataApiUrl: string,
    variableId: number
): string => {
    if (dataApiUrl.includes("v1/indicators/")) {
        // fetching from Data API, e.g. https://api.ourworldindata.org/v1/indicators/123.data.json
        return `${dataApiUrl}${variableId}.data.json`
    } else {
        throw new Error(`dataApiUrl format not supported: ${dataApiUrl}`)
    }
}

export const getVariableMetadataRoute = (
    dataApiUrl: string,
    variableId: number
): string => {
    if (dataApiUrl.includes("v1/indicators/")) {
        // fetching from Data API, e.g. https://api.ourworldindata.org/v1/indicators/123.metadata.json
        return `${dataApiUrl}${variableId}.metadata.json`
    } else {
        throw new Error(`dataApiUrl format not supported: ${dataApiUrl}`)
    }
}

export enum Patterns {
    noDataPattern = "noDataPattern",
    noDataPatternForMapChart = "noDataPatternForMapChart",
}

export const grapherInterfaceWithHiddenControlsOnly: GrapherProgrammaticInterface =
    {
        hideRelativeToggle: true,
        hideTimeline: true,
        hideFacetControl: true,
        hideEntityControls: true,
        hideZoomToggle: true,
        hideNoDataAreaToggle: true,
        hideFacetYDomainToggle: true,
        hideXScaleToggle: true,
        hideYScaleToggle: true,
        hideMapProjectionMenu: true,
        hideTableFilterToggle: true,
        map: {
            hideTimeline: true,
        },
    }

export const grapherInterfaceWithHiddenTabsOnly: GrapherProgrammaticInterface =
    {
        hasChartTab: false,
        hasMapTab: false,
        hasTableTab: false,
    }
