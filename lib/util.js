/****************************************************************************
 * Utility functions for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var DF = require('./util/dateformat');

/** 
 * "Requires" a module - if not loaded, return null.
 * @param mod the module name, as though called using "require()".
 */
function require_maybe(mod)
{
	var out = null;
	try { out = require(mod); } catch (e) {}
	return out;
}

/** 
 * Generates a string of random alphanumeric characters.
 * @param len the length of the string to generate.
 */
function generateString(len)
{
	var ALPH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	var out = '';
	for (var i = 0; i < len; i++)
		out += ALPH[Math.floor(Math.random() * ALPH.length)];
	return out;
}

/**
 * Returns true if the provided reference is a RegExp object.
 * @returns true if so, false if not.
 */
function isRegex(obj)
{
	return Object.prototype.toString.call(obj) === '[object RegExp]';
}

/**
 * Returns true if the provided reference is an array.
 * @returns true if so, false if not.
 */
function isArray(obj)
{
	return Object.prototype.toString.call(obj) === '[object Array]';
}

/**
 * Returns true if the provided reference is an associative array/object.
 * @returns true if so, false if not.
 */
function isObject(obj)
{
	return Object.prototype.toString.call(obj) === '[object Object]';
}

/** 
 * Combines a series of object's properties into the
 * first object, then returns the first object.
 */ 
function combine()
{
	if (arguments.length < 1)
		return null;
	
	var obj = null;

	for (var i = 0; i < arguments.length; i++)
	{
		if ('undefined' === typeof arguments[i])
			continue;
		if (null === arguments[i])
			continue;
		
		if ('object' !== typeof arguments[i])
			throw new TypeError('Argument '+i+' is not an object.');

		if (i !== 0)
		{
			for (var x in arguments[i])
				if (arguments[i].hasOwnProperty(x))
					obj[x] = arguments[i][x];
		}
		else
		{
			obj = arguments[0];
		}
	}
	
	return arguments[0];
}

/**
 * Maps a map of event names and callbacks to an Eventable object.
 * @param object the object to apply to.
 * @param eventMap the map of {event name -> callback}.
 */
function mapEventsTo(object, eventMap)
{
	for (e in eventMap)
	if (eventMap.hasOwnProperty(e))
		object.on(e, eventMap[e]);
}

/**
 * http://kevin.vanzonneveld.net
 *   original by: booeyOH
 *   improved by: Ates Goral (http://magnetiq.com)
 *   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
 *   bugfixed by: Onno Marsman
 *   improved by: Brett Zamir (http://brett-zamir.me)
 *     example 1: preg_quote("$40");
 *     returns 1: '\$40'
 *     example 2: preg_quote("*RRRING* Hello?");
 *     returns 2: '\*RRRING\* Hello\?'
 *     example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
 *     returns 3: '\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:'
 */
function _preg_quote(str, delimiter)
{
    return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
}

// Converts a wildcard expression to a RegExp.
function wildcardToRegex(str)
{
    return new RegExp(_preg_quote(str).replace(/\\\*/g, '.*').replace(/\\\?/g, '.'), '');
}

// If the string has a slash at the end, do nothing.
// If it doesn't, add one.
function addSlash(path)
{
	return path[path.length-1] === '/' ? path : path + '/';
}

// If the string has a slash at the end, remove it.
// If it doesn't, do nothing.
function removeSlash(path)
{
	return path[path.length-1] === '/' ? path.substring(0, path.length - 1) : path;
}

// Returns a date formatted as the expected format for cookie expire time.
function formatExpireDate(date)
{
	return DF.formatDate(date, "EEE, dd MMM yyyy HH:mm:ss 'GMT'", true);
}

// ............................. Exports ....................................

exports.require_maybe = require_maybe;
exports.generateString = generateString;
exports.isRegex = isRegex;
exports.isArray = isArray;
exports.combine = combine;
exports.mapEventsTo = mapEventsTo;
exports.wildcardToRegex = wildcardToRegex;
exports.addSlash = addSlash;
exports.removeSlash = removeSlash;
exports.formatExpireDate = formatExpireDate;
exports.formatDate = DF.formatDate;
