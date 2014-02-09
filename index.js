/****************************************************************************
 * Mandle Main Module.
 * Matt Tropiano 2014
 * For Node.js
 ****************************************************************************/

// Import Node Modules ------------------------------------------------------- 

var FS = require('fs');
var HTTP = require('http');
var URL = require('url');
var PATH = require('path');
var QS = require('querystring');
var OS = require('os');

var TMPDIR = OS.tmpDir();

// Import Internal Modules --------------------------------------------------- 

var util = require('./lib/util');
var helpers = require('./lib/helpers');
var handlers = require('./lib/handlers');
var logging = require('./lib/logging');

var SessionMap = require('./lib/sessionmap').SessionMap;
var router = require('./lib/router').router;

// Creates an HTTP server via HTTP.createServer with the main router added.
function server(handlerList, defaultRequestHandlerOptions)
{
	return HTTP.createServer(router(handlerList, defaultRequestHandlerOptions));
}

// ............................. Exports ....................................

/**
 * Creates a request handler function for routing requests.
 * Each handler is a function that takes: (ClientRequest request, ServerResponse response, Object model)
 * The model consists of:
 * {
 *		_host: the requested host
 *		_port: the requested port
 *		_path: the parsed path
 *		_params: an associative array of parameters. Key is param name. Value is string or string array.
 *		_files: an associative array of file handles. Key is param name. Value is the following:
 *		{
 *			name: filename, according to client.
 *			path: temporary path to the file uploaded.
 *			type: content MIME type, according to client.
 *			size: file size in bytes.
 *			lastModifiedDate: last modified date, according to client.
 *			hash: file's hash info, or null if not calculated.
 *		}
 *		_cookies: an associative array of cookies. cookie name -> Object. (This is also set on the request object as member "cookies").
 *		_session: the current session object, if any. if sessions are not enabled for this handler, it is null!
 * } 
 * @param routeList the list of routes to map. 
 * {
 *		methods: [ ... ] // HTTP methods default: ["GET", "POST"]
 *		path: '/blah' or /regex/
 *		handler: function(request, response, model)
 *		session: true or false (if true, tie to a session. if false, don't. default: false)
 *		form: an object detailing options for FORMIDABLE, the form parser (if installed - used if multipart content).
 *		{
 *			encoding: Request body encoding. Default 'utf8'.
 *			uploadDir: Temporary directory for file uploads. Default OS.tmpDir().
 *			keepExtensions: if true, keep file extensions on uploads. If false, don't. Default false.
 *			type: type of form ('multipart' or 'urlencoded'). Default 'multipart'.
 *			maxFieldsSize: Maximum acceptable field size. Default 2MB.
 *			maxFields:  Maximum amount of fields to parse; 0 is no limit. Default 1000.
 *			hash: If true, compute a hash for each uploaded file. If false, don't. Default false.
 *			events: An object map of event names to callbacks for monitoring Formidable form reading. Only specified events are set.
 *		}
 * }
 * @param options the options to apply to this request handler.
 * {
 * 		routerDefaults: Default attributes to apply to all routing entries before the actual handler properties.
 *		{
 *			methods: Request method bindings. Default ["GET", "POST"].
 *			session: Whether sessions are enabled or not. Default false.
 *		}
 *		sessionOptions: Options for the session manager.
 *		{
 *			timeout: The timeout in milliseconds for each created session. Default (1000 * 60 * 30), or 30 minutes.
 *	 	}
 * }
 * @returns {Function} for use as an HTTP.Server's "on incoming request" callback.
 */
exports.router = router;

/**
 * Creates an HTTP server via HTTP.createServer with the main router added.
 * @param handlerList the list of handler descriptors.
 * @param defaultRequestHandlerOptions the default options for the router.
 * @returns an HTTP server instance with the routing function (router()) attached to the "request" event.
 */
exports.server = server;

/**
 * Creates a new handler for a Jade file.
 * @param root the document root.
 * @param encoding (optional) the anticipated file encoding (if not specified, "utf8").
 * @return a handler function.
 */
exports.createJadeHandler = handlers.createJadeHandler;

/**
 * Creates a new handler for a Mustache file.
 * @param root the document root.
 * @param encoding (optional) the anticipated file encoding (if not specified, "utf8").
 * @return a handler function.
 */
exports.createMustacheHandler = handlers.createMustacheHandler;

/**
 * Creates a new handler for a Markdown file.
 * @param root the document root.
 * @param encoding (optional) the anticipated file encoding (if not specified, "utf8").
 * @return a handler function.
 */
exports.createMarkdownHandler = handlers.createMarkdownHandler;

/**
 * Creates a new file handler, essentially creating a static file server.
 * @param root the root directory for files.
 * @param indexDirectory if directory, show directory index.
 * @param encoding (optional) the anticipated file encoding of served text files (if not specified, "utf8").
 * @returns a handler function.
 */
exports.createFileHandler = handlers.createFileHandler;

/**
 * Creates a new handler that is a chain of handlers - if one of the handlers returns
 * a false-equivalent value, the chain is stopped.
 * @param handlerFunctionList the list of handlers.
 * @returns a handler function.
 */
