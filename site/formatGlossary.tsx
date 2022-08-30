import React from "react"
import ReactDOMServer from "react-dom/server.js"
import { ExpandableInlineBlock_name } from "./ExpandableInlineBlock.js"
import { GlossaryExcerpt_name } from "./GlossaryExcerpt.js"
import { GlossaryItem } from "./glossary.js"

// Do not replace glossary terms within these tags
export const FORBIDDEN_TAGS = ["a", "h2", "h3", "h4", "h5", "h6"]

export const GlossaryLink = ({
    slug,
    excerpt,
    match,
}: {
    slug: string
    excerpt: string
    match: string
}) => (
    <span>
        <script
            data-type={ExpandableInlineBlock_name}
            data-block={GlossaryExcerpt_name}
            data-label={match}
            type="component/props"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify({ slug, excerpt }),
            }}
        ></script>
        <a className="expandable-block-button" href={`/glossary#${slug}`}>
            {match}
        </a>
    </span>
)

export const formatGlossaryTerms = (
    $: cheerio.Selector,
    $contents: cheerio.Cheerio,
    mutableGlossary: GlossaryItem[]
) => {
    $contents.each((i, el) => {
        if (FORBIDDEN_TAGS.includes((el as cheerio.TagElement).tagName)) return
        if (el.type === "text") {
            $(el).replaceWith(
                _linkGlossaryTermsInText(el.data, mutableGlossary)
            )
        } else {
            formatGlossaryTerms($, $(el).contents(), mutableGlossary)
        }
    })
}

export const _linkGlossaryTermsInText = (
    srcText: string = "",
    glossary: GlossaryItem[]
) => {
    let textWithGlossaryLinks = srcText

    // Include periods in matched text to prevent inelegant next line wrapping
    const regex = new RegExp(
        `\\b(${glossary.map((item) => item.term).join("|")})\\b\\.?`,
        "ig"
    )

    const trimLastCharIfPeriod = (text: string) => {
        return text.replace(/\.$/, "")
    }

    const _getGlossaryLink = (match: string) => {
        const idx = glossary.findIndex(
            (item) =>
                item.term.toLowerCase() ===
                trimLastCharIfPeriod(match.toLowerCase())
        )
        if (idx === -1) return match

        const slug = glossary[idx].slug
        const excerpt = glossary[idx].excerpt

        // Remove element in-place so that glossary items are only matched and
        // linked once per recursive traversal (at the moment, this is set to
        // once per page section)
        glossary.splice(idx, 1)

        return ReactDOMServer.renderToStaticMarkup(
            <GlossaryLink slug={slug} excerpt={excerpt} match={match} />
        )
    }

    textWithGlossaryLinks = textWithGlossaryLinks.replace(
        regex,
        _getGlossaryLink
    )
    return textWithGlossaryLinks
}
