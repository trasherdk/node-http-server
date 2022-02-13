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

import type { IncomingMessage, ServerResponse } from 'http';
import type { AnySchema, ValidationError as JoiValidationError } from 'joi';
import type { OpenAPIV3 } from 'openapi-types';
import type { URLSearchParams } from 'url';
import type { ParseError } from '../errors/parse';
import type { Nilable, ObjectKey, Optional } from './internal';

/**
 * An 'authorize' argument value.
 */
export type AuthorizeArgumentValue = AuthorizeOptionArgument1 | AuthorizeRoles;

/**
 * A function, that provides an authorized user, if possible.
 *
 * @returns {Nilable<IAuthorizedUser>|Promise<Nilable<IAuthorizedUser>>} The result with the authorized user, if possible.
 */
export type AuthorizedUserProvider =
    (context: IAuthorizedUserProviderContext) => Nilable<IAuthorizedUser> | Promise<Nilable<IAuthorizedUser>>;

/**
 * Is invoked, when authorize fails.
 *
 * @param {any} reason The reason.
 * @param {IHttpRequest} request The request context.
 * @param {IHttpRequest} response The request context.
 */
export type AuthorizeValidationFailedHandler =
    (reason: any, request: IHttpRequest, response: IHttpResponse) => any;

/**
 * An argument for authorize options.
 */
export type AuthorizeOptionArgument1 = AuthorizeValidator | IAuthorizeOptions | string;

/**
 * A function, that provides 'authorize' roles.
 */
export type AuthorizeRolesProvider =
    (context: IControllersAuthorizeRoleProviderContext) => AuthorizeRoles | Promise<AuthorizeRoles>;

/**
 * Possible values for 'authorize' rules.
 */
export type AuthorizeRoles = any[];

/**
 * A value, that provides 'authorize' roles.
 */
export type AuthorizeRolesValue = AuthorizeRoles | AuthorizeRolesProvider;

/**
 * A validator for 'authorize' actions.
 *
 * @param {IAuthorizeValidatorContext} context The context.
 *
 * @returns {any} A result, that indicates if request is authorized or not.
 */
export type AuthorizeValidator = (context: IAuthorizeValidatorContext) => any;

/**
 *  A validator for 'authorize' actions.
 */
export type AuthorizeValidatorValue = AuthorizeValidator | string;

/**
 * A possible value for a first argument of a HTTP method / controller route decorator
 * like GET() or POST().
 */
export type ControllerRouteArgument1<TOptions extends IControllerRouteOptions = IControllerRouteOptions>
    = number | string | AnySchema | TOptions | HttpMiddleware[];

/**
 * A possible value for a second argument of a HTTP method / controller route decorator
 * like GET() or POST().
 */
export type ControllerRouteArgument2
    = AnySchema | HttpMiddleware[] | number | Nilable<HttpInputDataFormat>;

/**
 * A possible value for a third argument of a HTTP method / controller route decorator
 * like GET() or POST().
 */
export type ControllerRouteArgument3 = number;

/**
 * A possible value for a path of a controller route.
 */
export type ControllerRoutePath = string;

/**
 * Base document of an 'IControllersSwaggerOptions' object.
 */
export type ControllersSwaggerBaseDocument = Pick<Pick<OpenAPIV3.Document, Exclude<keyof OpenAPIV3.Document, 'paths'>>, Exclude<keyof Pick<OpenAPIV3.Document, Exclude<keyof OpenAPIV3.Document, 'paths'>>, 'openapi'>>;

/**
 * Possible values for Swagger options for controllers.
 */
export type ControllersSwaggerOptionsValue = IControllersSwaggerOptions | false;

/**
 * A method / function, that updates the documentation of a route / controller method, e.g.
 */
export type DocumentationUpdaterHandler = (context: IDocumentationUpdaterContext) => any;

/**
 * Returns a status code from an error object.
 *
 * @param {any} error The error object.
 *
 * @returns {number} The status code.
 */
