// Testing pages for comparing local charts against live versions

import { Router } from "express"
import React from "react"

import { renderToHtmlPage, expectInt } from "../serverUtils/serverUtil.js"
import { OldChart, Chart } from "../db/model/Chart.js"
import { Head } from "../site/Head.js"
import * as db from "../db/db.js"
import {
    ADMIN_BASE_URL,
    BAKED_GRAPHER_URL,
    BAKED_BASE_URL,
} from "../settings/serverSettings.js"
import {
    excludeUndefined,
    parseIntOrUndefined,
    Url,
    queryParamsToStr,
} from "@ourworldindata/utils"
import { grapherToSVG } from "../baker/GrapherImageBaker.js"
import {
    ChartTypeName,
    EntitySelectionMode,
    GrapherTabOption,
    StackMode,
} from "@ourworldindata/types"

const IS_LIVE = ADMIN_BASE_URL === "https://owid.cloud"
const DEFAULT_COMPARISON_URL = "https://ourworldindata.org"

const testPageRouter = Router()

interface ChartItem {
    id: number
    slug: string
}

function checkHasComparisonView(comparisonUrl: string): boolean {
    if (!comparisonUrl) return false
    if (IS_LIVE && comparisonUrl === DEFAULT_COMPARISON_URL) return false
    return true
}

function getViewPropsFromQueryParams(
    params: Omit<EmbedTestPageQueryParams, "originalUrl">
): Pick<EmbedTestPageProps, "comparisonUrl" | "hasComparisonView"> {
    const comparisonUrl = params.comparisonUrl ?? DEFAULT_COMPARISON_URL
    const hasComparisonView = checkHasComparisonView(comparisonUrl)

    return { comparisonUrl, hasComparisonView }
}

function parseStringArrayOrUndefined(param: string | undefined): string[] {
    if (param === undefined) return []
    return param.split(",")
}

function parseIntArrayOrUndefined(param: string | undefined): number[] {
    return excludeUndefined(
        parseStringArrayOrUndefined(param).map(parseIntOrUndefined)
    )
}

interface EmbedTestPageQueryParams {
    readonly originalUrl: string
    readonly comparisonUrl?: string
    readonly perPage?: string
    readonly page?: string
    readonly random?: string
    readonly tab?: GrapherTabOption
    readonly type?: ChartTypeName
    readonly logLinear?: string
    readonly comparisonLines?: string
    readonly stackMode?: StackMode
    readonly relativeToggle?: string
    readonly categoricalLegend?: string
    readonly mixedTimeTypes?: string
    readonly addCountryMode?: EntitySelectionMode
    readonly ids?: string
    readonly datasetIds?: string
    readonly namespace?: string
    readonly namespaces?: string
}

