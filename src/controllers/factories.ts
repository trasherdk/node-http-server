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

import fs from "fs";
import { isSchema } from "joi";
import minimatch from "minimatch";
import { OpenAPIV3 } from "openapi-types";
import path from "path";
import { CONTROLLERS_CONTEXES, CONTROLLER_METHOD_PARAMETERS, CONTROLLER_MIDDLEWARES, DOCUMENTATION_UPDATER, ERROR_HANDLER, HTTP_METHODS, INIT_CONTROLLER_AUTHORIZE, INIT_CONTROLLER_METHOD_ACTIONS, INIT_CONTROLLER_METHOD_SWAGGER_ACTIONS, IS_CONTROLLER_CLASS, PARSE_ERROR_HANDLER, PREPARE_CONTROLLER_METHOD_ACTIONS, RESPONSE_SERIALIZER, ROUTER_PATHS, SETUP_DOCUMENTATION_UPDATER, SETUP_ERROR_HANDLER, SETUP_IMPORTS, SETUP_PARSE_ERROR_HANDLER, SETUP_RESPONSE_SERIALIZER, SETUP_VALIDATION_ERROR_HANDLER, SWAGGER_METHOD_INFO, VALIDATION_ERROR_HANDLER } from "../constants";
import { buffer, defaultParseErrorHandler, defaultValidationFailedHandler, json, query, validate } from "../middlewares";
import { setupSwaggerUIForServerControllers } from "../swagger";
import { toSwaggerPath } from "../swagger/utils";
import { ControllerRouteArgument1, ControllerRouteArgument2, ControllerRouteArgument3, DocumentationUpdaterHandler, HttpErrorHandler, HttpInputDataFormat, HttpMethod, HttpMiddleware, HttpRequestHandler, HttpRequestPath, IControllerMethodInfo, IControllerRouteWithBodyOptions, IControllersOptions, IControllersSwaggerOptions, IHttpController, IHttpControllerOptions, IHttpRequest, IHttpResponse, IHttpServer, ImportValues, IParameterOptionsWithHeadersSource, IParameterOptionsWithQueriesSource, IParameterOptionsWithUrlsSource, ParameterDataTransformer, ParameterDataTransformTo, ParameterOptions, ResponseSerializer, ValidationFailedHandler } from "../types";
import type { Func, GetterFunc, IControllerClass, IControllerContext, IControllerFile, IControllerMethodParameter, InitControllerAuthorizeAction, InitControllerErrorHandlerAction, InitControllerImportAction, InitControllerMethodAction, InitControllerMethodSwaggerAction, InitControllerParseErrorHandlerAction, InitControllerSerializerAction, InitControllerValidationErrorHandlerAction, InitDocumentationUpdaterAction, ISwaggerMethodInfo, Nilable, PrepareControllerMethodAction } from "../types/internal";
import { asAsync, canHttpMethodHandleBodies, createObjectNameListResolver, getAllClassProps, getFunctionParamNames, isClass, isNil, limitToBytes, sortObjectByKeys, urlSearchParamsToObject, walkDirSync } from "../utils";
import { params } from "../validators/params";
import { createBodyParserMiddlewareByFormat, createInitControllerAuthorizeAction, getListFromObject, getMethodOrThrow, normalizeRouterPath } from "./utils";

type GetContollerValue<TValue extends any = any> = (controller: IHttpController, server: IHttpServer) => TValue;

interface ICompileRouteHandlerOptions {
    controller: IHttpController<IHttpServer>;
    method: Function;
}

interface ICreateControllerMethodRequestHandlerOptions {
    getErrorHandler: GetterFunc<HttpErrorHandler>;
    handler: HttpRequestHandler;
}

export interface ICreateHttpMethodDecoratorOptions {
    decoratorOptions: {
        arg1: Nilable<ControllerRouteArgument1<IControllerRouteWithBodyOptions>>;
        arg2: Nilable<ControllerRouteArgument2>;
        arg3: Nilable<ControllerRouteArgument3>;
    };
    name: HttpMethod;
}

interface ICreateInitControllerMethodActionOptions {
    controllerMethodName: string;
    decoratorOptions: Nilable<IControllerRouteWithBodyOptions>;
    getErrorHandler: GetContollerValue<HttpErrorHandler>;
    httpMethod: HttpMethod;
    middlewares: HttpMiddleware[];
    updateMiddlewares: (options: IUpdateMiddlewaresOptions) => void;
}

interface ICreateInitControllerMethodSwaggerActionOptions {
    doc: OpenAPIV3.OperationObject;
    method: Function;
    methodName: string | symbol;
}