export type GetStatusCodeFromError = (error: any) => number;

/**
 * A HTTP error handler.
 *
 * @param {any} error The error.
 * @param {IncomingMessage} request The request context.
 * @param {ServerResponse} response The response context.
 */
export type HttpErrorHandler = (error: any, request: IncomingMessage, response: ServerResponse) => any;

/**
 * The format of the input data of a HTTP request.
 */
export enum HttpInputDataFormat {
    /**
     * Binary.
     */
    Binary = 1,
    /**
     * JSON
     */
    JSON = 2,
}

/**
 * A possible value for a HTTP method.
 */
export type HttpMethod = 'connect' | 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace';

/**
 * A middleware.
 *
 * @param {IHttpRequest} request The request context.
 * @param {IHttpResponse} response The response context.
 * @param {NextFunction} next The next function.
 */
export type HttpMiddleware = (request: IHttpRequest, response: IHttpResponse, next: NextFunction) => any;

/**
 * A 'not found' handler.
 *
 * @param {IncomingMessage} request The request context.
 * @param {ServerResponse} response The response context.
 */
export type HttpNotFoundHandler = (request: IncomingMessage, response: ServerResponse) => any;

/**
 * Request handler options or one or more middleware(s).
 */
export type HttpOptionsOrMiddlewares = IHttpRequestHandlerOptions | HttpMiddleware | HttpMiddleware[];

/**
 * Validates a request path.
 *
 * @param {IncomingMessage} request The request context.
 *
 * @returns {boolean} Path does match or not.
 */
export type HttpPathValidator = (request: IncomingMessage) => boolean;

/**
 * A request handler.
 *
 * @param {IHttpResponse} request The request context.
 * @param {Response} response The response context.
 */
export type HttpRequestHandler = (request: IHttpRequest, response: IHttpResponse) => any;

/**
 * A possible value for a request path.
 */
export type HttpRequestPath = string | RegExp | HttpPathValidator;

/**
 * Information about an authorized user.
 */
export interface IAuthorizedUser {
    /**
     * The roles of the user.
     */
    roles: AuthorizeRoles;
}

/**
 * Context for 'AuthorizedUserProvider'.
 */
export interface IAuthorizedUserProviderContext {
    /**
     * The underlying request.
     */
    request: IHttpRequest;
}

/**
 * Options for an 'authorize' decorator or prop.
 */
export interface IAuthorizeOptions {
    /**
     * A function, which tries to find a user for the current request.
     */
    findAuthorizedUser?: Nilable<AuthorizedUserProvider>;
    /**
     * Is invoked, when validationf failes.
     */
    onValidationFailed?: Nilable<AuthorizeValidationFailedHandler>;
    /**
     * The available roles to use, or the function that provide it.
     */
    roles?: Nilable<AuthorizeRolesValue>;
    /**
     * A custom function to setup an 'authorize' middleware.
     */
    setupMiddleware?: Nilable<SetupAuthorizeMiddlewareHandler>;
    /**
     * A list of custom middlewares to add BEFORE the authorize middleware.
     */
    use?: Nilable<HttpMiddleware[]>;
    /**
     * The custom validator to use.
     */
    validator?: Nilable<AuthorizeValidatorValue>;
}

/**
 * A context for a ''.
 */
export interface IAuthorizeValidatorContext {
    /**
     * The request context.
     */
    request: IHttpRequest;
    /**
     * The response context.
     */
    response: IHttpResponse;
    /**
     * List of roles.
     */
    roles: AuthorizeRoles;
}

/**
 * Options for a controller route without a body.
 */
