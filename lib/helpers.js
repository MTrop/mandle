/****************************************************************************
 * Some helpful methods and functions for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var fs = require('fs');
var http = require('http');
var url = require('url');
var qs = require('querystring');
var pathutil = require('path'); 

var util = require('./util');
var views = require('./views');
var logging = require('./logging');

/* MIME by broofa and bentomas */
var MIME = util.require_maybe('mime');

var MIMEExt = require('./util/mimetypes');

if (!MIME)
	logging.info("'Mime' module NOT installed. Using internal type tester.");

// Mimetypes.
function mimetype(path)
{
	var ext = pathutil.extname(path).substring(1);
	if (!MIME)
		return MIMEExt.Types[ext] ? MIMEExt.Types[ext] : 'application/octet-stream';
	else
	{
		return MIME.lookup(ext);
	}
}

function _content(response, status, type, content)
{
	response.setHeader("Content-Type", type);
	response.writeHead(status);
	if ('undefined' !== typeof content)
		response.write(content);
	response.end();
}

function _attach(response, status, data, filename, type)
{
	response.setHeader("Content-Type", type);
	response.setHeader("Content-Disposition", 'attachment; filename=\"' + filename + '"');
	response.writeHead(status);
	if ('undefined' !== typeof data)
		response.write(data);
	response.end();
}


// Sets a cookie on the response.
function setCookie(response, name, value, expireTime, secure, path, domain)
{
	var out = {};
	out[name] = value;
	if ('undefined' !== typeof expireTime)
		out.Expires = util.formatExpireDate(new Date(Date.now() + expireTime));
	if (path) out.path = path;
	if (domain) out.domain = domain;
	
	var cookiestring = qs.stringify(out) + (secure ? ';secure':'');
	response.setHeader("Set-Cookie", cookiestring);
}

// Sets a cookie to expire immediately.
function expireCookie(response, name)
{
	var out = {};
	out[name] = name;
	out.Expires = util.formatExpireDate(new Date());
	var cookiestring = qs.stringify(out);
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
		var attr = qs.parse(element.trim());
		
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

// Sends a redirect to the client.
function sendRedirect(response, url, isPermanent)
{
	response.setHeader("Location", url);
	response.writeHead(isPermanent ? 301 : 307);
	response.end();
}

// Sends a status message.
function sendStatus(response, status, message)
{
	_content(response, status, "text/plain", status + ' ' + http.STATUS_CODES[status] + '\n' + (message ? message : ''));
}

// Attempts to send data.
function sendData(response, data, type)
{
	if (!type)
		type = 'application/octet-stream';

	_content(response, 200, type, data);
}

// Attempts to send file content.
function sendFile(response, path, encoding, type)
{
	if (!type)
		type = util.mimetype(path);
	
	fs.readFile(path, (encoding ? encoding : 'utf8'), function(err, data)
	{
		if (err)
		{
			sendStatus(response, 500, err);
			logging.error(err);
		}
		else
			_content(response, 200, type, data);
	});
}

// Sends data content as a download.
function sendAttachmentData(response, data, filename, type)
{
	if (!filename)
		throw new Error("Filename is required.");
	
	if (!type)
		type = 'application/octet-stream';

	_attach(response, 200, data, filename, type);
}

// Sends file data content as a download.
function sendAttachmentFile(response, path, filename)
{
	if (!path)
		throw new Error("Path is required.");

	if (!filename)
		filename = pathutil.basename(path);
	
	fs.readFile(path, (encoding ? encoding : 'utf8'), function(err, data)
	{
		if (err)
		{
			sendStatus(response, 500, err);
			logging.error(err);
		}
		else
			_attach(response, 200, data, filename, util.mimetype(filename));
	});
}

// Sends object content fully through a response as JSON (plus end).
function sendObject(response, data)
{
	_content(response, 200, "application/json", JSON.stringify(data));
}

// Sends the result of a view.
function sendView(response, path, model, engineName)
{
	var ext = pathutil.extname(path).substring(1);
	var modelProcessor = null;
	
	if (engineName)
		modelProcessor = views.get(engineName);
	else if (ext)
		modelProcessor = views.getExtension(ext);
	
	if (!modelProcessor)
		sendStatus(response, 500, "No engine for view file.");
	else
		modelProcessor(response, path, model);
}

// Sends an authentication basic response.
function sendAuthenticateBasic(response, realmName)
{
	response.setHeader("Content-Type", 'text/plain');
	response.setHeader("WWW-Authenticate", 'Basic realm="' + realmName + '"');
	response.writeHead(401); // "Not Authorized"
	response.end();
}

// Checks the authorization on the request.
// Only checks Basic at the moment.
function checkAuthorization(request, authFunction)
{
	if (!request.headers.authorization)
		return false;

	var urlObj = url.parse(request.url);
	var path = urlObj.pathname;

	var splitstring = request.headers.authorization.split(" ");
	
	var authtype = splitstring[0];
	var authcontent = splitstring[1];
	
	switch (authtype)
	{
		case 'Basic':
			var a = util.fromBase64(authcontent).split(":");
			if (a.length < 2)
				return false;
			return authFunction(path, null, a[0], a[1]);
		default:
			return false;
	}
}

//............................. Exports ....................................

exports.setCookie = setCookie;
exports.expireCookie = expireCookie;
exports.getCookies = getCookies;
exports.sendRedirect = sendRedirect;
exports.sendStatus = sendStatus;
exports.sendFile = sendFile;
exports.sendData = sendData;
exports.sendAttachmentData = sendAttachmentData;
exports.sendAttachmentFile = sendAttachmentFile;
exports.sendObject = sendObject;
exports.sendView = sendView;
exports.sendAuthenticateBasic = sendAuthenticateBasic;
exports.checkAuthorization = checkAuthorization;
exports.mimetype = mimetype;
