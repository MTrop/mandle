/****************************************************************************
 * Router type for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var util = require('./util');
var logging = require('./logging');
var url = require('url');
var qs = require('querystring');
var helpers = require('./helpers');

var SessionMap = require('./router/sessionmap').SessionMap;

/**
 * Router constructor for storing path-related handlers, in order of priority.
 * @constructor
 * @this {RouterUnit}
 * @param routeList the array of simple handler objects.
 * @param defaultOptions (optional) the default options to apply to each handler, if unspecified.
 */
function RouterUnit(routeList, defaultOptions)
{
	// PRIVATE MEMBERS

	/** 
	 * A set of mapping objects for an HTTP method.
	 * @this {HandlerSet}
	 * @constructor
	 * @private
	 */
	var HandlerSet = function()
	{
		// assoc array of 'path' -> Handler() 
		this.statichandlers = [];
		// array of {pattern: /regex/, handler:  Handler()} 
		this.patternhandlers = [];
		// -> Handler() 
		this.defaultHandler = null;
	};

	/* Mapping of method to handlers. */
	var methodMap =
	{
		"GET": new HandlerSet()
		,"POST": new HandlerSet()
		,"HEAD": new HandlerSet()
		,"PUT": new HandlerSet()
		,"OPTIONS": new HandlerSet()
		,"DELETE": new HandlerSet()
		//,"TRACE": new HandlerSet(),
		//,"CONNECT": new HandlerSet(),
	};

	var processHandlerEntry = function(entry) 
	{
		var h = {};
		
		for (var m = 0; m < entry.methods.length; m++)
		{
			var method = entry.methods[m].toUpperCase();
			
			if ('undefined' === typeof methodMap[method])
				logging.error("Mapping: No such HTTP method " + method + " for " + (!entry.path ? "default handler." : entry.path +  " handler."));
			
			var Map = methodMap[method];
			
			if (!entry.handler)
			{
				logging.error("Mapping: "+(!entry.path ? "Default handler for " + method : "Handler for " + method + " " + entry.path) + " is undefined or blank.");
			}
			// Default handler: No path defined.
			else if (!entry.path)
			{
				Map.defaultHandler = entry;
				logging.info("Mapping: Set default handler: " + entry.methods[m]);
			}
			// Path is a regular expression.
			else if (util.isRegex(entry.path))
			{
				h.pattern = entry.path;
				h.handler = entry;
				Map.patternhandlers.push(h);
				logging.info("Mapping: Added pattern handler for " + entry.methods[m] + ' ' + h.path.toString());
			}
			// Path is a string with wildcards.
			else if (entry.path.indexOf('*') >= 0 || entry.path.indexOf('?') >= 0)
			{
				h.pattern = util.wildcardToRegex(entry.path);
				h.handler = entry;
				Map.patternhandlers.push(h);
				logging.info("Mapping: Added pattern handler for " + entry.methods[m] + ' ' + entry.path);
			}
			// Path is a string.
			else
			{
				Map.statichandlers[entry.path] = entry;
				logging.info("Mapping: Added static handler for path " + entry.methods[m] + ' ' + entry.path);
			}
		}
	};
	
	// if array...
	if (util.isArray(routeList)) for (var i = 0; i < routeList.length; i++)
	{
		processHandlerEntry(util.combine({}, defaultOptions, routeList[i]));
	}
	else
		processHandlerEntry(util.combine({}, defaultOptions, routeList));
	
	// PUBLIC FUNCTIONS.
	
	/**
	 * Returns the handler object associated with in input path,
	 * or null if no matching handler.
	 */
	this.getRouteForPath = function(method, path)
	{
		var map = methodMap[method];
		var handlerObj = null;
		
		if ('undefined' === typeof map)
			return null;
		
		if (map.statichandlers[path])
			handlerObj = map.statichandlers[path];
		else for (var i = 0; handlerObj === null && i < map.patternhandlers.length; i++)
		{
			var p = map.patternhandlers[i];
			if (p.pattern.test(path))
				handlerObj = p.handler; 
		}
		
		if (!handlerObj)
			handlerObj = map.defaultHandler;
		
		return handlerObj;
	};
	
}

//Import Optional External Modules ------------------------------------------ 

/* Formidable by felixge. */
var FORMIDABLE = util.require_maybe('formidable');

if (!FORMIDABLE)
	logging.info("'Formidable' module not installed. Multipart parsing unavailable.");

// OPTIONS ------------------------------------------------------------------- 

// Creates a request handler function for routing requests.
function router(routeList, options)
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
	var RouterMap = new RouterUnit(routeList, defaultRouteOptions);
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
		var urlObj = url.parse(request.url);
		var path = urlObj.pathname;
		
		var handlerObj = RouterMap.getRouteForPath(request.method, path);

		if (!handlerObj)
		{
			helpers.sendStatus(response, 405, "No handler for " + request.method + ' ' + model._path);
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
							_finishRequest(request, response, handlerObj, path, qs.parse(data));
						} catch (e) {
							helpers.sendStatus(response, 400, "Content was not encoded properly for 'x-www-form-urlencoded'.");
						}
					});
					break;
				case 'application/json':
					_readPOSTContent(function(data)
					{
						try {
							_finishRequest(request, response, handlerObj, path, JSON.parse(data));
						} catch (e) {
							helpers.sendStatus(response, 400, "Content was not encoded properly for 'application/json'.");
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
								helpers.sendStatus(response, 400, err);
								return;
							}
							
							_finishRequest(request, response, handlerObj, path, fields, files);
						});
					}
					else
						helpers.sendStatus(response, 400, "Server lacks the extension to process this request.");
					break;
				default:
					helpers.sendStatus(response, 400, "Unsupported content type.");
					break;
			}
		}
		else
		{
			_finishRequest(request, response, handlerObj, path, qs.parse(urlObj.query));
		}
		
	};
}

// ............................. Exports .....................................

exports.router = router;
