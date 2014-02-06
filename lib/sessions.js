/****************************************************************************
 * Sessions and session creation for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var UTIL = require('./util');
var Helpers = require('./helpers');
var logging = require('./logging');

// Mapping of session keys to sessions.
var _SESSIONMAP = {};
var _SESSIONID = 'MDSESSIONID';

/**
 * Session options.
 * timeout: Session timeout in milliseconds. Updated on the session 
 *		whenever it is touched and not expired.
 */
var options = 
{
	// Session timeout in milliseconds.
	"timeout": (1000 * 60 * 30)
}; 

/**
 * Generates a new session key.
 * @param request the request object.
 */
function _newSessionKey()
{
	return UTIL.generateString(32);
}

/**
 * Returns/generates a new session key.
 * @param request the request object.
 */
function _sessionKey(request)
{
	if (request.cookies && request.cookies[_SESSIONID] !== undefined)
		return request.cookies[_SESSIONID].value;
	else
		return _newSessionKey();
}

/**************************************************
 * Session object.
 *************************************************/
function Session(key)
{
	var timeCreated = Date.now();
	var timeAccessed = timeCreated;
	var timeExpiring = timeAccessed + options.timeout;
	
	this.getId = function() 
	{
		return key;
	};

	this.getTimeCreated = function() 
	{
		return timeCreated;
	};

	this.getTimeAccessed = function() 
	{
		return timeAccessed;
	};

	this.getTimeExpiring = function() 
	{
		return timeExpiring;
	};

	this.touch = function() 
	{
		timeAccessed = Date.now();
		timeExpiring = timeAccessed + options.timeout;
	};
	
	this.expire = function() 
	{
		timeAccessed = Date.now();
		timeExpiring = Date.now() - 1;
		delete _SESSIONMAP[key];
		logging.debug("Session %s expired forcefully.", key);
	};
	
	this.isExpired = function() 
	{
		return Date.now() >= timeExpiring;
	};
}

/**
 * Returns either a new session or current session, depending on the
 * content of the request and session age.
 * @param request the request object.
 */
function get(request, response)
{
	var key = _sessionKey(request);
	var out = _SESSIONMAP[key];
	
	// Set session.
	if (!out || out.isExpired())
	{
		if (out && out.isExpired())
		{
			delete _SESSIONMAP[key];
			logging.debug("Session %s expired naturally.", key);
		}
		key = _newSessionKey();
		out = (_SESSIONMAP[key] = new Session(key));
		Helpers.setCookie(response, _SESSIONID, key);
		logging.debug("Session %s created. Expires in %d milliseconds.", key, options.timeout);
	}
	// update timeout.
	else
	{
		out.touch();
		logging.debug("Session %s touched. Expires in %d milliseconds.", key, options.timeout);
	}
	
	return out;
}

/**
 * Expires the session on the request and tells the response to delete the associated cookie.
 */
function expire(request, response)
{
	if (request.cookies[_SESSIONID])
	{
		var key = request.cookies[_SESSIONID].value;
		delete _SESSIONMAP[key];
		Helpers.expireCookie(response, _SESSIONID);
		logging.debug("Session %s expired forcefully. Cookie cleared.", key);
	}
}

//............................. Exports ....................................

exports.get = get;
exports.expire = expire;
exports.options = options;