export interface ICreateParameterDecoratorOptions {
    options: ParameterOptions;
}

interface ICreateRequestHandlerWithSerializerOptions {
    handler: HttpRequestHandler;
    serializer: ResponseSerializer;
}

interface IParameterValueUpdaterContext {
    args: any[];
    request: IHttpRequest;
    response: IHttpResponse;
}

interface IToParameterDataTransformerWithValidatorOptions {
    transformTo: Nilable<ParameterDataTransformTo>;
}

interface IUpdateMiddlewaresOptions {
    controller: IHttpController<IHttpServer>;
    globalOptions: Nilable<IControllersOptions>;
    middlewares: HttpMiddleware[];
}

type ParameterValueUpdater = (context: IParameterValueUpdaterContext) => Promise<any>;

function compileRouteHandler({ controller, method }: ICompileRouteHandlerOptions): HttpRequestHandler {
    const baseMethod = method.bind(controller) as Func;

    const parameters = getListFromObject<IControllerMethodParameter>(
        method,
        CONTROLLER_METHOD_PARAMETERS,
        true,
        false
    );
    if (parameters.length) {
        const willRequestBeOverwritten = parameters.some((p) => {
            return p.index === 0;
        });
        const hasRequestImport = parameters.some((p) => {
            return p.options.source === "request";
        });

        const willResponseBeOverwritten = parameters.some((p) => {
            return p.index === 1;
        });
        const hasResponseImport = parameters.some((p) => {
            return p.options.source === "response";
        });

        const paramCount = Math.max(2, ...parameters.map(p => {
            return p.index + 1;
        }));

        const updaters = toParameterValueUpdaters(parameters);

        return async (request, response) => {
            const args: any[] = Array.from({
                "length": paramCount
            }, function () { });

            args[0] = request;
            args[1] = response;

            for (const updater of updaters) {
                await updater({
                    args,
                    request,
                    response
                });
            }

            if (!hasResponseImport && willRequestBeOverwritten) {
                args.push(request);
            }

            if (!hasRequestImport && willResponseBeOverwritten) {
                args.push(response);
            }

            return baseMethod(...args);
        };
    }
    else {
        return baseMethod as HttpRequestHandler;
    }
}

function createControllerMethodRequestHandler({ getErrorHandler, handler }: ICreateControllerMethodRequestHandlerOptions): HttpRequestHandler {
    handler = asAsync<HttpRequestHandler>(handler);

    return async (request, response) => {
        try {
            await handler(request, response);
        }
        catch (error) {
            await getErrorHandler()(error, request, response);
        }
    };
}

