import React from "react"
import { observer } from "mobx-react"
import { action, computed } from "mobx"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome/index.js"
import { faTimes } from "@fortawesome/free-solid-svg-icons"
import { Bounds } from "@ourworldindata/utils"

@observer
export class Modal extends React.Component<{
    bounds: Bounds
    onDismiss: () => void
    title?: string
    children?: React.ReactNode
    footer?: React.ReactNode
    isHeightFixed?: boolean // by default, the modal height is not fixed but fits to the content
    alignVertical?: "center" | "bottom"
}> {
    contentRef: React.RefObject<HTMLDivElement> = React.createRef()

    @computed private get bounds(): Bounds {
        return this.props.bounds
    }

    @computed private get title(): string | undefined {
        return this.props.title
    }

    @computed private get isHeightFixed(): boolean {
        return this.props.isHeightFixed ?? false
    }

    @computed private get alignVertical(): "center" | "bottom" {
        return this.props.alignVertical ?? "center"
    }

    @action.bound onDocumentClick(e: MouseEvent): void {
        const tagName = (e.target as HTMLElement).tagName
        const isTargetInteractive = ["A", "BUTTON", "INPUT"].includes(tagName)
        if (
            this.contentRef?.current &&
            !this.contentRef.current.contains(e.target as Node) &&
            // clicking on an interactive element should not dismiss the modal
            // (this is especially important for the suggested chart review tool)
            !isTargetInteractive &&
            // check that the target is still mounted to the document; we also get click events on nodes that have since been removed by React
            document.contains(e.target as Node)
        )
            this.props.onDismiss()
    }

    @action.bound onDocumentKeyDown(e: KeyboardEvent): void {
        if (e.key === "Escape") this.props.onDismiss()
    }

    componentDidMount(): void {
        document.addEventListener("click", this.onDocumentClick)
        document.addEventListener("keydown", this.onDocumentKeyDown)
    }

    componentWillUnmount(): void {
        document.removeEventListener("click", this.onDocumentClick)
        document.removeEventListener("keydown", this.onDocumentKeyDown)
    }

    render(): JSX.Element {
        const { bounds } = this

        const contentStyle: React.CSSProperties = {
            left: bounds.left,
            width: bounds.width,
            maxHeight: bounds.height,
        }

        if (this.isHeightFixed) {
            contentStyle.height = bounds.height
        }

        if (this.alignVertical === "bottom") {
            contentStyle.bottom = bounds.y
        } else {
            contentStyle.top = "50%"
            contentStyle.transform = "translateY(-50%)"
        }

        return (
            <div className="modalOverlay">
                <div className="modalWrapper">
                    <div
                        className="modalContent"
                        style={contentStyle}
                        ref={this.contentRef}
                    >
                        <div className="modalHeader">
                            {this.title && (
                                <div className="modalTitle">{this.title}</div>
                            )}
                            <button
                                className="modalDismiss"
                                onClick={this.props.onDismiss}
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <div className="modalScrollable">
                            {this.props.children}
                        </div>
                        {this.props.footer}
                    </div>
                </div>
            </div>
        )
    }
}
