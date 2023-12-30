import {
    getSelectedEntityNamesParam,
    GLOBAL_ENTITY_SELECTOR_DEFAULT_COUNTRY,
    GLOBAL_ENTITY_SELECTOR_ELEMENT,
    Grapher,
    GrapherProgrammaticInterface,
    GRAPHER_EMBEDDED_FIGURE_ATTR,
    GRAPHER_EMBEDDED_FIGURE_CONFIG_ATTR,
    hydrateGlobalEntitySelectorIfAny,
    migrateSelectedEntityNamesParam,
    SelectionArray,
} from "@ourworldindata/grapher"
import {
    Annotation,
    deserializeJSONFromHTML,
    fetchText,
    getWindowUrl,
    isArray,
    isMobile,
    isPresent,
    Url,
    GrapherTabOption,
    merge,
} from "@ourworldindata/utils"
import { action } from "mobx"
import React from "react"
import ReactDOM from "react-dom"
import { Explorer, ExplorerProps } from "../../explorer/Explorer.js"
import {
    EMBEDDED_EXPLORER_DELIMITER,
    EMBEDDED_EXPLORER_GRAPHER_CONFIGS,
    EMBEDDED_EXPLORER_PARTIAL_GRAPHER_CONFIGS,
    EXPLORER_EMBEDDED_FIGURE_PROPS_ATTR,
    EXPLORER_EMBEDDED_FIGURE_SELECTOR,
} from "../../explorer/ExplorerConstants.js"
import {
    ADMIN_BASE_URL,
    BAKED_GRAPHER_URL,
    DATA_API_URL,
} from "../../settings/clientSettings.js"
import { hydrateAnnotatingDataValue } from "../AnnotatingDataValue.js"
import Bugsnag from "@bugsnag/js"
import { embedDynamicCollectionGrapher } from "../collections/DynamicCollection.js"

const figuresFromDOM = (
    container: HTMLElement | Document = document,
    selector: string
) =>
    Array.from(
        container.querySelectorAll<HTMLElement>(`*[${selector}]`)
    ).filter(isPresent)

// Determine whether this device is powerful enough to handle
// loading a bunch of inline interactive charts
// 680px is also used in CSS – keep it in sync if you change this
export const shouldProgressiveEmbed = () =>
    !isMobile() ||
    window.screen.width > 680 ||
    pageContainsGlobalEntitySelector()

const pageContainsGlobalEntitySelector = () =>
    globalEntitySelectorElement() !== null

const globalEntitySelectorElement = () =>
    document.querySelector(GLOBAL_ENTITY_SELECTOR_ELEMENT)

class MultiEmbedder {
    private figuresObserver: IntersectionObserver | undefined
    selection: SelectionArray = new SelectionArray()
    graphersAndExplorersToUpdate: Set<SelectionArray> = new Set()

    constructor() {
        if (typeof window !== "undefined" && "IntersectionObserver" in window) {
            this.figuresObserver = new IntersectionObserver(
                this.onIntersecting.bind(this),
                {
                    rootMargin: "200%",
                }
            )
        } else if (
            typeof window === "object" &&
            typeof document === "object" &&
            !navigator.userAgent.includes("jsdom")
        ) {
            // only show the warning when we're in something that roughly resembles a browser
            console.warn(
                "IntersectionObserver not available; interactive embeds won't load on this page"
            )
            Bugsnag?.notify("IntersectionObserver not available")
        }
    }

    /**
     * Finds all <figure data-grapher-src="..."> and <figure
     * data-explorer-src="..."> elements in the document and loads the
     * iframeless interactive charts when the user's viewport approaches them.
     * Uses an IntersectionObserver (see constructor).
     *
     * BEWARE: this method is hardcoded in some scripts, make sure to check
     * thoroughly before making any changes.
     */
    embedAll() {
        this.observeFigures()
    }

    /**
     * Make the embedder aware of new <figure> elements that are injected into the DOM.
     *
     * Use this when you programmatically create/replace charts.
     */
    observeFigures(container: HTMLElement | Document = document) {
        const figures = figuresFromDOM(
            container,
            GRAPHER_EMBEDDED_FIGURE_ATTR
        ).concat(figuresFromDOM(container, EXPLORER_EMBEDDED_FIGURE_SELECTOR))

        figures.forEach((figure) => {
            this.figuresObserver?.observe(figure)
        })
    }