async function propsFromQueryParams(
    params: EmbedTestPageQueryParams
): Promise<EmbedTestPageProps> {
    const page = params.page
        ? expectInt(params.page)
        : params.random
        ? Math.floor(1 + Math.random() * 180) // Sample one of 180 pages. Some charts won't ever get picked but good enough.
        : 1
    const perPage = parseIntOrUndefined(params.perPage) ?? 20
    const ids = parseIntArrayOrUndefined(params.ids)
    const datasetIds = parseIntArrayOrUndefined(params.datasetIds)
    const namespaces =
        parseStringArrayOrUndefined(params.namespaces) ??
        (params.namespace ? [params.namespace] : [])

    let query = Chart.createQueryBuilder("charts")
        .where("publishedAt IS NOT NULL")
        .limit(perPage)
        .offset(perPage * (page - 1))
        .orderBy("id", "DESC")

    let tab = params.tab

    if (params.type) {
        if (params.type === ChartTypeName.WorldMap) {
            query = query.andWhere(`config->>"$.hasMapTab" = "true"`)
            tab = tab || GrapherTabOption.map
        } else {
            if (params.type === "LineChart") {
                query = query.andWhere(
                    `(
                        config->"$.type" = "LineChart"
                        OR config->"$.type" IS NULL
                    ) AND COALESCE(config->>"$.hasChartTab", "true") = "true"`
                )
            } else {
                query = query.andWhere(
                    `config->"$.type" = :type AND COALESCE(config->>"$.hasChartTab", "true") = "true"`,
                    { type: params.type }
                )
            }
            tab = tab || GrapherTabOption.chart
        }
    }

    if (params.logLinear) {
        query = query.andWhere(
            `config->>'$.yAxis.canChangeScaleType' = "true" OR config->>'$.xAxis.canChangeScaleType'  = "true"`
        )
        tab = GrapherTabOption.chart
    }

    if (params.comparisonLines) {
        query = query.andWhere(`config->'$.comparisonLines[0].yEquals' != ''`)
        tab = GrapherTabOption.chart
    }

    if (params.stackMode) {
        query = query.andWhere(`config->'$.stackMode' = :stackMode`, {
            stackMode: params.stackMode,
        })
        tab = GrapherTabOption.chart
    }

    if (params.relativeToggle) {
        query = query.andWhere(`config->>'$.hideRelativeToggle' = "false"`)
        tab = GrapherTabOption.chart
    }

    if (params.categoricalLegend) {
        // This is more of a heuristic, since this query can potentially include charts that don't
        // have a visible categorial legend, and can leave out some that have one.
        // But in practice it seems to work reasonably well.
        query = query.andWhere(
            `json_length(config->'$.map.colorScale.customCategoryColors') > 1`
        )
        tab = GrapherTabOption.map
    }

    if (params.mixedTimeTypes) {
        query = query.andWhere(
            `
            (
                SELECT COUNT(DISTINCT CASE
                    WHEN variables.display->"$.yearIsDay" IS NULL
                    THEN "year"
                    ELSE "day"
                END) as timeTypeCount
                FROM variables
                JOIN chart_dimensions ON chart_dimensions.variableId = variables.id
                WHERE chart_dimensions.chartId = charts.id
            ) >= 2
        `
        )
    }

    if (params.addCountryMode) {
        const mode = params.addCountryMode
        if (mode === EntitySelectionMode.MultipleEntities) {
            query = query.andWhere(
                `config->'$.addCountryMode' IS NULL OR config->'$.addCountryMode' = :mode`,
                {
                    mode: EntitySelectionMode.MultipleEntities,
                }
            )
        } else {
            query = query.andWhere(`config->'$.addCountryMode' = :mode`, {
                mode,
            })
        }
    }

    if (ids.length > 0) {
        query = query.andWhere(`charts.id IN (${params.ids})`)
    }

    if (tab === GrapherTabOption.map) {
        query = query.andWhere(`config->>"$.hasMapTab" = "true"`)
    } else if (tab === GrapherTabOption.chart) {
        query = query.andWhere(
            `COALESCE(config->>"$.hasChartTab", "true") = "true"`
        )
    }

    if (datasetIds.length > 0) {
        const datasetIds = params.datasetIds
        query.andWhere(
            `
            EXISTS(
                SELECT *
                FROM variables
                INNER JOIN chart_dimensions ON chart_dimensions.variableId = variables.id
                WHERE variables.datasetId IN (:datasetIds)
                AND chart_dimensions.chartId = charts.id
            )
        `,
            { datasetIds }
        )
    }

    if (namespaces.length > 0) {
        query.andWhere(
            `
            EXISTS(
                SELECT *
                FROM datasets
                INNER JOIN variables ON variables.datasetId = datasets.id
                INNER JOIN chart_dimensions ON chart_dimensions.variableId = variables.id
                WHERE datasets.namespace IN (:namespaces)
                AND chart_dimensions.chartId = charts.id
            )
        `,
            { namespaces: namespaces }
        )
    }

    const charts: ChartItem[] = (await query.getMany()).map((c) => ({
        id: c.id,
        slug: c.config.slug ?? "",
    }))

    if (tab) {
        charts.forEach((c) => (c.slug += `?tab=${tab}`))
    }

    const count = await query.getCount()
    const numPages = Math.ceil(count / perPage)

    const originalUrl = Url.fromURL(params.originalUrl)
    const prevPageUrl =
        page > 1
            ? originalUrl.updateQueryParams({ page: (page - 1).toString() })
                  .fullUrl
            : undefined
    const nextPageUrl =
        page < numPages
            ? originalUrl.updateQueryParams({ page: (page + 1).toString() })
                  .fullUrl
            : undefined

    const viewProps = getViewPropsFromQueryParams(params)

    return {
        ...viewProps,
        prevPageUrl: prevPageUrl,
        nextPageUrl: nextPageUrl,
        charts: charts,
        currentPage: page,
        totalPages: numPages,
    }
}

