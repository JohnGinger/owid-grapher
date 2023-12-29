import React from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome/index.js"
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons"
import { SubNavId } from "@ourworldindata/types"

export interface SubnavItem {
    label: string
    href: string
    id: string
    highlight?: boolean
    parentId?: string
}

export const landingPageSlugs: { [key in SubNavId]: string } = {
    about: "about",
    coronavirus: "coronavirus",
    co2: "co2-and-greenhouse-gas-emissions",
    energy: "energy",
    forests: "forests-and-deforestation",
    biodiversity: "biodiversity",
    water: "clean-water-sanitation",
    explorers: "food-explorers",
}

export const subnavs: { [key in SubNavId]: SubnavItem[] } = {
    about: [
        // `label` is shown in the UI, `id` is specified as a formatting option
        // on a page (the top html comment in WordPress)
        { label: "About", href: `/${landingPageSlugs.about}`, id: "about" },
        { label: "Team", href: "/team", id: "team" },
        { label: "Organization", href: "/organization", id: "organization" },
        { label: "Funding", href: "/funding", id: "supporters" },
        { label: "FAQs", href: "/faqs", id: "faqs" },
        { label: "Audience & Coverage", href: "/coverage", id: "coverage" },
        {
            label: "History",
            href: "/history-of-our-world-in-data",
            id: "history",
        },
        { label: "Grapher", href: "/owid-grapher", id: "grapher" },
        { label: "Jobs", href: "/jobs", id: "jobs" },
        { label: "Contact", href: "/about#contact", id: "contact" },
    ],
    coronavirus: [
        {
            label: "Coronavirus",
            href: `/${landingPageSlugs.coronavirus}`,
            id: "coronavirus",
        },
        {
            label: "By country",
            href: "/coronavirus#coronavirus-country-profiles",
            id: "by-country",
            highlight: true,
        },
        {
            label: "Data explorer",
            href: "/explorers/coronavirus-data-explorer",
            id: "data-explorer",
            highlight: true,
        },
        { label: "Deaths", href: "/covid-deaths", id: "deaths" },
        { label: "Cases", href: "/covid-cases", id: "cases" },
        { label: "Tests", href: "/coronavirus-testing", id: "testing" },
        {
            label: "Hospitalizations",
            href: "/covid-hospitalizations",
            id: "hospitalizations",
        },
        {
            label: "Vaccinations",
            href: "/covid-vaccinations",
            id: "vaccinations",
        },
        {
            label: "Mortality risk",
            href: "/mortality-risk-covid",
            id: "mortality-risk",
        },
        {
            label: "Excess mortality",
            href: "/excess-mortality-covid",
            id: "excess-mortality",
        },
        {
            label: "Policy responses",
            href: "/policy-responses-covid",
            id: "policy-responses",
        },
    ],
    co2: [
        {
            label: "CO₂ and GHG Emissions",
            href: `/${landingPageSlugs.co2}`,
            id: "co2-and-ghg-emissions",
            highlight: true,
        },
        {
            label: "By country",
            href: "/co2-and-greenhouse-gas-emissions#co2-and-greenhouse-gas-emissions-country-profiles",
            id: "by-country",
        },
        {
            label: "Data explorer",
            href: "/explorers/co2",
            id: "co2-data-explorer",
        },
        { label: "CO₂ emissions", href: "/co2-emissions", id: "co2-emissions" },
        { label: "CO₂ by fuel", href: "/emissions-by-fuel", id: "by-fuel" },
        {
            label: "GHG emissions",
            href: "/greenhouse-gas-emissions",
            id: "ghg-emissions",
        },
        { label: "By sector", href: "/emissions-by-sector", id: "by-sector" },
        {
            label: "Atmospheric concentrations",
            href: "/atmospheric-concentrations",
            id: "atm-concentrations",
        },
        {
            label: "Climate impacts",
            href: "/explorers/climate-change",
            id: "climate-impacts",
        },
    ],
    energy: [
        {
            label: "Energy",
            href: `/${landingPageSlugs.energy}`,
            id: "energy",
            highlight: true,
        },
        {
            label: "By country",
            href: "/energy#country-profiles",
            id: "by-country",
        },
        {
            label: "Data explorer",
            href: "/explorers/energy",
            id: "energy-data-explorer",
        },
        { label: "Energy access", href: "/energy-access", id: "energy-access" },
        {
            label: "Production & Consumption",
            href: "/energy-production-consumption",
            id: "production-consumption",
        },
        { label: "Energy mix", href: "/energy-mix", id: "energy-mix" },
        {
            label: "Electricity mix",
            href: "/electricity-mix",
            id: "electricity-mix",
        },
        { label: "Fossil fuels", href: "/fossil-fuels", id: "fossil-fuels" },
        {
            label: "Renewables",
            href: "/renewable-energy",
            id: "renewable-energy",
        },
        { label: "Nuclear", href: "/nuclear-energy", id: "nuclear-energy" },
        { label: "Transport", href: "/transport", id: "transport" },
    ],
    forests: [
        {
            label: "Forests",
            href: `/${landingPageSlugs.forests}`,
            id: "forests",
        },
        {
            label: "Forest area",
            href: "/forest-area",
            id: "forest-area",
        },
        {
            label: "Deforestation",
            href: "/deforestation",
            id: "deforestation",
        },
        {
            label: "Afforestation",
            href: "/afforestation",
            id: "afforestation",
        },
        {
            label: "Drivers of Deforestation",
            href: "/drivers-of-deforestation",
            id: "drivers-of-deforestation",
        },
        {
            label: "Palm oil",
            href: "/palm-oil",
            id: "palm-oil",
        },
        {
            label: "Soy",
            href: "/soy",
            id: "soy",
        },
    ],
    biodiversity: [
        {
            label: "Biodiversity",
            href: `/${landingPageSlugs.biodiversity}`,
            id: "biodiversity",
            highlight: true,
        },
        {
            label: "Biodiversity and Wildlife",
            href: "/biodiversity-and-wildlife",
            id: "biodiversity-and-wildlife",
        },
        {
            label: "Mammals",
            href: "/mammals",
            id: "mammals",
        },
        {
            label: "Birds",
            href: "/birds",
            id: "birds",
        },
        {
            label: "Fish and Overfishing",
            href: "/fish-and-overfishing",
            id: "fish",
        },
        {
            label: "Coral reefs",
            href: "/coral-reefs",
            id: "coral-reefs",
        },
        {
            label: "Living Planet Index",
            href: "/living-planet-index",
            id: "living-planet-index",
        },
        {
            label: "Extinctions",
            href: "/extinctions",
            id: "extinctions",
        },
        {
            label: "Threats to Wildlife",
            href: "/threats-to-wildlife",
            id: "threats-to-wildlife",
        },
        {
            label: "Poaching",
            href: "/poaching-and-wildlife-trade",
            id: "poaching-and-wildlife-trade",
        },
        {
            label: "Habitat Loss",
            href: "/habitat-loss",
            id: "habitat-loss",
        },
        {
            label: "Protected areas and conservation",
            href: "/protected-areas-and-conservation",
            id: "protected-areas-and-conservation",
        },
    ],
    water: [
        {
            label: "Clean Water and Sanitation",
            href: `/${landingPageSlugs.water}`,
            id: "wash",
        },
        {
            label: "Data explorer",
            href: "/explorers/water-and-sanitation",
            id: "wash-data-explorer",
        },
        {
            label: "Drinking water",
            href: "/water-access",
            id: "drinking-water",
        },
        {
            label: "Sanitation",
            href: "/sanitation",
            id: "sanitation",
        },
        {
            label: "Handwashing",
            href: "/hygiene",
            id: "hygiene",
        },
    ],
    explorers: [
        {
            label: "Data Explorers",
            href: `/${landingPageSlugs.explorers}`,
            id: "food-explorers",
            highlight: true,
        },
        {
            label: "Global Food",
            href: "/explorers/global-food",
            id: "global-food",
        },
        {
            label: "Environmental Impacts of Food",
            href: "/explorers/food-footprints",
            id: "food-footprints",
        },
        {
            label: "Crop Yields",
            href: "/explorers/crop-yields",
            id: "crop-yields",
        },
        {
            label: "Fertilizers",
            href: "/explorers/fertilizers",
            id: "fertilizers",
        },
        {
            label: "Habitat Loss",
            href: "/explorers/habitat-loss",
            id: "habitat-loss",
        },
        {
            label: "Food Prices",
            href: "/explorers/food-prices",
            id: "food-prices",
        },
    ],
}

