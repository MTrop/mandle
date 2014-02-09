/****************************************************************************
 * Router type for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var util = require('./util');
var logging = require('./logging');

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

// ............................. Exports .....................................

exports.RouterUnit = RouterUnit;