interface EmbedTestPageProps {
    prevPageUrl?: string
    nextPageUrl?: string
    currentPage?: number
    totalPages?: number
    charts: ChartItem[]
    comparisonUrl: string
    hasComparisonView: boolean
}

function EmbedTestPage(props: EmbedTestPageProps) {
    const style = `
        html, body {
            height: 100%;
            margin: 0;
            background-color: #f1f1f1;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        }

        figure, iframe {
            border: 0;
            flex: 1;
            height: 450px;
            margin: 10px;
        }

        figure {
            padding-top: 3px;
        }

        .row {
            padding: 10px;
            margin: 0;
            border-bottom: 1px solid #ddd;
        }

        .side-by-side {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
        }

        h3 {
            width: 50%;
            text-align: center;
            margin: 0;
        }

        nav.pagination {
            width: 100%;
            text-align: center;
            padding: 15px;
        }

        .chart-id {
            font-size: 18px;
            font-weight: bold;
            padding-top: 10px;
            text-align: center;
        }

        .chart-id a {
            text-decoration: underline;
            text-decoration-color: #ccc;
        }
    `
    return (
        <html>
            <Head
                canonicalUrl=""
                pageTitle="Test Embeds"
                baseUrl={BAKED_BASE_URL}
            >
                <style dangerouslySetInnerHTML={{ __html: style }} />
            </Head>
            <body>
                <div className="row">
                    <div className="side-by-side">
                        {props.hasComparisonView && (
                            <h3>{props.comparisonUrl}</h3>
                        )}
                        <h3>{BAKED_BASE_URL}</h3>
                    </div>
                </div>
                {props.charts.map((chart) => (
                    <div key={chart.slug} className="row">
                        <div className="chart-id">
                            <a
                                href={queryParamsToStr({
                                    ids: chart.id.toString(),
                                    comparisonUrl: props.comparisonUrl,
                                })}
                            >
                                {chart.id}
                            </a>
                        </div>
                        <div className="side-by-side">
                            {props.hasComparisonView && (
                                <iframe
                                    src={`${props.comparisonUrl}/grapher/${chart.slug}`}
                                    loading="lazy"
                                />
                            )}
                            <figure
                                data-grapher-src={`${BAKED_GRAPHER_URL}/${chart.slug}`}
                            />
                        </div>
                    </div>
                ))}
                <nav className="pagination">
                    {props.prevPageUrl && (
                        <a href={props.prevPageUrl}>&lt;&lt; Prev</a>
                    )}{" "}
                    {props.currentPage !== undefined &&
                        props.totalPages !== undefined &&
                        `Page ${props.currentPage} of ${props.totalPages}`}{" "}
                    {props.nextPageUrl && (
                        <a href={props.nextPageUrl}>Next &gt;&gt;</a>
                    )}
                </nav>
                <script src={`${BAKED_GRAPHER_URL}/embedCharts.js`} />
            </body>
        </html>
    )
}

testPageRouter.get("/embeds", async (req, res) => {
    const props = await propsFromQueryParams({
        ...req.query,
        originalUrl: req.originalUrl,
    })
    res.send(renderToHtmlPage(<EmbedTestPage {...props} />))
})

testPageRouter.get("/embeds/:id", async (req, res) => {
    const id = req.params.id
    const chart = await Chart.createQueryBuilder()
        .where("id = :id", { id: id })
        .getOne()
    const viewProps = await getViewPropsFromQueryParams(req.query)
    if (chart) {
        const charts = [
            {
                id: chart.id,
                slug: `${chart.config.slug}${
                    req.query.tab ? `?tab=${req.query.tab}` : ""
                }`,
            },
        ]
        res.send(
            renderToHtmlPage(
                <EmbedTestPage
                    charts={charts}
                    comparisonUrl={DEFAULT_COMPARISON_URL}
                    hasComparisonView={viewProps.hasComparisonView}
                />
            )
        )
    } else {
        res.send("Could not find chart ID")
    }
})