exports.createHandlerChain = handlers.createHandlerChain;

/**
 * Handler function for telling the user that a resource could not be found.
 * Sends HTTP status 404.
 */
exports.notFoundHandler = handlers.notFoundHandler;

/**
 * Handler function for telling the user that a request type is not supported.
 * Sends HTTP status 405.
 */
exports.notSupportedHandler = handlers.notSupportedHandler;

/**
 * A special handler function for telling the user about the incoming request
 * and additional information on the model object created by the main router.
 * Sends HTTP status 200.
 */
exports.debugHandler = handlers.debugHandler;

/**
 * Sends a redirect to the client.
 * @param response the response object.
 * @param url the new url to redirect to.
 * @param isPermanent is this a permanent redirect?
 */
exports.sendRedirect = helpers.sendRedirect;

/**
 * Sends a status message as the only response content.
 * @param response the response object.
 * @param status the HTTP status code.
 * @param message (optional) the message to send with the response.
 */
exports.sendStatus = helpers.sendStatus;

/**
 * Sends the contents of a file through a response.
 * @param response the response object.
 * @param path the path to the file to send.
 * @param type (optional) the file's MIME type. Guesses it by default.
 */
exports.sendFile = helpers.sendFile;

/**
 * Sends the contents of a file through a response.
 * @param response the response object.
 * @param data the data to send.
 * @param encoding (optional) the file's encoding. Default: 'utf8'.
 * @param type (optional) the file's MIME type. Guesses it by default.
 */
exports.sendData = helpers.sendData;

/**
 * Sends the contents of a file as a (forced) download through a response.
 * @param response the response object.
 * @param data the data to send.
 * @param filename the file name to send the data as.
 * @param type (optional) the file's MIME type. Guesses it by filename by default.
 */
exports.sendAttachmentData = helpers.sendAttachmentData;

/**
 * Sends the contents of a file as a (forced) download through a response.
 * @param response the response object.
 * @param path the path to the file to send.
 * @param filename (optional) the file name to send the data as. Default is the base name of the path.
 * @param type (optional) the file's MIME type. Guesses it by filename by default.
 */
exports.sendAttachmentFile = helpers.sendAttachmentFile;

/**
 * Sends object content fully through a response as JSON (plus end).
 * @param response the response object.
 * @param status the HTTP status code.
 * @param data the object.
 */
exports.sendObject = helpers.sendObject;

/**
 * Sets a cookie on the response.
 * @param response the response object to set it on.
 * @param name the cookie name.
 * @param value the object to set.
 * @param expireTime (optional) the expiration date offset in milliseconds (written time is time from now).
 * @param secure (optional) if set, only send to server if on a secure connection.
 * @param path (optional) the domain path.
 * @param domain (optional) the cookie domain.
 */
exports.setCookie = helpers.setCookie;

/**
 * Sets a cookie to expire immediately.
 * @param response the response object to set it on.
 * @param name the cookie name.
 */
exports.expireCookie = helpers.expireCookie;

/**
 * Gets cookies on the request, and returns them as an associated array.
 * @param request the request object.
 * @returns an map of objects of the following:
 * "cookiename" -> {
 *		name: Name of the cookie.
 *		value: The value of the cookie (string).
 *		Expires: Expiration date of the cookie (string).
 *		path: The path associated with the cookie.
 *		domain: The domain associated with the cookie.
 *		secure: If defined, and true, this was associated with a secure connection.
 * }
 */
exports.getCookies = helpers.getCookies;

/**
 * Returns a date formatted as the expected format for cookie expire time.
 * @param date a date object, or a number (millisecond time) or string (date to parse using new Date()).
 * @returns a date string formatted as "EEE, dd MMM yyyy HH:mm:ss 'GMT'".
 */
exports.formatExpireDate = util.formatExpireDate;

/**
 * Formats a date string.
 * See Java's SimpleDateFormat object docs for info. 
 * Uses the "G", "y", "M", "w", "W", "D", "d", "F", "E", "a", "H", "k", "K", "h", "m", "s", "S", "z", and "Z" symbols.
 * @param date a date object, or a number (millisecond time) or string (date to parse using new Date()).
 * @param formatstring the formatting string to use.
 * @param (optional) if true, use UTC time. If false, current locale.
 * @returns a formatted date string.
 */
exports.formatDate = util.formatDate;

/**
 * Returns the MIME type of a file path.
 * @param filename the name of the file.
 * @returns an associated MIME Type or 'application/octet-stream' if unknown.
 */
exports.mimetype = helpers.mimetype;

/**
 * Sets the internal logger's logging level.
 * Default is 3.
 * @param level the following values: 
 *		0 for FATAL only.
 *		1 for ERROR and lower.
 *		2 for WARN and lower.
 *		3 for INFO and lower.
 *		4 for DEBUG and lower.
 *		Anything else is ignored (nothing changes).
 */
exports.setLoggingLevel = function(level) 
{
	if (level >= 0 && level <= 4)
		logging.options.level = level;
};

/**
 * Sets a view engine to be used by Mandle via the sendView() function.
 * This function gets called 
 */
exports.setViewResolver = function(name, hookFunction) 
{
	// TODO: Finish.
};
