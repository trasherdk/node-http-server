// This file is part of the @egomobile/http-server distribution.
// Copyright (c) Next.e.GO Mobile SE, Aachen, Germany (https://e-go-mobile.com/)
//
// @egomobile/http-server is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as
// published by the Free Software Foundation, version 3.
//
// @egomobile/http-server is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

import type { HttpRequestHandler, JsonSchemaValidationFailedHandler, ParseErrorHandler, SchemaValidationFailedHandler, ValidationFailedHandler } from "../types";

/**
 * Default limit of a body parser: 128 MB
 */
export const defaultBodyLimit = 134217728;

/**
 * The default 'parse error' handler.
 *
 * @param {IJsonSchemaError[]} errors The error.
 * @param {IncomingMessage} request The request context.
 * @param {ServerResponse} response The response context.
 */
export const defaultJsonSchemaValidationFailedHandler: JsonSchemaValidationFailedHandler = async (errors, request, response) => {
    if (!response.headersSent) {
        response.writeHead(400, {
            "Content-Length": "0"
        });
    }
};

/**
 * The default 'body limit reached' handler.
 *
 * @param {IncomingMessage} request The request context.
 * @param {ServerResponse} response The response context.
 */
export const defaultLimitReachedHandler: HttpRequestHandler = async (request, response) => {
    if (!response.headersSent) {
        response.writeHead(413, {
            "Content-Length": "0"
        });
    }
};

/**
 * The default 'parse error' handler.
 *
 * @param {ParseError} error The error.
 * @param {IncomingMessage} request The request context.
 * @param {ServerResponse} response The response context.
 */
export const defaultParseErrorHandler: ParseErrorHandler = async (error, request, response) => {
    if (!response.headersSent) {
        response.writeHead(400, {
            "Content-Length": "0"
        });
    }
};

/**
 * The default 'query validation error' handler.
 *
 * @param {ParseError} error The error.
 * @param {IncomingMessage} request The request context.
 * @param {ServerResponse} response The response context.
 */
export const defaultQueryValidationFailedHandler: ValidationFailedHandler = async (error, request, response) => {
    if (!response.headersSent) {
        response.writeHead(400, {
            "Content-Length": "0"
        });
    }
};

/**
 * The default 'schema validation error' handler.
 *
 * @param {AjvError[]} errors The errors.
 * @param {IncomingMessage} request The request context.
 * @param {ServerResponse} response The response context.
 */
export const defaultSchemaValidationFailedHandler: SchemaValidationFailedHandler = async (errors, request, response) => {
    if (!response.headersSent) {
        response.writeHead(400, {
            "Content-Length": "0"
        });
    }
};

/**
 * The default 'schema validation error' handler.
 *
 * @param {JoiValidationError} error The error.
 * @param {IncomingMessage} request The request context.
 * @param {ServerResponse} response The response context.
 */
export const defaultValidationFailedHandler: ValidationFailedHandler = async (error, request, response) => {
    if (!response.headersSent) {
        response.writeHead(400, {
            "Content-Length": "0"
        });
    }
};

export * from "./apiKey";
export * from "./auth";
export * from "./basicAuth";
export * from "./buffer";
export * from "./cookies";
export * from "./json";
export * from "./lang";
export * from "./query";
export * from "./text";
export * from "./validate";
export * from "./validateAjv";
export * from "./validateQuery";
export * from "./validateWithSwagger";
export * from "./yaml";

