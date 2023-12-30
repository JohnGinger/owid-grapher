import { ChartTypeName, GrapherTabOption } from "@ourworldindata/types"
import {
    MultipleOwidVariableDataDimensionsMap,
    OwidVariableMixedData,
    OwidVariableWithSourceAndDimension,
    TESTING_ONLY_reset_guid,
} from "@ourworldindata/utils"
import fs, { stat } from "fs-extra"
import md5 from "md5"
import path from "path"
import stream from "stream"
import {
    buildSvgOutFilename,
    initGrapherForSvgExport,
} from "../../baker/GrapherImageBaker.js"
import { getVariableData } from "../../db/model/Variable.js"

import { GrapherInterface } from "@ourworldindata/types"
import _ from "lodash"
import util from "util"
import {
    BAKED_GRAPHER_URL,
    BAKED_BASE_URL,
} from "../../settings/serverSettings.js"
import { getHeapStatistics } from "v8"

export const CONFIG_FILENAME: string = "config.json"
const RESULTS_FILENAME = "results.csv"
export const SVG_CSV_HEADER = `grapherId,slug,chartType,md5,svgFilename,durationReceiveData,durationTotal,heapUsed,totalDataFileSize`

export const finished = util.promisify(stream.finished) // (A)

export interface VerifyResultOk {
    kind: "ok"
}

export interface VerifyResultDifference {
    kind: "difference"
    difference: SvgDifference
}

export interface VerifyResultError {
    kind: "error"
    graphId: number
    error: Error
}

export type VerifyResult =
    | VerifyResultOk
    | VerifyResultDifference
    | VerifyResultError

const resultOk = (): VerifyResult => ({
    kind: "ok",
})

const resultError = (id: number, error: Error): VerifyResult => ({
    kind: "error",
    graphId: id,
    error: error,
})

const resultDifference = (difference: SvgDifference): VerifyResult => ({
    kind: "difference",
    difference: difference,
})

export type SvgRenderPerformance = {
    durationReceiveData: number
    durationTotal: number
    heapUsed: number
    totalDataFileSize: number
}

export type SvgRecord = {
    chartId: number
    slug: string
    chartType: ChartTypeName | GrapherTabOption | undefined
    md5: string
    svgFilename: string
    performance?: SvgRenderPerformance
}

export interface SvgDifference {
    chartId: number
    startIndex: number
    referenceSvgFragment: string
    newSvgFragment: string
}

export interface JobDirectory {
    chartId: number
    pathToProcess: string
}

export interface JobConfigAndData {
    config: GrapherInterface
    variableData: MultipleOwidVariableDataDimensionsMap
    totalDataFileSize: number
}

export function logIfVerbose(verbose: boolean, message: string, param?: any) {
    if (verbose)
        if (param) console.log(message, param)
        else console.log(message)
}

function findFirstDiffIndex(a: string, b: string): number {
    var i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i++
    if (a.length === b.length && a.length === i) {
        console.warn("No difference found even though hash was different!")
        i = -1
    }
    return i
}

export async function verifySvg(
    newSvg: string,
    newSvgRecord: SvgRecord,
    referenceSvgRecord: SvgRecord,
    referenceSvgsPath: string,
    verbose: boolean
): Promise<VerifyResult> {
    logIfVerbose(verbose, `verifying ${newSvgRecord.chartId}`)

    if (newSvgRecord.md5 === referenceSvgRecord.md5) {
        // if the md5 hash is unchanged then there is no difference
        return resultOk()
    }

    const referenceSvg = await loadReferenceSvg(
        referenceSvgsPath,
        referenceSvgRecord
    )
    const preparedNewSvg = prepareSvgForComparision(newSvg)
    const preparedReferenceSvg = prepareSvgForComparision(referenceSvg)
    const firstDiffIndex = findFirstDiffIndex(
        preparedNewSvg,
        preparedReferenceSvg
    )
    // Sometimes the md5 hash comparision above indicated a difference
    // but the character by character comparision gives -1 (no differences)
    // Weird - maybe an artifact of a change in how the ids are stripped
    // accross version?
    if (firstDiffIndex === -1) {
        return resultOk()
    }
    logIfVerbose(verbose, `${newSvgRecord.chartId} had differences`)
    return resultDifference({
        chartId: newSvgRecord.chartId,
        startIndex: firstDiffIndex,
        referenceSvgFragment: preparedReferenceSvg.substr(
            firstDiffIndex - 20,
            40
        ),
        newSvgFragment: preparedNewSvg.substr(firstDiffIndex - 20, 40),
    })
}

