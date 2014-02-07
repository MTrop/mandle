/****************************************************************************
 * Sessions and session creation for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var util = require('./util');
var helpers = require('./helpers');
var logging = require('./logging');

var _SESSIONID = 'MANDLESID';

function SessionMap(sessionOptions)
{
	var timeout = sessionOptions && sessionOptions.timeout ? sessionOptions.timeout : (1000 * 60 * 30);
	
	/**
	 * A session object.
	 */
	var Session = function(key)
	{
		var timeCreated = Date.now();
		var timeAccessed = timeCreated;
		var timeExpiring = timeAccessed + timeout;
		
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
			timeExpiring = timeAccessed + timeout;
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
	};
	
	// Mapping of session keys to sessions.
	var _SESSIONMAP = {};

	/**
	 * Generates a new session key.
	 * @param request the request object.
	 */
	var _newSessionKey = function()
	{
		return util.generateString(32);
	};

	/**
	 * Returns/generates a new session key.
	 * @param request the request object.
	 */
	var _sessionKey = function(request)
	{
		if (request.cookies && request.cookies[_SESSIONID] !== undefined)
			return request.cookies[_SESSIONID].value;
		else
			return _newSessionKey();
	};

	// PUBLIC MEMBERS.
	
	/**
	 * Returns either a new session or current session, depending on the
	 * content of the request and session age.
	 * @param request the request object.
	 */
	this.get = function(request, response)
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
			helpers.setCookie(response, _SESSIONID, key);
			logging.debug("Session %s created. Expires in %d milliseconds.", key, timeout);
		}
		// update timeout.
		else
		{
			out.touch();
			logging.debug("Session %s touched. Expires in %d milliseconds.", key, timeout);
		}
		
		return out;
	};

	/**
	 * Expires the session on the request and tells the response to delete the associated cookie.
	 */
	this.expire = function(request, response)
	{
		if (request.cookies[_SESSIONID])
		{
			var key = request.cookies[_SESSIONID].value;
			delete _SESSIONMAP[key];
			helpers.expireCookie(response, _SESSIONID);
			logging.debug("Session %s expired forcefully. Cookie cleared.", key);
		}
	};
	
}

//............................. Exports ....................................

exports.SessionMap = SessionMap;
