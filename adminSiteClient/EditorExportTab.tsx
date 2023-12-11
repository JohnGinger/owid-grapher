import { action, computed } from "mobx"
import { observer } from "mobx-react"
import React from "react"
import { ChartEditor } from "./ChartEditor.js"
import { Section, SelectField, Toggle } from "./Forms.js"
import { Grapher, GrapherStaticFormat } from "@ourworldindata/grapher"
import {
    Bounds,
    triggerDownloadFromBlob,
    capitalize,
} from "@ourworldindata/utils"

type Format = "png" | "svg"
type ExportFilename = `${string}.${Format}`

@observer
export class EditorExportTab extends React.Component<{ editor: ChartEditor }> {
    @computed private get grapher(): Grapher {
        return this.props.editor.grapher
    }

    @computed private get baseFilename(): string {
        return this.props.editor.grapher.displaySlug
    }

    @action.bound onPresetChange(value: string) {
        this.props.editor.staticPreviewFormat = value as GrapherStaticFormat
    }

    @action.bound async onDownloadDesktopSVG() {
        this.download(
            `${this.baseFilename}-desktop.svg`,
            this.grapher.idealBounds
        )
    }

    @action.bound async onDownloadDesktopPNG() {
        this.download(
            `${this.baseFilename}-desktop.png`,
            this.grapher.idealBounds
        )
    }

    @action.bound async onDownloadMobileSVG() {
        this.download(
            `${this.baseFilename}-mobile.svg`,
            this.grapher.staticBounds
        )
    }

    @action.bound onDownloadMobilePNG() {
        this.download(
            `${this.baseFilename}-mobile.png`,
            this.grapher.staticBounds
        )
    }

    @action.bound onToggleTitleAnnotationEntity(value: boolean) {
        const { grapher } = this.props.editor
        grapher.forceHideAnnotationFieldsInTitle ??= {}
        grapher.forceHideAnnotationFieldsInTitle.entity = !value || undefined
    }

    @action.bound onToggleTitleAnnotationTime(value: boolean) {
        const { grapher } = this.props.editor
        grapher.forceHideAnnotationFieldsInTitle ??= {}
        grapher.forceHideAnnotationFieldsInTitle.time = !value || undefined
    }

    async download(filename: ExportFilename, bounds: Bounds) {
        try {
            const { blob: pngBlob, svgBlob } =
                await this.grapher.rasterize(bounds)
            if (filename.endsWith("svg") && svgBlob) {
                triggerDownloadFromBlob(filename, svgBlob)
            } else if (filename.endsWith("png") && pngBlob) {
                triggerDownloadFromBlob(filename, pngBlob)
            }
        } catch (err) {
            console.error(err)
        }
    }

    render() {
        const { editor } = this.props
        const { grapher } = editor
        return (
            <div className="EditorExportTab">
                <Section name="Mobile image size">
                    <SelectField
                        label="Preset"
                        value={editor.staticPreviewFormat}
                        onValue={this.onPresetChange}
                        options={Object.keys(GrapherStaticFormat)
                            .filter(
                                (format) =>
                                    format !== GrapherStaticFormat.landscape
                            )
                            .map((format) => ({
                                value: format,
                                label: capitalize(format),
                            }))}
                    />
                </Section>
                <Section name="Displayed elements">
                    <Toggle
                        label="Title"
                        value={!grapher.hideTitle}
                        onValue={(value) => (grapher.hideTitle = !value)}
                    />
                    <Toggle
                        label="Title suffix: automatic entity"
                        value={
                            !grapher.forceHideAnnotationFieldsInTitle?.entity
                        }
                        onValue={this.onToggleTitleAnnotationEntity}
                    />
                    <Toggle
                        label="Title suffix: automatic time"
                        value={!grapher.forceHideAnnotationFieldsInTitle?.time}
                        onValue={this.onToggleTitleAnnotationTime}
                    />
                    <Toggle
                        label="Subtitle"
                        value={!grapher.hideSubtitle}
                        onValue={(value) => (grapher.hideSubtitle = !value)}
                    />
                    <Toggle
                        label="Logo"
                        value={!grapher.hideLogo}
                        onValue={(value) => (grapher.hideLogo = !value)}
                    />
                    <Toggle
                        label="Note"
                        value={!grapher.hideNote}
                        onValue={(value) => (grapher.hideNote = !value)}
                    />
                    <Toggle
                        label="Origin URL"
                        value={!grapher.hideOriginUrl}
                        onValue={(value) => (grapher.hideOriginUrl = !value)}
                    />
                </Section>
                <Section name="Export static chart">
                    <div className="DownloadButtons">
                        <button
                            className="btn btn-primary"
                            onClick={this.onDownloadDesktopPNG}
                        >
                            Download Desktop PNG
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={this.onDownloadDesktopSVG}
                        >
                            Download Desktop SVG
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={this.onDownloadMobilePNG}
                        >
                            Download Mobile PNG
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={this.onDownloadMobileSVG}
                        >
                            Download Mobile SVG
                        </button>
                    </div>
                </Section>
            </div>
        )
    }
}
