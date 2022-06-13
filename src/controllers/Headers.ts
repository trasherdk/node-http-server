/* eslint-disable unicorn/filename-case */
/* eslint-disable @typescript-eslint/naming-convention */

import { CONTROLLER_METHOD_PARAMETERS } from "../constants";
import { ParameterDataTransformer } from "../types";
import type { IControllerMethodParameter, Nilable } from "../types/internal";
import { getFunctionParamNames, isNil } from "../utils";
import { getListFromObject } from "./utils";

/**
 * Imports one or more HTTP request header into an argument / parameter of a handler
 * as key/value pair.
 *
 * @example
 * ```
 * // index.ts
 *
 * import { Controller, ControllerBase, GET, Headers, IHttpRequest, IHttpResponse, Request, Response } from '@egomobile/http-server'
 *
 * interface IHeaders {
 *   "x-ego-1": string;
 *   "x-ego-2": number;
 *   "x-ego-3": boolean;
 * }
 *
 * @Controller()
 * export default class IndexController extends ControllerBase {
 *   @GET('/foo/:bar/buzz')
 *   async getBar(
 *     @Headers(({ key, source }) => {
 *       if (key === 'x-ego-2') {
 *         return Number(source)
 *       } else if (key === 'x-ego-3') {
 *         return Boolean(source)
 *       }
 *
 *       return source
 *     }, 'x-ego-1', 'x-ego-2', 'x-ego-3') importedHeaders: IHeaders,
 *
 *     @Response() response: IHttpResponse
 *   ) {
 *     response.write(`x-ego-1: ${importedHeaders['x-ego-1']} (${typeof importedHeaders['x-ego-1']})\n`)
 *     response.write(`x-ego-2: ${importedHeaders['x-ego-2']} (${typeof importedHeaders['x-ego-2']})\n`)
 *     response.write(`x-ego-3: ${importedHeaders['x-ego-3']} (${typeof importedHeaders['x-ego-3']})\n`)
 *   }
 * }
 * ```
 *
 * @param {string[]} [names] One or more headers to import. If the list is empty, all headers are taken.
 * @param {ParameterDataTransformer} [transformer] The custom transformer function to use.
 *
 * @returns {ParameterDecorator} The new decorator function.
 */
export function Headers(transformer: ParameterDataTransformer, ...names: string[]): ParameterDecorator;
export function Headers(...names: string[]): ParameterDecorator;
export function Headers(transformerOrName: ParameterDataTransformer | string, ...moreNames: string[]): ParameterDecorator {
    const names: string[] = [];

    let transformer: Nilable<ParameterDataTransformer>;
    if (typeof transformerOrName === "function") {
        transformer = transformerOrName;
        names.push(...moreNames);
    }
    else {
        names.push(transformerOrName, ...moreNames);
    }

    if (names.some((n) => {
        return typeof n !== "string";
    })) {
        throw new TypeError("All items of names must be of type string");
    }

    if (!isNil(transformer)) {
        if (typeof transformer !== "function") {
            throw new TypeError("transformerOrName must be of type string or function");
        }
    }

    return function (target, propertyKey, parameterIndex) {
        const method: Function = (target as any)[propertyKey];

        const parameterName = getFunctionParamNames(method)[parameterIndex];
        if (!parameterName?.trim().length) {
            throw new Error(`Could not get name for parameter ${parameterIndex} of method ${method.name}`);
        }

        getListFromObject<IControllerMethodParameter>(method, CONTROLLER_METHOD_PARAMETERS).push(
            {
                "index": parameterIndex,
                "name": parameterName,
                method,
                "options": {
                    names,
                    "source": "headers",
                    "transformTo": transformer
                }
            }
        );
    };
}