export function createHttpMethodDecorator(options: ICreateHttpMethodDecoratorOptions): MethodDecorator {
    const throwIfOptionsIncompatibleWithHTTPMethod = () => {
        if (!canHttpMethodHandleBodies(options.name?.toUpperCase())) {
            throw new Error(`Cannot use schema with ${options.name.toUpperCase()} requests`);
        }
    };

    const { arg1, arg2, arg3 } = options.decoratorOptions;

    let decoratorOptions: Nilable<IControllerRouteWithBodyOptions>;

    if (!isNil(arg1)) {
        if (isSchema(arg1)) {
            // [arg1] AnySchema
            // [arg2] number
            decoratorOptions = { "schema": arg1 };

            if (!isNil(arg2)) {
                if (typeof arg2 === "number") {
                    decoratorOptions.limit = limitToBytes(arg2);
                }
                else {
                    throw new TypeError("arg2 must be of type number");
                }
            }
        }
        else if (typeof arg1 === "string") {
            // [arg1] string
            decoratorOptions = { "path": arg1 };

            if (!isNil(arg2)) {
                if (Array.isArray(arg2)) {
                    // [arg2] HttpMiddleware[]
                    decoratorOptions.use = arg2;
                }
                else if (isSchema(arg2)) {
                    // [arg2] AnySchema
                    // [arg3] number

                    decoratorOptions.schema = arg2;

                    if (!isNil(arg3)) {
                        if (typeof arg3 === "number") {
                            decoratorOptions.limit = limitToBytes(arg3);
                        }
                        else {
                            throw new TypeError("arg3 must be of type number");
                        }
                    }
                }
                else {
                    throw new TypeError("arg2 must be of type array or schema");
                }
            }
        }
        else if (Array.isArray(arg1)) {
            // [arg1] HttpMiddleware[]
            decoratorOptions = { "use": arg1 };
        }
        else if (typeof arg1 === "number") {
            // [arg1] number
            decoratorOptions = { "limit": limitToBytes(arg1) };

            if (!isNil(arg2)) {
                // [arg2] HttpInputDataFormat

                if (Object.values(HttpInputDataFormat).includes(arg2 as any)) {
                    decoratorOptions.format = arg2 as HttpInputDataFormat;
                }
                else {
                    throw new TypeError("arg2 must be of type HttpInputDataFormat");
                }
            }
        }
        else if (typeof arg1 === "object") {
            // [arg1] IControllerRouteOptions | IControllerRouteWithBodyOptions
            decoratorOptions = arg1;
        }
        else {
            throw new TypeError("arg1 must be of type array, number, object, schema or string");
        }
    }

    if (!isNil(decoratorOptions)) {
        if (typeof decoratorOptions !== "object") {
            throw new TypeError("decoratorOptions must be of type object");
        }
    }

    if (!isNil(decoratorOptions?.limit)) {
        if (typeof decoratorOptions?.limit !== "number") {
            throw new TypeError("decoratorOptions.limit must be of type number");
        }
    }

    if (!isNil(decoratorOptions?.path)) {
        if (typeof decoratorOptions?.path !== "string") {
            throw new TypeError("decoratorOptions.path must be of type string");
        }
    }

    if (!isNil(decoratorOptions?.onError)) {
        if (typeof decoratorOptions?.onError !== "function") {
            throw new TypeError("decoratorOptions.onError must be of type function");
        }
    }

    if (!isNil(decoratorOptions?.onValidationFailed)) {
        if (typeof decoratorOptions?.onValidationFailed !== "function") {
            throw new TypeError("decoratorOptions.onValidationFailed must be of type function");
        }
    }

    if (!isNil(decoratorOptions?.onParsingFailed)) {
        if (typeof decoratorOptions?.onParsingFailed !== "function") {
            throw new TypeError("decoratorOptions.onParsingFailed must be of type function");
        }
    }

    if (!isNil(decoratorOptions?.schema)) {
        if (!isSchema(decoratorOptions?.schema)) {
            throw new TypeError("decoratorOptions.schema must be a Joi object");
        }
    }

    if (!isNil(decoratorOptions?.serializer)) {
        if (typeof decoratorOptions?.serializer !== "function") {
            throw new TypeError("decoratorOptions.serializer must be of type function");
        }
    }

    if (!isNil(decoratorOptions?.documentation)) {
        if (typeof decoratorOptions?.documentation !== "object") {
            throw new TypeError("decoratorOptions.documentation must be of type object");
        }
    }

    return function (target, methodName, descriptor) {
        const method = getMethodOrThrow(descriptor);

        let httpMethods: Nilable<HttpMethod[]> = (method as any)[HTTP_METHODS];
        if (!httpMethods) {
            (method as any)[HTTP_METHODS] = httpMethods = [];
        }
        if (!httpMethods.includes(options.name)) {
            httpMethods.push(options.name);
        }
        httpMethods = [...httpMethods].sort();

        const middlewares: HttpMiddleware[] = [];

        middlewares.push(
            ...(
                Array.isArray(decoratorOptions?.use) ? (decoratorOptions?.use as HttpMiddleware[]) : [decoratorOptions?.use]
            ).filter(mw => {
                return !isNil(mw);
            }) as HttpMiddleware[]
        );

        if (
            !decoratorOptions?.schema &&
            typeof decoratorOptions?.limit === "number"
        ) {
            throwIfOptionsIncompatibleWithHTTPMethod();

            const createDataParser = isNil(decoratorOptions.format) ?
                () => {
                    return buffer({
                        "limit": decoratorOptions?.limit
                    });
                } :
                () => {
                    return createBodyParserMiddlewareByFormat(decoratorOptions?.format || HttpInputDataFormat.Binary, {
                        "limit": decoratorOptions?.limit
                    });
                };

            middlewares.push(createDataParser());
        }

        getListFromObject<InitControllerMethodAction>(method, INIT_CONTROLLER_METHOD_ACTIONS).push(
            createInitControllerMethodAction({
                "controllerMethodName": String(methodName).trim(),
                decoratorOptions,
                "httpMethod": options.name,
                middlewares,
                "getErrorHandler": (controller, server) => {
                    return decoratorOptions?.onError ||
                        (controller as any)[ERROR_HANDLER] ||
                        server.errorHandler;
                },
                "updateMiddlewares": ({ controller, globalOptions, middlewares }) => {
                    // use query() middleware?
                    let shouldAddQueryMiddleware = true;
                    if (isNil(decoratorOptions?.noQueryParams)) {
                        shouldAddQueryMiddleware = !globalOptions?.noQueryParams;
                    }
                    else {
                        shouldAddQueryMiddleware = !decoratorOptions?.noQueryParams;
                    }

                    // schema?
                    if (decoratorOptions?.schema) {
                        throwIfOptionsIncompatibleWithHTTPMethod();

                        const validationErrorHandler =
                            createWrappedValidationErrorHandler(
                                decoratorOptions?.onValidationFailed ||
                                (controller as any)[VALIDATION_ERROR_HANDLER] ||
                                globalOptions?.onSchemaValidationFailed
                            ) || defaultValidationFailedHandler;

                        const parseErrorHandler = (
                            decoratorOptions?.onParsingFailed ||
                            (controller as any)[PARSE_ERROR_HANDLER] ||
                            globalOptions?.onParsingFailed
                        ) || defaultParseErrorHandler;

                        const createDataParser: () => HttpMiddleware = isNil(decoratorOptions?.format) ?
                            () => {
                                return json({
                                    "limit": decoratorOptions?.limit,
                                    "onParsingFailed": parseErrorHandler
                                });
                            } :
                            () => {
                                return createBodyParserMiddlewareByFormat(decoratorOptions?.format || HttpInputDataFormat.JSON, {
                                    "limit": decoratorOptions?.limit,
                                    "onParsingFailed": parseErrorHandler
                                });
                            };

                        middlewares.push(
                            createDataParser(),
                            validate(decoratorOptions.schema, {
                                "onValidationFailed": validationErrorHandler
                            })
                        );
                    }

                    if (shouldAddQueryMiddleware) {
                        middlewares.unshift(query());  // add query parser to beginning
                    }
                }
            })
        );

        if (decoratorOptions?.documentation) {
            getListFromObject<InitControllerMethodSwaggerAction>(method, INIT_CONTROLLER_METHOD_SWAGGER_ACTIONS).push(
                createInitControllerMethodSwaggerAction({
                    "doc": JSON.parse(
                        JSON.stringify(decoratorOptions.documentation)
                    ),
                    method,
                    methodName
                })
            );
        }
    };
}