function PreviewTestPage(props: { charts: any[] }) {
    const style = `
        html, body {
            height: 100%;
            margin: 0;
        }

        img {
            width: 45%;
        }

        nav.pagination {
            width: 100%;
            text-align: center;
        }
    `
    return (
        <html>
            <head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <title>Test Previews</title>
                <style dangerouslySetInnerHTML={{ __html: style }} />
            </head>
            <body>
                {props.charts.map((chart) => (
                    <div key={chart.slug} className="row">
                        <a
                            href={`https://ourworldindata.org/grapher/${chart.slug}`}
                        >
                            <img
                                src={`https://ourworldindata.org/grapher/exports/${chart.slug}.svg`}
                            />
                        </a>
                        <a href={`/grapher/${chart.slug}`}>
                            <img src={`/grapher/exports/${chart.slug}.svg`} />
                        </a>
                    </div>
                ))}
            </body>
        </html>
    )
}

function EmbedVariantsTestPage(
    props: Omit<EmbedTestPageProps, "comparisonUrl">
) {
    const style = `
        html, body {
            height: 100%;
            margin: 0;
            background-color: #f1f1f1;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        }

        figure, iframe {
            border: 0;
            flex: 1;
            height: 450px;
            margin: 10px;
        }

        .row {
            padding: 10px;
            margin: 0;
            border-bottom: 1px solid #ddd;
        }

        .side-by-side {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
        }

        h3 {
            width: 50%;
            text-align: center;
            margin: 0;
        }

        nav.pagination {
            width: 100%;
            text-align: center;
            padding: 15px;
        }

        .chart-id {
            font-size: 18px;
            font-weight: bold;
            padding-top: 10px;
            text-align: center;
        }
    `
    return (
        <html>
            <head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <title>Test Embed Variants</title>
                <style dangerouslySetInnerHTML={{ __html: style }} />
            </head>
            <body>
                {props.charts.map((chart) => (
                    <div key={chart.slug} className="row">
                        <div className="chart-id">{chart.id}</div>
                        <div className="side-by-side">
                            {props.hasComparisonView && (
                                <iframe
                                    src={`${BAKED_GRAPHER_URL}/${chart.slug}`}
                                />
                            )}
                            <figure
                                data-grapher-src={`${BAKED_GRAPHER_URL}/${chart.slug}`}
                            />
                        </div>
                    </div>
                ))}
                <nav className="pagination">
                    {props.prevPageUrl && (
                        <a href={props.prevPageUrl}>&lt;&lt; Prev</a>
                    )}{" "}
                    {props.currentPage !== undefined &&
                        props.totalPages !== undefined &&
                        `Page ${props.currentPage} of ${props.totalPages}`}{" "}
                    {props.nextPageUrl && (
                        <a href={props.nextPageUrl}>Next &gt;&gt;</a>
                    )}
                </nav>
                <script src={`${BAKED_GRAPHER_URL}/embedCharts.js`} />
            </body>
        </html>
    )
}

testPageRouter.get("/previews", async (req, res) => {
    const rows = await db.queryMysql(`SELECT config FROM charts LIMIT 200`)
    const charts = rows.map((row: any) => JSON.parse(row.config))

    res.send(renderToHtmlPage(<PreviewTestPage charts={charts} />))
})

testPageRouter.get("/embedVariants", async (req, res) => {
    const rows = await db.queryMysql(`SELECT config FROM charts WHERE id=64`)
    const charts = rows.map((row: any) => JSON.parse(row.config))
    const viewProps = await getViewPropsFromQueryParams(req.query)

    res.send(
        renderToHtmlPage(
            <EmbedVariantsTestPage
                charts={charts}
                hasComparisonView={viewProps.hasComparisonView}
            />
        )
    )
})

testPageRouter.get("/:slug.svg", async (req, res) => {
    const grapher = await OldChart.getBySlug(req.params.slug)
    const vardata = await grapher.getVariableData()
    res.send(await grapherToSVG(grapher.config, vardata))
})

export { testPageRouter }