export async function decideDirectoriesToVerify(
    grapherIds: number[],
    inDir: string
): Promise<JobDirectory[]> {
    let directories: JobDirectory[] = []
    if (grapherIds.length === 0) {
        // If no grapher ids were given scan all directories in the inDir folder
        const dir = await fs.opendir(inDir)
        for await (const entry of dir) {
            if (entry.isDirectory()) {
                directories.push({
                    chartId: parseInt(entry.name),
                    pathToProcess: path.join(inDir, entry.name),
                })
            }
        }
    } else {
        // if grapher ids were given check which ones exist in inDir and filter to those
        // -> if by doing so we drop some, warn the user
        directories = grapherIds.map((id) => ({
            chartId: id,
            pathToProcess: path.join(inDir, id.toString()),
        }))
        const allDirsCount = directories.length
        directories = directories.filter((item) =>
            fs.existsSync(item.pathToProcess)
        )
        if (directories.length < allDirsCount) {
            console.warn(
                `${allDirsCount} grapher ids were given but only ${directories.length} existed as directories`
            )
        }
    }

    return directories
}

/** Turn a list of comma separated numbers and ranges into an array of numbers */
export function getGrapherIdListFromString(rawGrapherIds: string): number[] {
    return rawGrapherIds.split(",").flatMap((item) => {
        if (item.includes("-")) {
            const subparts = item.split("-")
            if (subparts.length !== 2) {
                console.warn(`Invalid graphid range: ${item}`)
                return []
            } else {
                const first = parseInt(subparts[0])
                const second = parseInt(subparts[1])
                return _.range(first, second + 1)
            }
        } else {
            const parsed = parseInt(item)
            if (isNaN(parsed)) {
                return []
            } else {
                return [parsed]
            }
        }
    })
}

export async function writeToFile(data: unknown, filename: string) {
    const json = JSON.stringify(data, null, 2)
    await fs.writeFile(filename, json)
}

export interface SaveGrapherSchemaAndDataJob {
    config: GrapherInterface
    outDir: string
}
export async function saveGrapherSchemaAndData(
    jobDescription: SaveGrapherSchemaAndDataJob
): Promise<void> {
    const config = jobDescription.config
    const outDir = jobDescription.outDir
    const dataDir = path.join(outDir, config.id?.toString() ?? "")
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
    const configPath = path.join(dataDir, CONFIG_FILENAME)
    const promise1 = writeToFile(config, configPath)

    const grapher = initGrapherForSvgExport(config)
    const variableIds = grapher.dimensions.map((d) => d.variableId)

    const writeVariablePromises = variableIds.map(async (variableId) => {
        const dataPath = path.join(dataDir, `${variableId}.data.json`)
        const metadataPath = path.join(dataDir, `${variableId}.metadata.json`)
        const variableData = await getVariableData(variableId)
        await writeToFile(variableData.data, dataPath)
        await writeToFile(variableData.metadata, metadataPath)
    })

    await Promise.allSettled([promise1, ...writeVariablePromises])
}

export async function renderSvg(dir: string): Promise<[string, SvgRecord]> {
    const configAndData = await loadGrapherConfigAndData(dir)

    // Graphers sometimes need to generate ids (incrementing numbers). For this
    // they keep a stateful variable in clientutils. To minimize differences
    // between consecutive runs we reset this id here before every export
    TESTING_ONLY_reset_guid()

    const timeStart = Date.now()

    const grapher = initGrapherForSvgExport({
        ...configAndData.config,
        adminBaseUrl: BAKED_BASE_URL,
        bakedGrapherURL: BAKED_GRAPHER_URL,
    })
    const { width, height } = grapher.idealBounds
    const outFilename = buildSvgOutFilename(
        configAndData.config.slug!,
        configAndData.config.version,
        width,
        height
    )

    grapher.receiveOwidData(configAndData.variableData)
    const durationReceiveData = Date.now() - timeStart

    const svg = grapher.staticSVG
    const durationTotal = Date.now() - timeStart

    const svgRecord = {
        chartId: configAndData.config.id!,
        slug: configAndData.config.slug!,
        chartType: grapher.tab === "chart" ? grapher.type : grapher.tab,
        md5: processSvgAndCalculateHash(svg),
        svgFilename: outFilename,
        performance: {
            durationReceiveData,
            durationTotal,
            // The heap size measurement is only accurate if the parent process is run with `--isolate`, otherwise the same
            // process is used for multiple graphs and the heap size accumulates
            heapUsed: getHeapStatistics().used_heap_size,
            totalDataFileSize: configAndData.totalDataFileSize,
        },
    }
    return Promise.resolve([svg, svgRecord])
}

const replaceRegexes = [/id="react-select-\d+-.+"/g]
/** Some fragments of the svgs are non-deterministic. This function is used to
    delete all such fragments */
