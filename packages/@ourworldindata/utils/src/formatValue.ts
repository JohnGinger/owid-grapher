import { FormatSpecifier } from "d3-format"
import { createFormatter } from "./Util.js"
import { TickFormattingOptions } from "@ourworldindata/types"

// Used outside this module to figure out if the unit will be joined with the number.
export function checkIsVeryShortUnit(unit: string): unit is "$" | "£" | "%" {
    return ["%", "$", "£"].includes(unit)
}

function checkIsUnitCurrency(unit: string): unit is "$" | "£" {
    return ["$", "£"].includes(unit)
}

function checkIsUnitPercent(unit: string): unit is "%" {
    return unit[0] === "%"
}

function getTrim({ trailingZeroes }: { trailingZeroes: boolean }): "~" | "" {
    return trailingZeroes ? "" : "~"
}

function getSign({ showPlus }: { showPlus: boolean }): "+" | "" {
    return showPlus ? "+" : ""
}

function getSymbol({ unit }: { unit: string }): "$" | "" {
    return checkIsUnitCurrency(unit) ? "$" : ""
}

function getType({
    numberAbbreviation,
    value,
    unit,
}: {
    numberAbbreviation: "long" | "short" | false
    value: number
    unit: string
}): "f" | "s" {
    // f: fixed-point notation (i.e. fixed number of decimal points)
    // s: decimal notation with an SI prefix, rounded to significant digits
    if (checkIsUnitPercent(unit)) {
        return "f"
    }
    if (numberAbbreviation === "long") {
        // do not abbreviate until 1 million
        return Math.abs(value) < 1e6 ? "f" : "s"
    }
    if (numberAbbreviation === "short") {
        // do not abbreviate until 1 thousand
        return Math.abs(value) < 1e3 ? "f" : "s"
    }

    return "f"
}

function getPrecision({
    value,
    numDecimalPlaces,
    type,
}: {
    value: number
    numDecimalPlaces: number
    type: "f" | "s"
}): string {
    if (type === "f") {
        return `${numDecimalPlaces}`
    }

    // when dealing with abbreviated numbers, adjust precision so we get 12.84 million instead of 13 million
    // the modulo one-liner counts the "place columns" of the number, resetting every 3
    // 1 -> 1, 48 -> 2, 981 -> 3, 7222 -> 1
    const numberOfDigits = String(Math.floor(Math.abs(value))).length
    const precisionPadding = ((numberOfDigits - 1) % 3) + 1

    // hard-coded 2 decimal places for abbreviated numbers
    return `${precisionPadding + 2}`
}

function replaceSIPrefixes({
    string,
    numberAbbreviation,
}: {
    string: string
    numberAbbreviation: "short" | "long"
}): string {
    const prefix = string[string.length - 1]

    const prefixMap: Record<string, Record<string, string>> = {
        short: {
            k: "k",
            M: "M",
            G: "B",
            T: "T",
            P: "quad",
            E: "quint",
            Z: "sext",
            Y: "sept",
        },
        long: {
            k: "k",
            M: " million",
            G: " billion",
            T: " trillion",
            P: " quadrillion",
            E: " quintillion",
            Z: " sextillion",
            Y: " septillion",
        },
    }

    if (prefixMap[numberAbbreviation][prefix]) {
        return string.replace(prefix, prefixMap[numberAbbreviation][prefix])
    }
    return string
}

function postprocessString({
    string,
    numberAbbreviation,
    spaceBeforeUnit,
    useNoBreakSpace,
    unit,
    value,
    numDecimalPlaces,
}: {
    string: string
    numberAbbreviation: "long" | "short" | false
    spaceBeforeUnit: boolean
    useNoBreakSpace: boolean
    unit: string
    value: number
    numDecimalPlaces: number
}): string {
    let output = string

    // handling infinitesimal values
    const tooSmallThreshold = Math.pow(10, -numDecimalPlaces).toPrecision(1)
    if (numberAbbreviation && 0 < value && value < +tooSmallThreshold) {
        output = "<" + output.replace(/0\.?(\d+)?/, tooSmallThreshold)
    }

    if (numberAbbreviation) {
        output = replaceSIPrefixes({
            string: output,
            numberAbbreviation,
        })
    }

    if (unit && !checkIsUnitCurrency(unit)) {
        const spaceCharacter = useNoBreakSpace ? "\u00a0" : " "
        const appendage = spaceBeforeUnit ? spaceCharacter + unit : unit
        output += appendage
    }

    return output
}

export function formatValue(
    value: number,
    {
        trailingZeroes = false,
        unit = "",
        spaceBeforeUnit = !checkIsUnitPercent(unit),
        useNoBreakSpace = false,
        showPlus = false,
        numDecimalPlaces = 2,
        numberAbbreviation = "long",
    }: TickFormattingOptions
): string {
    const formatter = createFormatter(unit)

    // Explore how specifiers work here
    // https://observablehq.com/@ikesau/d3-format-interactive-demo
    const specifier = new FormatSpecifier({
        zero: "0",
        trim: getTrim({ trailingZeroes }),
        sign: getSign({ showPlus }),
        symbol: getSymbol({ unit }),
        comma: ",",
        precision: getPrecision({
            value,
            numDecimalPlaces,
            type: getType({ numberAbbreviation, value, unit }),
        }),
        type: getType({ numberAbbreviation, value, unit }),
    }).toString()

    const formattedString = formatter(specifier)(value)

    const postprocessedString = postprocessString({
        string: formattedString,
        numberAbbreviation,
        spaceBeforeUnit,
        useNoBreakSpace,
        unit,
        value,
        numDecimalPlaces,
    })

    return postprocessedString
}
