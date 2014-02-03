/****************************************************************************
 * Handers and handler creation utilities for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var FS = require('fs');
var PATH = require('path');

var UTIL = require('./util');
var HELPERS = require('./helpers');
var MIMEExt = require('./mimetypes');
var logging = require('./logging');

/* MIME by broofa and bentomas */
var MIME = UTIL.require_maybe('mime');
/* JADE by tjholowaychuk and forbeslindesay */
var JADE = UTIL.require_maybe('jade');
/* MUSTACHE by nathan and mjackson */
var MUSTACHE = UTIL.require_maybe('mustache');
/* MARKDOWN by ashb and dom */
var MARKDOWN = UTIL.require_maybe('markdown');


function _mimetype(path)
{
	var ext = PATH.extname(path).substring(1);
	if (!MIME)
		return MIMEExt.Types[ext] ? MIMEExt.Types[ext] : 'application/octet-stream';
	else
	{
		return MIME.lookup(ext);
	}
}

function _fileDumpDirectoryHTML(path, dirs, files, info)
{
	var i, content = '';
	content += '<!DOCTYPE html><html><head><style>*{font-family: monospace; text-align: left;}</style></head><body>';
	content += '<table border="0">';
	content += '<thead>';
	
	content += '<tr>';
	content += '<th>Name</th>';
	content += '<th>Size</th>';
	content += '<th>Date</th>';
	content += '<th>MIME</th>';
	content += '</tr>';
	
	content += '</thead><tbody>';

	var _DIRHTM = function(name, fileinfo)
	{
		content += '<tr>';
		content += '<td><a href="' + fileinfo.href + '/">' + name + '</a></td>';
		content += '<td>' + fileinfo.size + '</td>';
		content += '<td>' + fileinfo.modified.toString() + '</td>';
		content += '<td>&nbsp;</td>';
		content += '</tr>';
	};

	var _FILHTM = function(name, fileinfo)
	{
		content += '<tr>';
		content += '<td><a href="' + fileinfo.href + '">' + name + '</a></td>';
		content += '<td>' + fileinfo.size + '</td>';
		content += '<td>' + fileinfo.modified.toString() + '</td>';
		content += '<td>' + _mimetype(name) + '</td>';
		content += '</tr>';
	};
	
	if (path !== '/') _DIRHTM('..', {"href": '/..', "size": '', "modified": ''});
	for (i = 0; i < dirs.length; i++) _DIRHTM(dirs[i], info[dirs[i]]);
	for (i = 0; i < files.length; i++) _FILHTM(files[i], info[files[i]]);
	
	content += '</tbody></table></body></html>';
	
	return content;
}

/**
 * Creates a new file handler.
 * @param root the root directory for files.
 * @param indexDirectory if directory, show directory index.
 * @returns {Function}
 */
function createFileHandler(root, indexDirectory, encoding)
{
	if (!root || 'string' !== typeof root)
		throw new Error('Must declare a root directory for the document root.');

	root = UTIL.removeSlash(root);
	if (!encoding) encoding = 'utf8';
	
	return function(request, response, model)
	{
		if (!FS.existsSync(root + model._path))
		{
			HELPERS.sendContent(response, 404, "text/plain", "404 Not Found\n" + model._path);
			return;
		}
		
		var filepath = root + model._path;
		
		FS.stat(filepath, function(err, stats) 
		{
			if (err)
			{
				HELPERS.sendContent(response, 500, "text/plain", "500 Server Error\n");
				logging.error(err);
			}
			else if (stats.isDirectory())
			{
				if (!indexDirectory)
					HELPERS.sendContent(response, 404, "text/plain", "404 Not Found\n" + model._path);
				else if (model._path[model._path.length - 1] !== '/')
				{
					HELPERS.sendRedirect(response, model._path + '/');
				}
				else FS.readdir(filepath, function(err, files)
				{
					if (err)
					{
						HELPERS.sendContent(response, 500, "text/plain", "500 Server Error\n");
						logging.error(err);
					}
					else
					{
						var dir_list = [];
						var file_list = [];
						var file_info = {};
						
						var _addFileStats = function (name, stats, dir)
						{
							file_info[name] = {
								"href": (dir ? "/" : "") + name,
								"modified" : stats.mtime,
								"size" : stats.size
							};
						};
						
						for (var i = 0; i < files.length; i++)
						{
							var fn = files[i];
							var fsstats = FS.statSync(filepath+"/" + fn);
							if (fsstats.isDirectory())
							{
								dir_list.push(fn);
								_addFileStats(fn, fsstats, true);
							}
							else if (fsstats.isFile())
							{
								file_list.push(fn);
								_addFileStats(fn, fsstats, false);
							}
						}
						
						dir_list.sort();
						file_list.sort();
						
						HELPERS.sendContent(response, 200, 'text/html', _fileDumpDirectoryHTML(model._path, dir_list, file_list, file_info));
					}
				});
			}
			else FS.readFile(root + model._path, encoding, function(err, data)
			{
				if (err)
				{
					HELPERS.sendContent(response, 500, "text/plain", "500 Server Error\n");
					logging.error(err);
				}
				else
					HELPERS.sendContent(response, 200, _mimetype[model._path], data);
			});
		});
		
	};
	
}