function createInitControllerMethodAction({
    controllerMethodName,
    decoratorOptions,
    getErrorHandler,
    httpMethod,
    middlewares,
    updateMiddlewares
}: ICreateInitControllerMethodActionOptions): InitControllerMethodAction {
    const authorizeOptions = decoratorOptions?.authorize;
    const controllerRouterPath = decoratorOptions?.path;
    const serializer = decoratorOptions?.serializer;

    return ({ controller, controllerClass, relativeFilePath, method, server, globalOptions, resolveInfo }) => {
        const dir = path.dirname(relativeFilePath);
        const fileName = path.basename(relativeFilePath, path.extname(relativeFilePath));

        let routerPath: HttpRequestPath = dir;
        if (fileName !== "index") {
            routerPath += `/${fileName}`;
        }

        if (controllerRouterPath?.length) {
            routerPath += normalizeRouterPath(controllerRouterPath);
        }
        else {
            if (controllerMethodName.length && controllerMethodName !== "index") {
                routerPath += `/${controllerMethodName}`;
            }
        }

        routerPath = normalizeRouterPath(routerPath);
        routerPath = routerPath.split("/@").join("/:");

        let allRouterPaths: Nilable<string[]> = (method as any)[ROUTER_PATHS];
        if (!allRouterPaths) {
            (method as any)[ROUTER_PATHS] = allRouterPaths = [];
        }
        if (!allRouterPaths.includes(routerPath)) {
            allRouterPaths.push(routerPath);
        }

        if (routerPath.includes("/:")) {
            routerPath = params(routerPath);
        }

        let routeSerializer: Nilable<ResponseSerializer> = serializer || (controller as any)[RESPONSE_SERIALIZER];
        const routeHandler: HttpRequestHandler = compileRouteHandler({
            controller,
            method
        });

        let handler: HttpRequestHandler = asAsync(routeHandler);
        if (routeSerializer) {
            // wrap, only if required
            handler = createRequestHandlerWithSerializer({
                "handler": routeHandler,
                "serializer": routeSerializer
            });
        }

        updateMiddlewares({
            controller,
            middlewares,
            globalOptions
        });

        if (controllerClass.prototype[CONTROLLER_MIDDLEWARES]) {
            // add controler wide middlewares
            // at the beginning of the list
            middlewares.unshift(...controllerClass.prototype[CONTROLLER_MIDDLEWARES]);
        }

        // initialize 'authorizers'
        {
            let authorizeInitializers: InitControllerAuthorizeAction[];
            if (authorizeOptions) {
                // method specific one

                authorizeInitializers = [
                    createInitControllerAuthorizeAction({ "arg": authorizeOptions })
                ];
            }
            else {
                // global, controller-wide

                authorizeInitializers = getListFromObject<InitControllerAuthorizeAction>(
                    controller, INIT_CONTROLLER_AUTHORIZE,
                    false, true
                );
            }

            authorizeInitializers.forEach((action) => {
                action({
                    globalOptions,
                    middlewares
                });
            });
        }

        const requestHandler = createControllerMethodRequestHandler({
            "getErrorHandler": () => {
                return getErrorHandler(controller, server);
            },
            handler
        });

        server[httpMethod](routerPath, middlewares, requestHandler);

        resolveInfo({
            "function": method as Func,
            "handler": requestHandler,
            "method": httpMethod,
            middlewares,
            "name": controllerMethodName,
            "options": decoratorOptions ?? undefined,
            "path": routerPath,
            "serializer": routeSerializer ?? undefined
        });
    };
}

