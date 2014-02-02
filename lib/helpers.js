/****************************************************************************
 * Some helpful methods and functions for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var UTIL = require('./util');

var QS = require('querystring');

/**
 * Sends data content fully through a response (plus end).
 * @param response the response object.
 * @param status the HTTP status code.
 * @param type the mime type.
 * @param content the full content.
 */
function sendContent(response, status, type, content)
{
	response.setHeader("Content-Type", type);
	response.writeHead(status);
	if ('undefined' !== typeof content)
		response.write(content);
	response.end();
}

/**
 * Sends object content fully through a response as JSON (plus end).
 * @param response the response object.
 * @param status the HTTP status code.
 * @param data the object.
 */
function sendObject(response, status, data)
{
	response.setHeader("Content-Type", "application/json");
	response.writeHead(status);
	if ('undefined' !== typeof data)
		response.write(JSON.stringify(data));
	response.end();
}

/**
 * Send just the content header. 
 * @param response the response object.
 * @param status the HTTP status code.
 * @param type the mime type.
 */
function sendContentHeader(response, status, type)
{
	if (type)
		response.setHeader("Content-Type", type);
	response.writeHead(status);
}

/**
 * 
 * @param response the response object.
 * @param status the HTTP status code.
 * @param type the mime type.
 * @param content the content fragment.
 */
function sendContentFragment(response, content)
{
	response.write(content);
}

/**
 * Ends the response. 
 * @param response the response object.
 */
function sendEnd(response)
{
	response.end();
}

/**
 * Sends a redirect.
 * @param response the response object.
 * @param url the new url to redirect to.
 * @param isPermanent is this a temporary redirect?
 */
function sendRedirect(response, url, isPermanent)
{
	response.setHeader("Location", url);
	response.writeHead(isPermanent ? 301 : 307);
	response.end();
}

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
function setCookie(response, name, value, expireTime, secure, path, domain)
{
	var out = {};
	out[name] = value;
	if ('undefined' !== typeof expireTime)
		out.Expires = UTIL.formatExpireDate(new Date(Date.now() + expireTime));
	if (path) out.path = path;
	if (domain) out.domain = domain;
	
	var cookiestring = QS.stringify(out) + (secure ? ';secure':'');
	response.setHeader("Set-Cookie", cookiestring);
}

/**
 * Sets a cookie to expire immediately.
 * @param response the response object to set it on.
 * @param name the cookie name.
 */
function expireCookie(response, name)
{
	var out = {};
	out[name] = name;
	out.Expires = UTIL.formatExpireDate(new Date());
	var cookiestring = QS.stringify(out);
	response.setHeader("Set-Cookie", cookiestring);
}

/**
 * Gets cookies on the request.
 * @param request the request object.
 */
function getCookies(request)
{
	var cookies = request.headers.cookie;

	var cookieattribs = ['path','domain','Expires','secure'];
	
	var out = {};
	
	if (cookies) cookies.split(';').forEach(function(element, index)
	{
		var cookie = {};
		var attr = QS.parse(element.trim());
		
		for (var x in attr)
			if (attr.hasOwnProperty(x))
			{
				if (cookieattribs.indexOf(x) < 0)
				{
					cookie.name = x;
					cookie.value = attr[x];
				}
				else
					cookie[x] = attr[x];
			}
		
		out[cookie.name] = cookie;
	});
	
	return out;
}

//............................. Exports ....................................

exports.sendRedirect = sendRedirect;
exports.sendContent = sendContent;
exports.sendObject = sendObject;
exports.sendContentHeader = sendContentHeader;
exports.sendContentFragment = sendContentFragment;
exports.sendEnd = sendEnd;
exports.setCookie = setCookie;
exports.expireCookie = expireCookie;
exports.getCookies = getCookies;
