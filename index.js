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
var Router = require('./lib/router').Router;

// Import Optional External Modules ------------------------------------------ 

var FORMIDABLE = util.require_maybe('formidable');

if (!FORMIDABLE)
	logging.info("'Formidable' module not installed. Multipart parsing unavailable.");

// OPTIONS ------------------------------------------------------------------- 

/**
 * Creates a request handler function for routing requests.
 * Each handler is a function that takes: (ClientRequest request, ServerResponse response, Object model)
 * The model consists of:
 * {
 *		_host: the requested host
 *		_port: the requested port
 *		_path: the parsed path
 *		_params: an associative array of parameters.
 *		_files: an associative array of file handles.
 *		{
 *			name: filename.
 *			path: temporary path to the file uploaded.
 *			type: content type.
 *			size: file size in bytes.
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
 *   	sessionOptions: Options for the session manager.
 *		{
 *			timeout: The timeout in milliseconds for each created session. Default (1000 * 60 * 30), or 30 minutes.
 *	 	}
 * }
 * @returns {Function} for use as an HTTP.Server's "on incoming request" callback.
 */
function createRequestHandler(routeList, options)
{
	var ROUTER_DEFAULTS =
	{
		"methods": ["GET", "POST"],
		"session": false,
	};

	var SESSION_DEFAULTS =
	{
		"timeout": (1000 * 60 * 30)
	};
	
	var defaultRouteOptions = util.combine({}, ROUTER_DEFAULTS, options ? options.routerDefaults : null);
	var defaultSessionOptions = util.combine({}, SESSION_DEFAULTS, options ? options.sessionOptions : null);

	// create handler map.
	var RouterMap = new Router(routeList, defaultRouteOptions);
	// create session map.
	var sessions = new SessionMap(defaultSessionOptions);
	
	var _finishRequest = function(request, response, handlerObj, path, params, files)
	{
		request.cookies = helpers.getCookies(request);
		
		var model = {};
		var split = request.headers.host.split(':');
		model._method = request.method;
		model._host = split[0];
		model._port = split[1];
		model._path = path;
		model._params = params;
		model._files = files ? files : {};
		model._cookies = request.cookies;
		model._session = null;

		// do stuff according to options.
		if (handlerObj.session)
			model._session = sessions.get(request, response);
		
		handlerObj.handler(request, response, model);
	};

	var _readPOSTContent = function(request, callback)
	{
		var content = '';
		
		request.setEncoding("utf8");
		request.addListener("data", function(chunk)
		{
			content += chunk;
		});
		
		request.addListener("end", function()
		{
			callback(content);
		});

	};

	return function(request, response)
	{
		var urlObj = URL.parse(request.url);
		var path = urlObj.pathname;
		
		var handlerObj = RouterMap.getRouteForPath(request.method, path);

		if (!handlerObj)
		{
			helpers.sendContent(response, 405, "text/plain", "405 Method Not Allowed\nNo handler for " + request.method + ' ' + model._path);
			return;
		}

		// If POST, read request body like a buffer.
		if (request.method === 'POST')
		{
			var ctype = request.headers["content-type"];
			ctype = ctype.indexOf(';') >= 0 ? ctype.substring(0, ctype.indexOf(';')) : ctype;

			switch (ctype)
			{
				case 'application/x-www-form-urlencoded':
					_readPOSTContent(function(data)
					{
						try {
							_finishRequest(request, response, handlerObj, path, QS.parse(data));
						} catch (e) {
							helpers.sendContent(response, 400, "text/plain", "400 Bad Input\nContent was not encoded properly for 'x-www-form-urlencoded'.");
						}
					});
					break;
				case 'application/json':
					_readPOSTContent(function(data)
					{
						try {
							_finishRequest(request, response, handlerObj, path, JSON.parse(data));
						} catch (e) {
							helpers.sendContent(response, 400, "text/plain", "400 Bad Input\nContent was not encoded properly for 'application/json'.");
						}
					});
					break;
				case 'multipart/form-data':
				case 'multipart/alternative':
				case 'multipart/byteranges':
				case 'multipart/digest':
				case 'multipart/mixed':
				case 'multipart/parallel':
				case 'multipart/related':
					if (FORMIDABLE)
					{
						var form = new FORMIDABLE.IncomingForm();
						if (handlerObj.form)
						{
							util.combine(form, handlerObj.form);
							if (handlerObj.form.events)
								util.mapEventsTo(form, handlerObj.form.events);
						}
						
						form.parse(request, function(err, fields, files)
						{
							if (err)
							{
								helpers.sendContent(response, 400, "text/plain", "400 Bad Input\n"+err);
								return;
							}
							
							_finishRequest(request, response, handlerObj, path, fields, files);
						});
					}
					else
						helpers.sendContent(response, 400, "text/plain", "400 Bad Request\nServer lacks the extension to process this request.");
					break;
				default:
					helpers.sendContent(response, 400, "text/plain", "400 Bad Request\nUnsupported content type.");
					break;
			}
		}
		else
		{
			_finishRequest(request, response, handlerObj, path, QS.parse(urlObj.query));
		}
		
	};
}

/**
 * Creates an HTTP server via HTTP.createServer with the main router added.
 * @param handlerList the list of handler descriptors.
 * @param defaultRequestHandlerOptions the default options for the router.
 */
function server(handlerList, defaultRequestHandlerOptions)
{
	return HTTP.createServer(createRequestHandler(handlerList, defaultRequestHandlerOptions));
}

// ............................. Exports ....................................

exports.createRequestHandler = createRequestHandler;
exports.server = server;

exports.handlers = handlers;
exports.helpers = helpers;

exports.utils = util;

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