export interface IControllerRouteOptions {
    /**
     * Custom 'authorize' options.
     */
    authorize?: Nilable<AuthorizeArgumentValue>;
    /**
     * Optional Swagger documentation.
     */
    documentation?: Nilable<OpenAPIV3.OperationObject>;
    /**
     * Indicates, that query parameters should NOT be parsed.
     */
    noQueryParams?: Nilable<boolean>;
    /**
     * The custom error handler.
     */
    onError?: Nilable<HttpErrorHandler>;
    /**
     * The custom path.
     */
    path?: Nilable<ControllerRoutePath>;
    /**
     * The custom serializer.
     */
    serializer?: Nilable<ResponseSerializer>;
    /**
     * One or more middlewares for the route.
     */
    use?: Nilable<HttpMiddleware | HttpMiddleware[]>;
}

/**
 * Options for a controller route with a body.
 */
export interface IControllerRouteWithBodyOptions extends IControllerRouteOptions {
    /**
     * The expected data of the input format.
     */
    format?: Nilable<HttpInputDataFormat>;
    /**
     * The limit in bytes for the input data.
     *
     * If that value is defined, but no schema, the input data will be downloaded
     * and written as Buffer using 'buffer()' middleware.
     */
    limit?: Nilable<number>;
    /**
     * The object schema to validate.
     *
     * 'json()' is used to parse the input.
     */
    schema?: Nilable<AnySchema>;
    /**
     * Custom schema validation error handler.
     */
    onValidationFailed?: Nilable<ValidationFailedHandler>;
}

/**
 * Context for a 'ControllersAuthorizeRoleProvider' function.
 */
export interface IControllersAuthorizeRoleProviderContext {
    /**
     * The request context.
     */
    request: IHttpRequest;
}

/**
 * Describes the object for 'authorize' prop of 'IControllersOptions' interface.
 */
export interface IControllersAuthorizeOptions {
    /**
     * A default function, which tries to find a user for the current request.
     */
    findAuthorizedUser?: Nilable<AuthorizedUserProvider>;
    /**
     * Is invoked, when validationf failes.
     */
    onValidationFailed?: Nilable<AuthorizeValidationFailedHandler>;
    /**
     * A custom, global function to setup an 'authorize' middleware.
     */
    setupMiddleware?: Nilable<SetupAuthorizeMiddlewareHandler>;
    /**
     * A list of custom middlewares to add BEFORE the authorize middleware.
     */
    use?: Nilable<HttpMiddleware[]>;
    /**
     * The default validator.
     */
    validator?: Nilable<AuthorizeValidatorValue>;
}

/**
 * Options for 'controllers()' method of 'IHttpServer' instance.
 */
export interface IControllersOptions {
    /**
     * Options for 'authorize' feature.
     */
    authorize?: Nilable<IControllersAuthorizeOptions>;
    /**
     * List of (value) imports.
     */
    imports?: Nilable<ImportValues>;
    /**
     * Default value, that indicates, that query parameters should NOT be parsed.
     */
    noQueryParams?: Nilable<boolean>;
    /**
     * The custom file patterns.
     *
     * @see https://www.npmjs.com/package/minimatch
     */
    patterns?: Nilable<string | string[]>;
    /**
     * The custom root directory. Default: 'controllers'
     */
    rootDir?: Nilable<string>;
    /**
     * Options to setup Swagger UI.
     */
    swagger?: Nilable<ControllersSwaggerOptionsValue>;
}

/**
 * Swagger options for controllers.
 */
export interface IControllersSwaggerOptions {
    /**
     * The base path. Default: /swagger
     */
    basePath?: Nilable<string>;
    /**
     * The base document.
     */
    document: ControllersSwaggerBaseDocument;
}

/**
 * Context of a method, that updates the documentation of a route / controller method.
 */
export interface IDocumentationUpdaterContext {
    /**
     * The underlying documentation.
     */
    documentation: OpenAPIV3.OperationObject;
    /**
     * The HTTP method.
     */
    method: Uppercase<HttpMethod>;
    /**
     * The path of the route.
     */
    path: HttpRequestPath;
}

/**
 * Information about an existing and authorized user.
 */