function prepareSvgForComparision(svg: string): string {
    let current = svg
    for (const replaceRegex of replaceRegexes) {
        current = svg.replace(replaceRegex, "")
    }
    return current
}

/** Remove all non-deterministic parts of the svg and then calculate an md5 hash */
export function processSvgAndCalculateHash(svg: string): string {
    const processed = prepareSvgForComparision(svg)
    return md5(processed)
}
export interface RenderSvgAndSaveJobDescription {
    dir: string
    outDir: string
}
export async function renderSvgAndSave(
    jobDescription: RenderSvgAndSaveJobDescription
): Promise<SvgRecord> {
    const dir = jobDescription.dir
    const outDir = jobDescription.outDir
    const [svg, svgRecord] = await renderSvg(dir)
    const outPath = path.join(outDir, svgRecord.svgFilename)
    const cleanedSvg = prepareSvgForComparision(svg)
    await fs.writeFile(outPath, cleanedSvg)
    return Promise.resolve(svgRecord)
}

export async function readJsonFile(filename: string): Promise<unknown> {
    const content = await fs.readJson(filename)
    return content
}

export async function loadReferenceSvg(
    referenceDir: string,
    referenceSvgRecord: SvgRecord
): Promise<string> {
    if (!referenceDir) throw "RefereneDir was empty in loadReferenceSvg"
    if (!referenceSvgRecord) throw "reference svg record was not defined"
    if (!referenceSvgRecord.svgFilename)
        throw "reference svg record.svgfilename was not defined"
    const referenceFilename = path.join(
        referenceDir,
        referenceSvgRecord.svgFilename
    )
    if (!fs.existsSync(referenceFilename))
        throw `Input directory does not exist ${referenceFilename}`
    const svg = await fs.readFile(referenceFilename, "utf-8")
    return svg
}

export async function loadGrapherConfigAndData(
    inputDir: string
): Promise<JobConfigAndData> {
    if (!fs.existsSync(inputDir))
        throw `Input directory does not exist ${inputDir}`

    const configPath = path.join(inputDir, CONFIG_FILENAME)
    const config = (await readJsonFile(configPath)) as GrapherInterface

    // TODO: this bakes the same commonly used variables over and over again - deduplicate
    // this on the variable level and bake those separately into a different directory
    const variableIds = config.dimensions?.map((d) => d.variableId) ?? []
    const loadDataPromises = variableIds.map(async (variableId) => {
        const dataPath = path.join(inputDir, `${variableId}.data.json`)
        const metadataPath = path.join(inputDir, `${variableId}.metadata.json`)
        const dataFileSize = await stat(dataPath).then((stats) => stats.size)
        const data = (await readJsonFile(dataPath)) as OwidVariableMixedData
        const metadata = (await readJsonFile(
            metadataPath
        )) as OwidVariableWithSourceAndDimension
        return { data, metadata, dataFileSize }
    })

    const data = await Promise.all(loadDataPromises)

    const variableData = new Map(data.map((d) => [d.metadata.id, d]))
    const totalDataFileSize = _.sum(data.map((d) => d.dataFileSize))

    return { config, variableData, totalDataFileSize }
}

export function logDifferencesToConsole(
    svgRecord: SvgRecord,
    validationResult: VerifyResultDifference
): void {
    console.warn(
        `Svg was different for ${svgRecord.chartId}. The difference starts at character ${validationResult.difference.startIndex}.
Reference: ${validationResult.difference.referenceSvgFragment}
Current  : ${validationResult.difference.newSvgFragment}`
    )
}

export async function getReferenceCsvContentMap(
    referenceDir: string
): Promise<Map<number, SvgRecord>> {
    const results = await fs.readFile(
        path.join(referenceDir, RESULTS_FILENAME),
        "utf-8"
    )
    const csvContentArray = results
        .split("\n")
        .splice(1)
        .map((line): [number, SvgRecord] => {
            const items = line.split(",")
            const chartId = parseInt(items[0])
            return [
                chartId,
                {
                    chartId: chartId,
                    slug: items[1],
                    chartType: items[2] as ChartTypeName,
                    md5: items[3],
                    svgFilename: items[4],
                },
            ]
        })
    const csvContentMap = new Map<number, SvgRecord>(csvContentArray)
    return csvContentMap
}