function createInitControllerMethodSwaggerAction({ doc, method, methodName }: ICreateInitControllerMethodSwaggerActionOptions): InitControllerMethodSwaggerAction {
    return ({ apiDocument, controller }) => {
        const info: ISwaggerMethodInfo = {
            doc,
            method
        };

        (method as any)[SWAGGER_METHOD_INFO] = info;

        const routerPaths: Nilable<string[]> = (method as any)[ROUTER_PATHS];
        if (routerPaths?.length) {
            const httpMethods: Nilable<HttpMethod[]> = (method as any)[HTTP_METHODS];

            let paths = apiDocument.paths!;

            if (httpMethods?.length) {
                routerPaths.forEach(routerPath => {
                    const swaggerPath = toSwaggerPath(routerPath);

                    httpMethods!.forEach(httpMethod => {
                        let pathObj: any = paths[swaggerPath];
                        if (!pathObj) {
                            pathObj = {};
                        }

                        let methodObj: any = pathObj[httpMethod];
                        if (methodObj) {
                            throw new Error(`Cannot reset documentation for route ${routerPath} (${httpMethod.toUpperCase()})`);
                        }

                        const docUpdater: Nilable<DocumentationUpdaterHandler> = (controller as any)[DOCUMENTATION_UPDATER];
                        if (docUpdater) {
                            docUpdater({
                                "documentation": doc,
                                "method": httpMethod.toUpperCase() as Uppercase<HttpMethod>,
                                "path": routerPath
                            });
                        }

                        pathObj[httpMethod] = doc;

                        paths[swaggerPath] = sortObjectByKeys(pathObj);
                    });
                });
            }

            apiDocument.paths = sortObjectByKeys(paths);
        }
    };
}

export function createParameterDecorator({
    options
}: ICreateParameterDecoratorOptions): ParameterDecorator {
    return function (target, propertyKey, parameterIndex) {
        const method: Function = (target as any)[propertyKey];

        let parameterName: Nilable<string> = (options as any)?.name;
        if (!parameterName?.trim().length) {
            parameterName = getFunctionParamNames(method)[parameterIndex];
        }

        if (!parameterName?.trim().length) {
            throw new Error(`Could not get name for parameter ${parameterIndex} of method ${method.name}`);
        }

        getListFromObject<PrepareControllerMethodAction>((target as any)[propertyKey], PREPARE_CONTROLLER_METHOD_ACTIONS).push(
            ({ method }) => {
                getListFromObject<IControllerMethodParameter>(method, CONTROLLER_METHOD_PARAMETERS).push(
                    {
                        "index": parameterIndex,
                        "name": parameterName!,
                        method,
                        "options": options
                    }
                );
            }
        );
    };
}

function createRequestHandlerWithSerializer({ handler, serializer }: ICreateRequestHandlerWithSerializerOptions): HttpRequestHandler {
    return async (request, response) => {
        await serializer(
            await handler(request, response),
            request, response
        );
    };
}

function createWrappedValidationErrorHandler(handler: Nilable<ValidationFailedHandler>): Nilable<ValidationFailedHandler> {
    if (isNil(handler)) {
        return handler;
    }

    handler = asAsync<ValidationFailedHandler>(handler);

    return async (error, request, response) => {
        await handler!(error, request, response);

        response.end();
    };
}