export const getSubnavItem = (
    id: string | undefined,
    subnavItems: SubnavItem[]
) => {
    // We want to avoid matching elements with potentially undefined id.
    // Static typing prevents id from being undefined but this might not be
    // the case in a future API powered version.
    return id ? subnavItems.find((item) => item.id === id) : undefined
}

export const getTopSubnavigationParentItem = (
    subnavId: SubNavId
): SubnavItem | undefined => {
    return subnavs[subnavId]?.[0]
}

export const SiteSubnavigation = ({
    subnavId,
    subnavCurrentId,
}: {
    subnavId: SubNavId
    subnavCurrentId?: string
}) => {
    const subnavLinks = subnavs[subnavId]
    return subnavLinks ? (
        <div className="offset-subnavigation">
            <div className="site-subnavigation">
                <div className="site-subnavigation-scroll">
                    <ul className="site-subnavigation-links">
                        {subnavLinks.map(
                            ({ href, label, id, highlight }, idx) => {
                                const classes: string[] = []
                                const dataTrackNote = [
                                    subnavId,
                                    "subnav",
                                    id,
                                ].join("_")
                                if (id === subnavCurrentId)
                                    classes.push("current")
                                if (highlight) classes.push("highlight")
                                return (
                                    <li
                                        className={
                                            (classes.length &&
                                                classes.join(" ")) ||
                                            ""
                                        }
                                        key={href}
                                    >
                                        <a
                                            href={href}
                                            data-track-note={dataTrackNote}
                                        >
                                            {label}
                                            {idx === 0 && (
                                                <FontAwesomeIcon
                                                    icon={faChevronLeft}
                                                />
                                            )}
                                        </a>
                                    </li>
                                )
                            }
                        )}
                    </ul>
                </div>
            </div>
        </div>
    ) : null
}
