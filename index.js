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

// Import Internal Modules --------------------------------------------------- 

var UTIL = require('./lib/util');
var helpers = require('./lib/helpers');
var handlers = require('./lib/handlers');
var sessions = require('./lib/sessions');
var logging = require('./lib/logging');

var FORM = UTIL.require_maybe('formidable');

if (!FORM)
	logging.info("'Formidable' module not installed. Multipart parsing unavailable.");

var HANDLER_OPTION_DEFAULTS =
{
	"session": false
};

// ............................... Router ....................................

function _handleRoute(map, request, response, model)
{
	var methodMap = map.methodMap[request.method];
	var handlerObj = null;
	
	if ('undefined' === typeof methodMap)
	{
		helpers.sendContent(response, 404, "text/plain", "404 Not Found\n" + request.method + ' ' + model._path);
		return;
	}
	
	if (methodMap.statichandlers[model._path])
		handlerObj = methodMap.statichandlers[model._path];
	else for (var i = 0; handlerObj === null && i < methodMap.patternhandlers.length; i++)
	{
		var p = methodMap.patternhandlers[i];
		if (p.pattern.test(model._path))
			handlerObj = p.handler; 
	}
	
	handlerObj = handlerObj === null ? methodMap.defaultHandler : handlerObj;
	
	if (handlerObj)
	{
		// do stuff according to options.
		if (handlerObj.handlerOptions.session)
			model._session = sessions.get(request, response);
		
		handlerObj.handlerFunction(request, response, model);
	}
	else
		helpers.sendContent(response, 405, "text/plain", "405 Not Supported\n" + request.method + ' ' + model._path);
}

/**
 * Handler map object for storing path-related handlers, in order of priority.
 */