export function setupHttpServerControllerMethod(server: IHttpServer) {
    server.controllers = (...args: any[]) => {
        const isTypeScript = __filename.endsWith(".ts");

        const newControllersContext: IControllerContext = {
            "controllers": []
        };

        let options: Nilable<IControllersOptions>;

        if (args.length) {
            if (typeof args[0] === "string") {
                // args[0] rootDir
                // args[1] imports

                const imports: Nilable<ImportValues> = args[1];

                if (!isNil(imports)) {
                    if (typeof imports !== "object") {
                        throw new TypeError("Second argument must be of type object");
                    }
                }

                options = {
                    imports,
                    "rootDir": args[0]
                };
            }
            else if (typeof args[0] === "object") {
                // args[0] options

                options = args[0];
            }
            else {
                throw new TypeError("Argument must be of type string or object");
            }
        }

        if (!options) {
            options = {};
        }

        let swagger: Nilable<IControllersSwaggerOptions>;
        if (!isNil(options.swagger)) {
            if (options.swagger !== false) {
                if (typeof options.swagger === "object") {
                    if (!isNil(options.swagger.basePath)) {
                        if (typeof options.swagger.basePath !== "string") {
                            throw new TypeError("options.swagger.basePath must be of type string");
                        }
                    }

                    swagger = options.swagger;
                }
                else {
                    throw new TypeError("options.swagger must be of type object or must be the value false");
                }
            }
        }

        const swaggerDoc: OpenAPIV3.Document = {
            ...(swagger?.document ? swagger.document : {
                "info": {
                    "title": "OpenAPI documentation with @egomobile/http-server by e.GO Mobile",
                    "version": "0.0.1"
                }
            }),

            "openapi": "3.0.3",
            "paths": {}
        };

        let rootDir: string;
        if (isNil(options.rootDir)) {
            rootDir = path.join(process.cwd(), "controllers");
        }
        else {
            if (typeof options.rootDir !== "string") {
                throw new TypeError("options.rootDir must be of type string");
            }

            if (path.isAbsolute(options.rootDir)) {
                rootDir = options.rootDir;
            }
            else {
                rootDir = path.join(process.cwd(), options.rootDir);
            }
        }

        if (!fs.existsSync(rootDir)) {
            throw new Error(`Directory ${rootDir} does not exist`);
        }
        if (!fs.statSync(rootDir).isDirectory()) {
            throw new Error(`${rootDir} is no directory`);
        }

        const patterns: string[] = [];
        if (!isNil(options.patterns)) {
            if (Array.isArray(options.patterns)) {
                patterns.push(...options.patterns);
            }
            else {
                patterns.push(options.patterns);
            }
        }

        if (!patterns.length) {
            patterns.push(isTypeScript ? "*.+(js|ts)" : "*.js");
        }

        if (!patterns.every(p => {
            return typeof p === "string";
        })) {
            throw new TypeError("All elements of options.patterns must be of type string");
        }

        const minimatchOpts: minimatch.IOptions = {
            "dot": false,
            "matchBase": true
        };

        // collect matching files
        const controllerFiles: IControllerFile[] = [];
        walkDirSync(rootDir, (file) => {
            const relativePath = normalizeRouterPath(
                path.relative(rootDir, file)
            );

            if (!patterns.some(p => {
                return minimatch(relativePath, p, minimatchOpts);
            })) {
                return;  // does not match pattern
            }

            controllerFiles.push({
                "fullPath": file,
                relativePath
            });
        });

        if (!controllerFiles.length) {
            throw new Error(`No controller files found in ${rootDir}`);
        }

        controllerFiles.sort();

        const controllerClasses: IControllerClass[] = [];

        controllerFiles.forEach(file => {
            const controllerModule = require(file.fullPath);
            const controllerClass: Nilable<IHttpController> = controllerModule.default;

            if (!isNil(controllerClass)) {
                if (isClass<IHttpController>(controllerClass)) {
                    if ((controllerClass.prototype as any)[IS_CONTROLLER_CLASS]) {
                        // only if marked as class

                        controllerClasses.push({
                            "class": controllerClass,
                            file
                        });
                    }
                }
                else {
                    throw new TypeError(`Default export in ${file.fullPath} must be of type class`);
                }
            }
        });

        if (!controllerClasses.length) {
            throw new Error(`No controllers found in ${rootDir}`);
        }

        controllerClasses.forEach(cls => {
            const contollerOptions: IHttpControllerOptions = {
                "app": server,
                "file": cls.file.fullPath,
                "path": cls.file.relativePath
            };

            const controller = new cls["class"](contollerOptions);

            // import values
            getListFromObject<InitControllerImportAction>(controller, SETUP_IMPORTS).forEach((action) => {
                action({
                    controller,
                    "imports": options!.imports || {}
                });
            }, true);

            const classProps = getAllClassProps(cls["class"]);
            classProps.forEach(prop => {
                if (prop.trimStart().startsWith("_")) {
                    return;  // ignore all props with leading _
                }

                const propValue: unknown = (controller as any)[prop];
                if (typeof propValue === "function") {
                    if (prop === "constructor") {
                        return;  // not the constructor
                    }

                    // cleanups
                    delete (propValue as any)[CONTROLLER_METHOD_PARAMETERS];

                    const methods: IControllerMethodInfo[] = [];

                    // (pre) controller methods
                    getListFromObject<PrepareControllerMethodAction>(propValue, PREPARE_CONTROLLER_METHOD_ACTIONS).forEach(action => {
                        action({
                            controller,
                            "controllerClass": cls["class"],
                            "fullFilePath": cls.file.fullPath,
                            "method": propValue,
                            "relativeFilePath": cls.file.relativePath,
                            server,
                            "globalOptions": options
                        });
                    }, true);

                    // controller methods
                    getListFromObject<InitControllerMethodAction>(propValue, INIT_CONTROLLER_METHOD_ACTIONS).forEach(action => {
                        action({
                            controller,
                            "controllerClass": cls["class"],
                            "fullFilePath": cls.file.fullPath,
                            "method": propValue,
                            "relativeFilePath": cls.file.relativePath,
                            server,
                            "globalOptions": options,
                            "resolveInfo": (info) => {
                                methods.push(info);
                            }
                        });
                    }, true);

                    // error handlers
                    getListFromObject<InitControllerErrorHandlerAction>(propValue, SETUP_ERROR_HANDLER).forEach((action) => {
                        action({
                            controller
                        });
                    }, true);

                    // parse error handlers
                    getListFromObject<InitControllerParseErrorHandlerAction>(propValue, SETUP_PARSE_ERROR_HANDLER).forEach((action) => {
                        action({
                            controller
                        });
                    }, true);

                    // schema validator error handlers
                    getListFromObject<InitControllerValidationErrorHandlerAction>(propValue, SETUP_VALIDATION_ERROR_HANDLER).forEach((action) => {
                        action({
                            controller
                        });
                    }, true);

                    // response serializer
                    getListFromObject<InitControllerSerializerAction>(propValue, SETUP_RESPONSE_SERIALIZER).forEach((action) => {
                        action({
                            controller
                        });
                    }, true);

                    // Swagger documentation updater method / action
                    getListFromObject<InitDocumentationUpdaterAction>(propValue, SETUP_DOCUMENTATION_UPDATER).forEach(action => {
                        action({
                            controller
                        });
                    }, true);

                    // Swagger documentation
                    getListFromObject<InitControllerMethodSwaggerAction>(propValue, INIT_CONTROLLER_METHOD_SWAGGER_ACTIONS).forEach(action => {
                        action({
                            "apiDocument": swaggerDoc,
                            controller
                        });
                    }, true);

                    // tell, that controller method has been initialized
                    options!.onControllerMethodInitialized?.({
                        "app": server,
                        controller,
                        "controllerClass": cls["class"],
                        "fullPath": cls.file.fullPath,
                        "function": propValue as Func,
                        "methods": methods,
                        "name": prop,
                        "relativePath": cls.file.relativePath
                    });
                }
            });

            newControllersContext.controllers.push({
                controller,
                "controllerClass": cls
            });

            // tell, that controller has been initialized
            options!.onControllerInitialized?.({
                "app": server,
                controller,
                "controllerClass": cls["class"],
                "fullPath": cls.file.fullPath,
                "relativePath": cls.file.relativePath
            });
        });

        if (swagger) {
            setupSwaggerUIForServerControllers({
                server,
                "document": swaggerDoc,
                "options": swagger
            });

            newControllersContext.swagger = swaggerDoc;

            // tell, that Swagger documentation has been initialized
            options!.onSwaggerInitialized?.({
                "app": server,
                "documentation": swaggerDoc
            });
        }

        getListFromObject<IControllerContext>(server, CONTROLLERS_CONTEXES).push(
            newControllersContext
        );

        return server;
    };
}