    async onIntersecting(entries: IntersectionObserverEntry[]) {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                this.renderInteractiveFigure(entry.target)
            }
        })
    }

    @action.bound
    async renderInteractiveFigure(figure: Element, annotation?: Annotation) {
        const isExplorer = figure.hasAttribute(
            EXPLORER_EMBEDDED_FIGURE_SELECTOR
        )

        const dataSrc = figure.getAttribute(
            isExplorer
                ? EXPLORER_EMBEDDED_FIGURE_SELECTOR
                : GRAPHER_EMBEDDED_FIGURE_ATTR
        )

        if (!dataSrc) return

        const hasPreview = isExplorer ? false : !!figure.querySelector("img")
        if (!shouldProgressiveEmbed() && hasPreview) return

        // Stop observing visibility as soon as possible, that is not before
        // shouldProgressiveEmbed gets a chance to reevaluate a possible change
        // in screen size on mobile (i.e. after a rotation). Stopping before
        // shouldProgressiveEmbed would prevent rendering interactive charts
        // when going from portrait to landscape mode (without page reload).
        this.figuresObserver?.unobserve(figure)

        const { fullUrl, queryStr, queryParams } = Url.fromURL(dataSrc)

        const common: GrapherProgrammaticInterface = {
            isEmbeddedInAnOwidPage: true,
            queryStr,
            adminBaseUrl: ADMIN_BASE_URL,
            bakedGrapherURL: BAKED_GRAPHER_URL,
            dataApiUrl: DATA_API_URL,
        }

        const html = await fetchText(fullUrl)

        if (isExplorer) {
            const explorerPropsAttr = figure.getAttribute(
                EXPLORER_EMBEDDED_FIGURE_PROPS_ATTR
            )
            const localProps = explorerPropsAttr
                ? JSON.parse(explorerPropsAttr)
                : {}
            let grapherConfigs = deserializeJSONFromHTML(
                html,
                EMBEDDED_EXPLORER_GRAPHER_CONFIGS
            )
            let partialGrapherConfigs = deserializeJSONFromHTML(
                html,
                EMBEDDED_EXPLORER_PARTIAL_GRAPHER_CONFIGS
            )
            if (isArray(grapherConfigs)) {
                grapherConfigs = grapherConfigs.map((grapherConfig) => ({
                    ...grapherConfig,
                    adminBaseUrl: ADMIN_BASE_URL,
                    bakedGrapherURL: BAKED_GRAPHER_URL,
                }))
            }
            if (isArray(partialGrapherConfigs)) {
                partialGrapherConfigs = partialGrapherConfigs.map(
                    (grapherConfig) => ({
                        ...grapherConfig,
                        adminBaseUrl: ADMIN_BASE_URL,
                        bakedGrapherURL: BAKED_GRAPHER_URL,
                    })
                )
            }
            const props: ExplorerProps = {
                ...common,
                ...deserializeJSONFromHTML(html, EMBEDDED_EXPLORER_DELIMITER),
                ...localProps,
                grapherConfigs,
                partialGrapherConfigs,
                queryStr,
                selection: new SelectionArray(
                    this.selection.selectedEntityNames
                ),
            }
            if (props.selection)
                this.graphersAndExplorersToUpdate.add(props.selection)
            ReactDOM.render(<Explorer {...props} />, figure)
        } else {
            figure.classList.remove("grapherPreview")

            const grapherPageConfig = deserializeJSONFromHTML(html)

            const figureConfigAttr = figure.getAttribute(
                GRAPHER_EMBEDDED_FIGURE_CONFIG_ATTR
            )
            const localConfig = figureConfigAttr
                ? JSON.parse(figureConfigAttr)
                : {}

            // make sure the tab of the active pane is visible
            if (figureConfigAttr) {
                const activeTab =
                    queryParams.tab ||
                    grapherPageConfig.tab ||
                    GrapherTabOption.chart
                if (activeTab === GrapherTabOption.chart)
                    localConfig.hasChartTab = true
                if (activeTab === GrapherTabOption.map)
                    localConfig.hasMapTab = true
                if (activeTab === GrapherTabOption.table)
                    localConfig.hasTableTab = true
            }

            const config = merge(grapherPageConfig, common, localConfig, {
                manager: {
                    selection: new SelectionArray(
                        this.selection.selectedEntityNames
                    ),
                },
                annotation,
            })
            if (config.manager?.selection)
                this.graphersAndExplorersToUpdate.add(config.manager.selection)

            const grapherRef = Grapher.renderGrapherIntoContainer(
                config,
                figure
            )

            // Special handling for shared collections
            if (window.location.pathname.startsWith("/collection/custom")) {
                embedDynamicCollectionGrapher(grapherRef, figure)
            }

            if (!grapherRef.current) return
            hydrateAnnotatingDataValue(grapherRef.current, figure)
        }
    }

    setUpGlobalEntitySelectorForEmbeds() {
        const element = globalEntitySelectorElement()
        if (!element) return

        const embeddedDefaultCountriesParam = element.getAttribute(
            GLOBAL_ENTITY_SELECTOR_DEFAULT_COUNTRY
        )

        const [defaultEntityNames, windowEntityNames] = [
            Url.fromQueryParams({
                country: embeddedDefaultCountriesParam || undefined,
            }),
            getWindowUrl(),
        ]
            .map(migrateSelectedEntityNamesParam)
            .map(getSelectedEntityNamesParam)

        this.selection = new SelectionArray(
            windowEntityNames ?? defaultEntityNames
        )

        hydrateGlobalEntitySelectorIfAny(
            this.selection,
            this.graphersAndExplorersToUpdate
        )
    }
}

export const MultiEmbedderSingleton = new MultiEmbedder()