function RouterSet(handlerArray, defaultOptions)
{
	function Handler(func, opts)
	{
		// Handler function: function(req, res, model)
		this.handlerFunction = func;
		// options object.
		this.handlerOptions = opts;
	}

	function HandlerSet()
	{
		// assoc array of 'path' -> Handler() 
		this.statichandlers = [];
		// array of {pattern: /regex/, handler:  Handler()} 
		this.patternhandlers = [];
		// -> Handler() 
		this.defaultHandler = null;
	}
	
	// Mapping of method to handlers.
	this.methodMap =
	{
		"GET": new HandlerSet(),
		"POST": new HandlerSet(),
		"HEAD": new HandlerSet(),
		"PUT": new HandlerSet(),
		"OPTIONS": new HandlerSet(),
		"DELETE": new HandlerSet(),
		"TRACE": new HandlerSet(),
		"CONNECT": new HandlerSet(),
	};
	
	// Default field values for incoming handler specs.
	var HANDLE_DEFAULTS =
	{
		"path": null,
		"methods": ["GET", "POST"],
		"handler": null,
		"options": {}
	};
	
	var processHandlerEntry = function(methodMap, entry) 
	{
		var hObj = UTIL.combine({}, HANDLE_DEFAULTS, entry);
		hObj.options = UTIL.combine({}, defaultOptions, hObj.options);
		
		var h = {};
		
		if (hObj.methods) for (var m = 0; m < hObj.methods.length; m++)
		{
			var method = hObj.methods[m].toUpperCase();
			
			if ('undefined' === typeof methodMap[method])
				throw new Error("No such HTTP method for handler: "+method);
			
			var Map = methodMap[method];
			
			if (!hObj.handler)
			{
				logging.error("Mapping: "+(!hObj.path ? "Default handler for " + method : "Handler for " + method + " " + hObj.path) + " is undefined or blank.");
			}
			// Default handler: No path defined.
			else if (!hObj.path)
			{
				Map.defaultHandler = new Handler(hObj.handler, hObj.options);
				logging.info("Mapping: Set default handler: " + hObj.methods[m]);
			}
			// Path is a regular expression.
			else if (UTIL.isRegex(hObj.path))
			{
				h.pattern = hObj.path;
				h.handler = new Handler(hObj.handler, hObj.options);
				Map.patternhandlers.push(h);
				logging.info("Mapping: Added pattern handler for " + hObj.methods[m] + ' ' + h.path.toString());
			}
			// Path is a string with wildcards.
			else if (hObj.path.indexOf('*') >= 0 || hObj.path.indexOf('?') >= 0)
			{
				h.pattern = UTIL.wildcardToRegex(hObj.path);
				h.handler = new Handler(hObj.handler, hObj.options);
				Map.patternhandlers.push(h);
				logging.info("Mapping: Added pattern handler for " + hObj.methods[m] + ' ' + hObj.path);
			}
			// Path is a string.
			else
			{
				Map.statichandlers[hObj.path] = new Handler(hObj.handler, hObj.options);
				logging.info("Mapping: Added static handler for path " + hObj.methods[m] + ' ' + hObj.path);
			}
		}
	};
	
	// if array...
	if (UTIL.isArray(handlerArray)) for (var i = 0; i < handlerArray.length; i++)
	{
		processHandlerEntry(this.methodMap, handlerArray[i]);
	}
	else
		processHandlerEntry(this.methodMap, handlerArray);
}

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
 *			path: temporary path to the file (they are deleted).
 *			type: content type.
 *		}
 *		_cookies: an associative array of cookies. cookie name -> Object. (This is also set on the request object as member "cookies").
 *		_session: the current session object, if any. if sessions are not enabled for this handler, it is null!
 * } 
 * @param handlerList the list of handlers to map. 
 * {
 *		methods: [ ... ] // HTTP methods default: ["GET", "POST"]
 *		path: '/blah' or /regex/
 *		handler: function(request, response, model)
 *		options: a set of options for this handler.
 *		{
 *			session: true or false (if true, tie to a session. if false, don't. default: false)
 *		}
 * }
 * @param defaultRequestHandlerOptions the default options to apply to each handler if none are specified.
 * @returns {Function} for use as an HTTP.Server's "on incoming request" callback.
 */
function createRequestHandler(handlerList, defaultRequestHandlerOptions)
{
	// fill options
	var defaultOptions = UTIL.combine({}, HANDLER_OPTION_DEFAULTS, defaultRequestHandlerOptions);

	// create handler map.
	var RM = new RouterSet(handlerList, defaultOptions);

	
	return function(request, response)
	{
		var urlObj = URL.parse(request.url);
		var path = urlObj.pathname;
		
		// "Merge" GET and POST content if any.
		
		var requestContent = '';
		
		request.setEncoding("utf8");
		request.addListener("data", function(chunk)
		{
			requestContent += chunk;
		});
		
		request.addListener("end", function()
		{
			var data = null;
			
			if (request.method === 'POST') switch (request.headers["content-type"])
			{
				case 'application/x-www-form-urlencoded':
					data = QS.parse(requestContent);
					break;
				case 'application/json':
					try {data = JSON.parse(requestContent);} catch (e) {}
					break;
				case 'multipart/form-data':
				case 'multipart/alternative':
				case 'multipart/byteranges':
				case 'multipart/digest':
				case 'multipart/mixed':
				case 'multipart/parallel':
				case 'multipart/related':
					// Not supported yet. :(
					break;
			}
			else
			{
				data = QS.parse(urlObj.query);
			}
			
			if (data !== null)
			{
				request.cookies = helpers.getCookies(request);
				
				var model = {};
				var split = request.headers.host.split(':');
				model._host = split[0];
				model._port = split[1];
				model._path = path;
				model._params = data;
				model._cookies = request.cookies;
				model._session = null;
				_handleRoute(RM, request, response, model);
			}
			else
				helpers.sendContent(response, 400, "text/plain", "400 Bad Input - Unsupported format or content type.");
		});
		
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
exports.sessions = sessions;