export interface IExistingAndAuthorizedUser {
    /**
     * The roles of the user.
     */
    roles: AuthorizeRoles;
}

/**
 * Options for a body parser function.
 */
export interface IHttpBodyParserOptions {
    /**
     * Defines the maximum size of the body, in bytes.
     * (null) indicates to use NO limit
     */
    limit?: Nilable<number>;
    /**
     * A custom handler, to tell the client, that the body is too big.
     */
    onLimitReached?: Nilable<HttpRequestHandler>;
}

/**
 * A HTTP controller.
 */
export interface IHttpController<TApp extends any = IHttpServer> {
    /**
     * The underlying app instance.
     */
    readonly __app: TApp;
    /**
     * The full path of the underlying file.
     */
    readonly __file: string;
    /**
     * The relative path of the underlying file.
     */
    readonly __path: string;
}

/**
 * Options for a controller instance.
 */
export interface IHttpControllerOptions<TApp extends any = IHttpServer> {
    /**
     * The underlying app.
     */
    app: TApp;
    /**
     * The full path of the underlying file.
     */
    file: string;
    /**
     * The relative path of the underlying file.
     */
    path: string;
}

/**
 * Options for a request handler.
 */
export interface IHttpRequestHandlerOptions {
    /**
     * Automatic call `end()` method on response context
     * when handler was executed successfully.
     *
     * Default: (true)
     */
    autoEnd?: Optional<boolean>;
    /**
     * A list of one or more middlewares.
     */
    use?: Nilable<HttpMiddleware[]>;
}

/**
 * A HTTP request.
 */
export interface IHttpRequest<TBody extends any = any> extends IncomingMessage {
    /**
     * The body, if parsed.
     */
    body?: Optional<TBody>;
    /**
     * List of cookies, if parsed.
     */
    cookies?: Optional<Record<string, string>>;
    /**
     * The current language, if parsed.
     */
    lang?: Nilable<string>;
    /**
     * List of query parameters, if parsed.
     */
    query?: Optional<URLSearchParams>;
}

/**
 * A HTTP response.
 */
export interface IHttpResponse extends ServerResponse {
}

/**
 * A HTTP server instance.
 */
export interface IHttpServer {
    /**
     * A HTTP server itself is a HTTP request listener,
     * which can be used in any compatible server instance, like
     * Node HTTP, e.g.
     *
     * @example
     * ```
     * import createServer from '@egomobile/http-server'
     * import { createServer as createHTTPServer } from 'http'
     *
     * const app = createServer()
     * const server = createHTTPServer(app)
     *
     * server.listen(8080, () => {
     *   console.log('Server is listing')
     * })
     * ```
     */
    (request: IncomingMessage, response: ServerResponse): void;

    /**
     * Registers a route for all possible request methods.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.all('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    all(path: HttpRequestPath, handler: HttpRequestHandler): this;
    all(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * Closes / stops the server.
     *
     * @example
     * ```
     * import createServer from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * await app = server.listen()
     * console.log('Server is listening')
     *
     * setTimeout(() => {
     *     app.close().catch(console.error)
     * }, 60000)
     * ```
     */
    close(): Promise<void>;

    /**
     * Registers a route for a CONNECT request.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.connect('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    connect(path: HttpRequestPath, handler: HttpRequestHandler): this;
    connect(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * Loads an initializes the controllers from and inside a root directory.
     *
     * @example
     * ```
     * import createServer from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * // scans the subdirectory 'controllers' of the current process'
     * // working directory for JavaScript and/or TypeScript files,
     * // which do not start with _ and have a class as default export,
     * // that is marked with @Controller decorator
     * // and creates instances from that classes, which will be automatically
     * // mapped as handlers for 'app' instance
     * app.controllers()
     *
     * await app.listen()
     * ```
     *
     * @param {Nilable<string>} [rootDir] The custom root directory.
     * @param {Nilable<ImportValues>} [imports] Values to import.
     * @param {Nilable<IControllersOptions>} [options] Custom options.
     */
    controllers(): this;
    controllers(rootDir: Nilable<string>, imports?: Nilable<ImportValues>): this;
    controllers(options: Nilable<IControllersOptions>): this;

