import React from "react"
import { observer } from "mobx-react"
import { computed, action, observable } from "mobx"
import classnames from "classnames"
import a from "indefinite"
import {
    Bounds,
    DEFAULT_BOUNDS,
    isTouchDevice,
    sortBy,
    isCountryName,
} from "@ourworldindata/utils"
import { Checkbox } from "@ourworldindata/components"
import { FuzzySearch } from "../controls/FuzzySearch"
import { faMagnifyingGlass, faCheck } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome/index.js"
import { SelectionArray } from "../selection/SelectionArray"
import { Modal } from "./Modal"
import { DEFAULT_GRAPHER_ENTITY_TYPE } from "../core/GrapherConstants"

export interface EntitySelectorModalManager {
    selection: SelectionArray
    canChangeEntity: boolean
    isSelectingData?: boolean
    tabBounds?: Bounds
    entityType?: string
    entityTypePlural?: string
    entitiesAreCountryLike?: boolean
}

interface SearchableEntity {
    name: string
}

interface SearchResultProps {
    result: SearchableEntity
    isMulti: boolean
    isChecked: boolean
    onSelect: (entityName: string) => void
}

class EntitySearchResult extends React.PureComponent<SearchResultProps> {
    render(): JSX.Element {
        const { result, isMulti, isChecked, onSelect } = this.props

        if (isMulti) {
            return (
                <li>
                    <Checkbox
                        label={result.name}
                        checked={isChecked}
                        onChange={(): void => onSelect(result.name)}
                    />
                </li>
            )
        } else {
            return (
                <li
                    className={"clickable" + (isChecked ? " selected" : "")}
                    onClick={(): void => onSelect(result.name)}
                >
                    {result.name}
                    {isChecked && <FontAwesomeIcon icon={faCheck} />}
                </li>
            )
        }
    }
}

@observer
export class EntitySelectorModal extends React.Component<{
    manager: EntitySelectorModalManager
}> {
    @observable searchInput: string = ""
    searchField!: HTMLInputElement

    @computed private get manager(): EntitySelectorModalManager {
        return this.props.manager
    }

    @computed private get tabBounds(): Bounds {
        return this.manager.tabBounds ?? DEFAULT_BOUNDS
    }

    @computed private get modalBounds(): Bounds {
        const maxWidth = 366
        const padWidth = Math.max(16, (this.tabBounds.width - maxWidth) / 2)
        return this.tabBounds.padHeight(16).padWidth(padWidth)
    }

    @computed private get selectionArray(): SelectionArray {
        return this.manager.selection
    }

    @computed get sortedAvailableEntities(): string[] {
        return sortBy(this.selectionArray.availableEntityNames)
    }

    @computed get isMulti(): boolean {
        return !this.manager.canChangeEntity
    }

    @computed private get entityType(): string {
        return this.manager.entityType ?? DEFAULT_GRAPHER_ENTITY_TYPE
    }

    @computed get fuzzy(): FuzzySearch<SearchableEntity> {
        return new FuzzySearch(this.searchableEntities, "name")
    }

    @computed private get searchableEntities(): SearchableEntity[] {
        const { selectedEntityNames } = this.selectionArray
        return this.sortedAvailableEntities
            .filter((name) => !selectedEntityNames.includes(name))
            .map((name) => {
                return { name } as SearchableEntity
            })
    }

    @computed get searchResults(): SearchableEntity[] {
        return this.searchInput
            ? this.fuzzy.search(this.searchInput)
            : this.searchableEntities
    }

    @action.bound onDismiss(): void {
        this.manager.isSelectingData = false
    }

    @action.bound onSelect(entityName: string): void {
        if (this.isMulti) {
            this.selectionArray.toggleSelection(entityName)
        } else {
            this.selectionArray.setSelectedEntities([entityName])
            this.onDismiss()
        }
    }

    componentDidMount(): void {
        if (!isTouchDevice()) this.searchField.focus()
    }

    @action.bound onSearchKeyDown(e: React.KeyboardEvent<HTMLElement>): void {
        if (e.key === "Enter" && this.searchResults.length > 0) {
            this.onSelect(this.searchResults[0].name)
            this.searchInput = ""
        }
    }

    @action.bound onClear(): void {
        this.selectionArray.clearSelection()
    }

    renderSelectedData(): React.ReactNode {
        const selectedEntityNames = this.selectionArray.selectedEntityNames

        // only render something in isMulti mode
        if (this.isMulti) {
            return (
                <div className="selectedData">
                    {selectedEntityNames.length > 0 && (
                        <div className="selectedLabel">Selection</div>
                    )}
                    <ul>
                        {selectedEntityNames.map((name) => {
                            return (
                                <li key={name}>
                                    <Checkbox
                                        label={name}
                                        checked={true}
                                        onChange={(): void => {
                                            this.onSelect(name)
                                        }}
                                    />
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )
        } else return undefined
    }

    render(): JSX.Element {
        const {
            selectionArray,
            searchResults,
            searchInput,
            isMulti,
            manager: { entityTypePlural, entitiesAreCountryLike },
        } = this

        const title = isMulti
            ? `Add/remove ${entityTypePlural}`
            : `Choose ${a(this.entityType)}`

        return (
            <Modal
                title={title}
                onDismiss={this.onDismiss}
                bounds={this.modalBounds}
                isHeightFixed={true}
                footer={
                    this.isMulti &&
                    selectionArray.selectedEntityNames.length > 0 ? (
                        <div className="searchFooter">
                            <button
                                className="clearSelection"
                                onClick={this.onClear}
                            >
                                Clear selection
                            </button>
                        </div>
                    ) : undefined
                }
            >
                <div
                    className={classnames(
                        "EntitySelector",
                        this.isMulti
                            ? "EntitySelectorMulti"
                            : "EntitySelectorSingle"
                    )}
                >
                    <div className="searchBar">
                        <div className="searchInput">
                            <input
                                type="search"
                                placeholder="Search..."
                                value={searchInput}
                                onChange={(e): void => {
                                    this.searchInput = e.currentTarget.value
                                }}
                                onKeyDown={this.onSearchKeyDown}
                                ref={(e): HTMLInputElement =>
                                    (this.searchField = e as HTMLInputElement)
                                }
                            />
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </div>
                    </div>
                    <div className="entities">
                        {this.renderSelectedData()}
                        <div className="searchResults">
                            {searchResults.length > 0 ? (
                                <>
                                    <div className="searchResultsLabel">
                                        {entitiesAreCountryLike
                                            ? "Countries, regions, and groups"
                                            : entityTypePlural}
                                    </div>
                                    <ul>
                                        {searchResults.map((result) => (
                                            <EntitySearchResult
                                                key={result.name}
                                                result={result}
                                                isMulti={this.isMulti}
                                                isChecked={selectionArray.selectedSet.has(
                                                    result.name
                                                )}
                                                onSelect={this.onSelect}
                                            />
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <div className="empty">
                                    {entitiesAreCountryLike &&
                                    isCountryName(this.searchInput)
                                        ? "There is no data for the country, region or group you are looking for."
                                        : "Nothing turned up. You may want to try using different keywords or checking for typos."}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        )
    }
}