export async function writeResultsCsvFile(
    outDir: string,
    svgRecords: SvgRecord[]
): Promise<void> {
    const resultsPath = path.join(outDir, RESULTS_FILENAME)
    const csvFileStream = fs.createWriteStream(resultsPath)
    csvFileStream.write(SVG_CSV_HEADER + "\n")
    for (const row of svgRecords) {
        const line = [
            row.chartId,
            row.slug,
            row.chartType,
            row.md5,
            row.svgFilename,

            // Perf
            row.performance?.durationReceiveData,
            row.performance?.durationTotal,
            row.performance?.heapUsed,
            row.performance?.totalDataFileSize,
        ]
            .map((item) => item ?? "")
            .join(",")

        csvFileStream.write(line + "\n")
    }
    csvFileStream.end()
    await finished(csvFileStream)
    csvFileStream.close()
}

export interface RenderJobDescription {
    dir: JobDirectory
    referenceEntry: SvgRecord
    referenceDir: string
    outDir: string
    verbose: boolean
    suffix?: string
    rmOnError?: boolean
}

export async function renderAndVerifySvg({
    dir,
    referenceEntry,
    referenceDir,
    outDir,
    verbose,
    suffix,
    rmOnError,
}: RenderJobDescription): Promise<VerifyResult> {
    try {
        if (!dir) throw "Dir was not defined"
        if (!referenceEntry) throw "ReferenceEntry was not defined"
        if (!referenceDir) throw "ReferenceDir was not defined"
        if (!outDir) throw "outdir was not defined"

        const [svg, svgRecord] = await renderSvg(dir.pathToProcess)

        const validationResult = await verifySvg(
            svg,
            svgRecord,
            referenceEntry,
            referenceDir,
            verbose
        )
        // verifySvg returns a Result type - if it is success we don't care any further
        // but if there was an error then we write the svg and a message to stderr
        switch (validationResult.kind) {
            case "difference":
                logDifferencesToConsole(svgRecord, validationResult)
                const pathFragments = path.parse(svgRecord.svgFilename)
                const outputPath = path.join(
                    outDir,
                    pathFragments.name + suffix + pathFragments.ext
                )
                const cleanedSvg = prepareSvgForComparision(svg)
                await fs.writeFile(outputPath, cleanedSvg)
        }
        return Promise.resolve(validationResult)
    } catch (err) {
        console.error(`Threw error for ${referenceEntry.chartId}:`, err)
        if (rmOnError) {
            const outPath = path.join(outDir, referenceEntry.svgFilename)
            await fs.unlink(outPath).catch(() => {
                /* ignore ENOENT */
            })
        }
        return Promise.resolve(
            resultError(referenceEntry.chartId, err as Error)
        )
    }
}
export async function prepareVerifyRun(
    rawGrapherIds: string,
    inDir: string
): Promise<JobDirectory[]> {
    const grapherIds: number[] = getGrapherIdListFromString(rawGrapherIds)
    const directoriesToProcess = await decideDirectoriesToVerify(
        grapherIds,
        inDir
    )
    return directoriesToProcess
}

// no-op when not running inside GH Actions
const setGhActionsOutput = (key: string, value: string | number) => {
    const outPath = process.env.GITHUB_OUTPUT
    if (outPath && fs.existsSync(outPath)) {
        // this is not bulletproof and expects both to not contain special characters
        fs.appendFileSync(outPath, `${key}=${value}`)
    }
}

export function displayVerifyResultsAndGetExitCode(
    validationResults: VerifyResult[],
    verbose: boolean,
    directoriesToProcess: JobDirectory[]
): number {
    let returnCode: number

    const errorResults = validationResults.filter(
        (result) => result.kind === "error"
    ) as VerifyResultError[]

    const differenceResults = validationResults.filter(
        (result) => result.kind === "difference"
    ) as VerifyResultDifference[]

    if (errorResults.length === 0 && differenceResults.length === 0) {
        logIfVerbose(
            verbose,
            `There were no differences in all ${directoriesToProcess.length} graphs processed`
        )
        returnCode = 0
    } else {
        if (errorResults.length) {
            console.warn(
                `${errorResults.length} graphs threw errors: ${errorResults
                    .map((err) => err.graphId)
                    .join()}`
            )
            for (const result of errorResults) {
                console.log(result.graphId?.toString(), result.error) // write to stdout one grapher id per file for easy piping to other processes
            }
            setGhActionsOutput("num_errors", errorResults.length)
        }
        if (differenceResults.length) {
            console.warn(
                `${
                    differenceResults.length
                } graphs had differences: ${differenceResults
                    .map((err) => err.difference.chartId)
                    .join()}`
            )
            for (const result of differenceResults) {
                console.log("", result.difference.chartId) // write to stdout one grapher id per file for easy piping to other processes
            }
            setGhActionsOutput("num_differences", differenceResults.length)
        }
        returnCode = errorResults.length + differenceResults.length
    }
    return returnCode
}
