/****************************************************************************
 * Some helpful methods and functions for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var UTIL = require('./util');

var HTTP = require('http');
var QS = require('querystring');

// Sends data content fully through a response (plus end).
function sendContent(response, status, type, content)
{
	response.setHeader("Content-Type", type);
	response.writeHead(status);
	if ('undefined' !== typeof content)
		response.write(content);
	response.end();
}

// Sends a status message.
function sendStatus(response, status, message)
{
	sendContent(response, status, "text/plain", status + ' ' + HTTP.STATUS_CODES[status] + '\n' + (message ? message : ''));
}

// Sends object content fully through a response as JSON (plus end).
function sendObject(response, status, data)
{
	response.setHeader("Content-Type", "application/json");
	response.writeHead(status);
	if ('undefined' !== typeof data)
		response.write(JSON.stringify(data));
	response.end();
}

// Sends just the content header. 
function sendContentHeader(response, status, type)
{
	if (type)
		response.setHeader("Content-Type", type);
	response.writeHead(status);
}

// Sends content through the response (after the head is sent, but before the end).
function sendContentFragment(response, content)
{
	response.write(content);
}

// Ends the response. 
function sendEnd(response)
{
	response.end();
}

// Sends a redirect to the client.
function sendRedirect(response, url, isPermanent)
{
	response.setHeader("Location", url);
	response.writeHead(isPermanent ? 301 : 307);
	response.end();
}

// Sets a cookie on the response.
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

// Sets a cookie to expire immediately.
function expireCookie(response, name)
{
	var out = {};
	out[name] = name;
	out.Expires = UTIL.formatExpireDate(new Date());
	var cookiestring = QS.stringify(out);
	response.setHeader("Set-Cookie", cookiestring);
}

// Gets cookies on the request, and returns them as an associated array.
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
				else if (x === 'secure')
				{
					cookie[x] = true;
				}
				else
					cookie[x] = attr[x];
			}
		
		out[cookie.name] = cookie;
	});
	
	return out;
}

//............................. Exports ....................................

exports.sendContent = sendContent;
exports.sendStatus = sendStatus;
exports.sendObject = sendObject;
exports.sendContentHeader = sendContentHeader;
exports.sendContentFragment = sendContentFragment;
exports.sendRedirect = sendRedirect;
exports.sendEnd = sendEnd;
exports.setCookie = setCookie;
exports.expireCookie = expireCookie;
exports.getCookies = getCookies;