    /**
     * Registers a route for a DELETE request.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.delete('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    delete(path: HttpRequestPath, handler: HttpRequestHandler): this;
    delete(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * Gets the current error handler.
     */
    readonly errorHandler: HttpErrorHandler;

    /**
     * Registers a route for a GET request.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.get('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    get(path: HttpRequestPath, handler: HttpRequestHandler): this;
    get(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * Registers a route for a HEAD request.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.head('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    head(path: HttpRequestPath, handler: HttpRequestHandler): this;
    head(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * Indicates if that instance is an e.GO HTTP server.
     *
     * @example
     * ```
     * import assert from 'assert'
     * import createServer from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * assert.strictEqual(app.isEgoHttpServer, true)
     * ```
     */
    readonly isEgoHttpServer: true;

    /**
     * Starts listening for connections.
     *
     * @param {Nilable<number|string>} [port] The custom TCP port.
     *                                        Default is 8080 in development mode (NODE_ENV), otherwise 80.
     *
     * @example
     * ```
     * import createServer from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * await app.listen()  // if NODE_ENV === 'development', port is 8080
     *                     // otherwise port is 80
     *
     * await app.listen(5979)  // explicit port 5979
     * ```
     */
    listen(port?: Nilable<number | string>): Promise<void>;

    /**
     * Gets the current "not found" handler.
     */
    readonly notFoundHandler: HttpNotFoundHandler;

    /**
     * Registers a route for a OPTIONS request.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.options('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    options(path: HttpRequestPath, handler: HttpRequestHandler): this;
    options(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * Registers a route for a PATCH request.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.patch('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    patch(path: HttpRequestPath, handler: HttpRequestHandler): this;
    patch(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * The current TCP port or (undefined) if server is not running.
     */
    readonly port?: Optional<number>;

    /**
     * Registers a route for a POST request.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.post('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    post(path: HttpRequestPath, handler: HttpRequestHandler): this;
    post(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * Registers a route for a PUT request.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.put('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    put(path: HttpRequestPath, handler: HttpRequestHandler): this;
    put(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * Sets a custom error handler.
     *
     * @param {HttpErrorHandler} handler The new handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.setErrorHandler(async (error: any, request: IHttpRequest, response: IHttpResponse) => {
     *     const errorMessage = Buffer.from('SERVER ERROR: ' + String(error))
     *
     *     if (!response.headersSent) {
     *         response.writeHead(500, {
     *             'Content-Length': String(errorMessage.length)
     *         })
     *     }
     *
     *     response.write(errorMessage)
     *     response.end()
     * })
     *
     * app.get('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     throw new Error('Something went wrong')
     * })
     *
     * await app.listen()
     * ```
     *
     * @returns {this}
     */
    setErrorHandler(handler: HttpErrorHandler): this;

    /**
     * Sets a new 'not found' handler.
     *
     * @param {HttpNotFoundHandler} handler The new handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.setNotFoundHandler(async (request: IHttpRequest, response: IHttpResponse) => {
     *     const errorMessage = Buffer.from(`The page ${request.url} could not be found`)
     *
     *     if (!response.headersSent) {
     *         response.writeHead(404, {
     *             'Content-Length': String(errorMessage.length)
     *         })
     *     }
     *
     *     response.write(errorMessage)
     *     response.end()
     * })
     *
     * // ... your routes
     *
     * await app.listen()
     * ```
     *
     * @returns {this}
     */
    setNotFoundHandler(handler: HttpNotFoundHandler): this;