/**
 * Creates a new file upload handler.
 * @param tempdir the temporary directory for files.
 * @returns {Function}
 */
function createFileUploadHandler(tempdir)
{
	// TODO: Finish.
}

/**
 * Creates a new handler that is a chain of handlers - if one of the handlers returns
 * a false-equivalent value, the chain is stopped.
 * @param handlerFunctionList the list of handlers.
 * @returns a handler function.
 */
function createHandlerChain(handlerFunctionList)
{
	return function(request, response, model)
	{
		for (var i = 0; i < handlerFunctionList.length; i++)
			if (!handlerFunctionList[i](request, response, model))
				return;
	};
}


/****************************************************************************
 * Pre-built handler functions.
 ****************************************************************************/

/**
 * Handler function for telling the user that a resource could not be found.
 * Sends HTTP status 404.
 */
function NotFoundHandler(request, response, model)
{
	HELPERS.sendContent(response, 404, "text/plain", "404 Not Found\n" + request.method + ' ' + model._path);
}

/**
 * Handler function for telling the user that a request type is not supported.
 * Sends HTTP status 405.
 */
function NotSupportedHandler(request, response, model)
{
	HELPERS.sendContent(response, 405, "text/plain", "405 Not Supported\n" + request.method + ' ' + model._path);
}

/**
 * A special handler function for telling the user about the incoming request
 * and additional information on the model object created by the main router.
 * Sends HTTP status 200.
 */
function DebugHandler(request, response, model)
{
	HELPERS.sendContentHeader(response, 200, "text/plain");
	HELPERS.sendContentFragment(response, request.method + ' ' + model._path + "\n");
	HELPERS.sendContentFragment(response, "--Headers--\n");
	HELPERS.sendContentFragment(response, JSON.stringify(request.headers, null, "    "));
	HELPERS.sendContentFragment(response, "\n--Model--\n");
	HELPERS.sendContentFragment(response, JSON.stringify(model, null, "    "));
	HELPERS.sendEnd(response);
}

/**************************** Optional Handlers *****************************/

// Cache of Jade-compiled Jade pages. Maps path to generator function.
var _JADECACHE = {};

/**
 * Creates a new handler for a Jade file.
 * @param root the document root.
 * @param encoding (optional) the anticipated file encoding (if not specified, "utf8").
 * @return a handler function.
 */
var createJadeHandler = !JADE ? null : function (root, encoding)
{
	if (!root || 'string' !== typeof root)
		throw new Error('Must declare a root directory for the document root.');

	root = UTIL.removeSlash(root);
	if (!encoding) encoding = 'utf8';
	
	if (!FS.existsSync(root))
		throw new Error("Document root '"+root+"' does not exist!");

	return function(request, response, model)
	{
		if (!FS.existsSync(root + model._path))
		{
			HELPERS.sendContent(response, 404, "text/plain", "404 Not Found\n" + model._path);
			return;
		}
		
		FS.readFile(root + model._path, encoding, function(err, data)
		{
			if (err)
			{
				HELPERS.sendContent(response, 500, "text/plain", "500 Server Error\n");
				logging.error(err);
			}
			else
			{
				try {
					var file = root + model._path;
					var fn = _JADECACHE[file] ? _JADECACHE[file] : _JADECACHE[file] = JADE.compile(data, {"filename": file});
					var htmlout = fn(model);
					HELPERS.sendContent(response, 200, 'text/html', htmlout);
				} catch (e) {
					HELPERS.sendContent(response, 500, "text/plain", "500 Server Error\n" + e);
					logging.error(err);
				}
			}
		});
	};
};

