import fetch from "node-fetch"
import { createCheckoutSession } from "./stripe.js"
import {
    DonateSessionResponse,
    DonationRequestTypeObject,
    JsonError,
    PLEASE_TRY_AGAIN,
    stringifyUnknownError,
} from "@ourworldindata/utils"
import { Value } from "@sinclair/typebox/value"

interface EnvVars {
    ASSETS: Fetcher
    STRIPE_SECRET_KEY: string
    RECAPTCHA_SECRET_KEY: string
}

// CORS headers need to be sent in responses to both preflight ("OPTIONS") and
// actual requests.
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // The Content-Type header is required to allow requests to be sent with a
    // Content-Type of "application/json". This is because "application/json" is
    // not an allowed value for Content-Type to be considered a CORS-safelisted
    // header.
    // - https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header
    "Access-Control-Allow-Headers": "Content-Type",
}

const DEFAULT_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" }

const isEnvVars = (env: any): env is EnvVars => {
    return !!env.ASSETS && !!env.STRIPE_SECRET_KEY && !!env.RECAPTCHA_SECRET_KEY
}

// This function is called when the request is a preflight request ("OPTIONS").
export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, {
        headers: CORS_HEADERS,
        status: 200,
    })
}

export const onRequestPost: PagesFunction = async ({
    request,
    env,
}: {
    request: Request
    env
}) => {
    if (!isEnvVars(env))
        // This error is not being caught and surfaced to the client voluntarily.
        throw new Error(
            "Missing environment variables. Please check that both STRIPE_SECRET_KEY and RECAPTCHA_SECRET_KEY are set."
        )

    // Parse the body of the request as JSON
    const donation = await request.json()

    try {
        // Check that the received donation object has the right type. Given that we
        // use the same types in the client and the server, this should never fail
        // when the request is coming from the client. However, it could happen if a
        // request is manually crafted. In this case, we select the first error and
        // send TypeBox's default error message.
        if (!Value.Check(DonationRequestTypeObject, donation)) {
            const { message, path } = Value.Errors(
                DonationRequestTypeObject,
                donation
            ).First()
            throw new JsonError(`${message} (${path})`)
        }

        if (
            !(await isCaptchaValid(
                donation.captchaToken,
                env.RECAPTCHA_SECRET_KEY
            ))
        )
            throw new JsonError(
                `The CAPTCHA challenge failed. ${PLEASE_TRY_AGAIN}`
            )

        const session = await createCheckoutSession(
            donation,
            env.STRIPE_SECRET_KEY
        )
        const sessionResponse: DonateSessionResponse = { url: session.url }

        return new Response(JSON.stringify(sessionResponse), {
            headers: DEFAULT_HEADERS,
            status: 200,
        })
    } catch (error) {
        return new Response(
            JSON.stringify({ error: stringifyUnknownError(error) }),
            {
                headers: CORS_HEADERS,
                status: +error.status || 500,
            }
        )
    }
}

async function isCaptchaValid(token: string, key: string): Promise<boolean> {
    const response = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${key}&response=${token}`,
        {
            method: "POST",
        }
    )
    const json = (await response.json()) as { success: boolean }
    return json.success
}