    /**
     * Registers a route for a TRACE request.
     *
     * @param {HttpRequestPath} path The path.
     * @param {OptionsOrMiddlewares} optionsOrMiddlewares The options or middlewares for the handler.
     * @param {HttpRequestHandler} handler The handler.
     *
     * @example
     * ```
     * import createServer, { IHttpRequest, IHttpResponse } from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * app.trace('/', async (request: IHttpRequest, response: IHttpResponse) => {
     *     // do your magic here
     * })
     *
     * await app.listen()  // port === 8080, if NODE_ENV === 'development'; otherwise 80
     * ```
     */
    trace(path: HttpRequestPath, handler: HttpRequestHandler): this;
    trace(path: HttpRequestPath, optionsOrMiddlewares: HttpOptionsOrMiddlewares, handler: HttpRequestHandler): this;

    /**
     * Adds one or more global middlewares.
     *
     * @param {Middleware[]} [middlewares] The middlewares to add.
     *
     * @returns {this}
     *
     * @example
     * ```
     * import assert from 'assert'
     * import createServer from '@egomobile/http-server'
     *
     * const app = createServer()
     *
     * assert.strictEqual(app.isEgoHttpServer, true)
     *
     * app.use(async (request: any, response: any, next) => {
     *     request.foo = '1'
     *     next()
     * }, async (request: any, response: any, next) => {
     *     // foo is currently '1'
     *     request.foo += 2
     *     next()
     * })
     *
     * app.get('/', async (request: any, response: any) => {
     *     response.write(String(request.foo === '12'))
     * })
     * ```
     */
    use(...middlewares: HttpMiddleware[]): this;
}

/**
 * A list of import values.
 */
export type ImportValues = Record<ObjectKey, LazyImportValue>;

/**
 * A (lazy) value.
 */
export type LazyImportValue<T extends any = any> = T | (() => T);

/**
 * Options for a body parser function, that works with string data.
 */
export interface IHttpStringBodyParserOptions extends IHttpBodyParserOptions {
    /**
     * The custom string encoding to use. Default: utf8
     */
    encoding?: Nilable<BufferEncoding>;
}

/**
 * Context for a 'SetupAuthorizeMiddlewareHandler' function.
 */
export interface ISetupAuthorizeMiddlewareHandlerContext {
    /**
     * The 'authorize' middleware to setup.
     */
    authorizeMiddlewares: HttpMiddleware[];
    /**
     * The array with the current list of middlewares.
     */
    middlewares: HttpMiddleware[];
}

/**
 * A next function.
 *
 * @param {Optional<any>} [error] The error, if occurred.
 */
export type NextFunction = (error?: Optional<any>) => void;

/**
 * A handler, that is executed, if data could not be parsed.
 *
 * @param {ParseError} error The thrown error.
 * @param {IHttpRequest} request The request context.
 * @param {IHttpResponse} response The response context.
 */
export type ParseErrorHandler = (error: ParseError, request: IHttpRequest, response: IHttpResponse) => Promise<any>;

/**
 * A function, that serializes something for the response
 * and sends it.
 *
 * @param {TResult} result The result to serialize.
 * @param {IHttpRequest} request The request context.
 * @param {IHttpResponse} response The response context.
 */
export type ResponseSerializer<TResult extends any = any> =
    (result: TResult, request: IHttpRequest, response: IHttpResponse) => any;

/**
 * A function, that sets up a 'authorize' middleware for a route.
 *
 * @param {ISetupAuthorizeMiddlewareHandlerContext} context The context.
 */
export type SetupAuthorizeMiddlewareHandler = (context: ISetupAuthorizeMiddlewareHandlerContext) => any;

/**
 * A handler, that is executed, if data is invalid.
 *
 * @param {JoiValidationError} error The error information.
 * @param {IHttpRequest} request The request context.
 * @param {IHttpResponse} response The response context.
 */
export type ValidationFailedHandler = (error: JoiValidationError, request: IHttpRequest, response: IHttpResponse) => any;