/**
 * Creates a new handler for a Mustache file.
 * @param root the document root.
 * @param encoding (optional) the anticipated file encoding (if not specified, "utf8").
 * @return a handler function.
 */
var createMustacheHandler = !MUSTACHE ? null : function (root, encoding)
{
	if (!root || 'string' !== typeof root)
		throw new Error('Must declare a root directory for the document root.');

	root = UTIL.removeSlash(root);
	if (!encoding) encoding = 'utf8';

	if (!FS.existsSync(root))
		throw new Error("Document root '"+root+"' does not exist!");
	
	return function(request, response, model)
	{
		if (!FS.existsSync(root + model._path))
		{
			HELPERS.sendContent(response, 404, "text/plain", "404 Not Found\n" + model._path);
			return;
		}
		
		FS.readFile(root + model._path, encoding, function(err, data)
		{
			if (err)
			{
				HELPERS.sendContent(response, 500, "text/plain", "500 Server Error\n");
				logging.error(err);
			}
			else
			{
				try {
					HELPERS.sendContent(response, 200, 'text/html', MUSTACHE.render(data, model));
				} catch (e) {
					HELPERS.sendContent(response, 500, "text/plain", "500 Server Error\n" + e);
					logging.error(err);
				}
			}
		});
	};
};

/**
 * Creates a new handler for a Markdown file.
 * @param root the document root.
 * @param encoding (optional) the anticipated file encoding (if not specified, "utf8").
 * @return a handler function.
 */
var createMarkdownHandler = !MARKDOWN ? null : function (root, encoding)
{
	if (!root || 'string' !== typeof root)
		throw new Error('Must declare a root directory for the document root.');
	
	root = UTIL.removeSlash(root);
	if (!encoding) encoding = 'utf8';

	if (!FS.existsSync(root))
		throw new Error("Document root '"+root+"' does not exist!");

	return function(request, response, model)
	{
		if (!FS.existsSync(root + model._path))
		{
			HELPERS.sendContent(response, 404, "text/plain", "404 Not Found\n" + model._path);
			return;
		}
		
		FS.readFile(root + model._path, encoding, function(err, data)
		{
			if (err)
			{
				HELPERS.sendContent(response, 500, "text/plain", "500 Server Error\n");
				logging.error(err);
			}
			else
			{
				try {
					var content = '<!DOCTYPE html><html><body>' + (MARKDOWN.markdown.toHTML(data)) + '</body></html>';
					HELPERS.sendContent(response, 200, 'text/html', content);
				} catch (e) {
					HELPERS.sendContent(response, 500, "text/plain", "500 Server Error\n" + e);
					logging.error(err);
				}
			}
		});
	};
};

// ............................. Exports ....................................

if (!MIME)
	logging.info("'Mime' module not installed. Using internal type tester.");

if (!JADE)
	logging.info("'Jade' module not installed. The Jade handler is not available.");
else
	exports.createJadeHandler = createJadeHandler;

if (!MUSTACHE)
	logging.info("'Mustache' module not installed. The Mustache handler is not available.");
else
	exports.createMustacheHandler = createMustacheHandler;

if (!MARKDOWN)
	logging.info("'Markdown' module not installed. The Markdown handler is not available.");
else
	exports.createMarkdownHandler = createMarkdownHandler;

exports.createFileHandler = createFileHandler;
exports.createHandlerChain = createHandlerChain;
exports.NotFoundHandler = NotFoundHandler;
exports.NotSupportedHandler = NotSupportedHandler;
exports.DebugHandler = DebugHandler;
