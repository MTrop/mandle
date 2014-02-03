/****************************************************************************
 * Utility functions for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var DF = require('./dateformat');

// "Requires" a module - if not loaded, return null.
function require_maybe(mod)
{
	var out = null;
	try { out = require(mod); } catch (e) {}
	return out;
}

// Generates a string of random alphanumeric characters.
function generateString(len)
{
	var ALPH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	var out = '';
	for (var i = 0; i < len; i++)
		out += ALPH[Math.floor(Math.random() * ALPH.length)];
	return out;
}

// Is this object a RegExp?
function isRegex(obj)
{
	return Object.prototype.toString.call(obj) === '[object RegExp]';
}

//Is this object an array?
function isArray(obj)
{
	return Object.prototype.toString.call(obj) === '[object Array]';
}

// Combines an object's properties into the 
// first object, then returns the first object.
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
exports.wildcardToRegex = wildcardToRegex;
exports.addSlash = addSlash;
exports.removeSlash = removeSlash;
exports.formatExpireDate = formatExpireDate;
exports.formatDate = DF.formatDate;