function toParameterValueUpdaters(parameters: IControllerMethodParameter[]): ParameterValueUpdater[] {
    const updaters: ParameterValueUpdater[] = [];

    parameters.forEach((p) => {
        const { index, name, options } = p;
        const source = options.source?.toLowerCase().trim() ?? "";
        const transformTo: Nilable<ParameterDataTransformTo> = (options as any).transformTo;

        if (source === "body") {
            const transformer = toParameterDataTransformerSafe({ transformTo });

            updaters.push(async ({ args, request, response }) => {
                args[index] = await transformer({
                    request, response,
                    "source": request.body
                });
            });
        }
        else if (source === "header") {
            const headerName = name.toLowerCase().trim();

            const transformer = toParameterDataTransformerSafe({ transformTo });

            updaters.push(async ({ args, request, response }) => {
                args[index] = await transformer({
                    request, response,
                    "source": request.headers[headerName]
                });
            });
        }
        else if (source === "headers") {
            const headerNames: string[] = ((options as IParameterOptionsWithHeadersSource).names ?? [])
                .map((name) => {
                    return name.toLowerCase().trim();
                });

            const getNames = createObjectNameListResolver(headerNames);
            const transformer = toParameterDataTransformerSafe({ transformTo });

            updaters.push(async ({ args, request, response }) => {
                const headers: any = {};
                for (const key of getNames(request.headers)) {
                    headers[key] = await transformer({
                        key,
                        request, response,
                        "source": request.headers[key]
                    });
                }

                args[index] = headers;
            });
        }
        else if (source === "queries") {
            const queryParamNames: string[] = [
                ...((options as IParameterOptionsWithQueriesSource).names ?? [])
            ];

            const getNames = createObjectNameListResolver(queryParamNames);
            const transformer = toParameterDataTransformerSafe({ transformTo });

            updaters.push(async ({ args, request, response }) => {
                const queryParams: any = urlSearchParamsToObject(request.query);

                const query: any = {};
                for (const key of getNames(queryParams)) {
                    query[key] = await transformer({
                        key,
                        request, response,
                        "source": queryParams![key]
                    });
                }

                args[index] = query;
            });
        }
        else if (source === "query") {
            const transformer = toParameterDataTransformerSafe({ transformTo });

            updaters.push(async ({ args, request, response }) => {
                args[index] = await transformer({
                    request, response,
                    "source": request.query?.get(name)
                });
            });
        }
        else if (source === "request") {
            updaters.push(async ({ args, request }) => {
                args[index] = request;
            });
        }
        else if (source === "response") {
            updaters.push(async ({ args, response }) => {
                args[index] = response;
            });
        }
        else if (source === "urls") {
            const urlParamNames: string[] = [
                ...((options as IParameterOptionsWithUrlsSource).names ?? [])
            ];

            const getNames = createObjectNameListResolver(urlParamNames);
            const transformer = toParameterDataTransformerSafe({ transformTo });

            updaters.push(async ({ args, request, response }) => {
                const params: any = {};
                for (const key of getNames(request.params)) {
                    params[key] = await transformer({
                        key,
                        request, response,
                        "source": request.params![key]
                    });
                }

                args[index] = params;
            });
        }
        else if (["", "url"].includes(source)) {
            const transformer = toParameterDataTransformerSafe({ transformTo });

            updaters.push(async ({ args, request, response }) => {
                args[index] = await transformer({
                    request, response,
                    "source": request.params?.[name]
                });
            });
        }
        else {
            throw new TypeError(`Source of type ${source} is not supported`);
        }
    });

    return updaters;
}

function toParameterDataTransformerSafe({
    transformTo
}: IToParameterDataTransformerWithValidatorOptions): ParameterDataTransformer {
    let transformer: Nilable<ParameterDataTransformer>;

    if (isNil(transformTo)) {
        transformer = async ({ source }) => {
            return source;
        };
    }
    else {
        if (transformTo === "bool") {
            transformer = async ({ source }) => {
                return Boolean(String(source ?? "").toLowerCase().trim());
            };
        }
        else if (transformTo === "buffer") {
            transformer = async ({ source }) => {
                if (Buffer.isBuffer(source)) {
                    return source;
                }

                if (isNil(source)) {
                    return Buffer.alloc(0);
                }

                return Buffer.from(String(source ?? ""), "utf8");
            };
        }
        else if (transformTo === "int") {
            transformer = async ({ source }) => {
                return parseInt(String(source ?? "").trim());
            };
        }
        else if (transformTo === "float") {
            transformer = async ({ source }) => {
                return parseFloat(String(source ?? "").trim());
            };
        }
        else if (transformTo === "string") {
            transformer = async ({ source }) => {
                return String(source ?? "");
            };
        }
        else if (typeof transformTo === "function") {
            transformer = transformTo;
        }
    }

    if (typeof transformer !== "function") {
        throw new TypeError("transformTo must be of type function or a valid constant");
    }

    return asAsync<ParameterDataTransformer>(transformer);
}
