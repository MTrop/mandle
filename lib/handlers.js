/****************************************************************************
 * Handers and handler creation utilities for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var fs = require('fs');

var util = require('./util');
var helpers = require('./helpers');
var logging = require('./logging');

/* JADE by tjholowaychuk and forbeslindesay */
var JADE = util.require_maybe('jade');
/* MUSTACHE by nathan and mjackson */
var MUSTACHE = util.require_maybe('mustache');
/* MARKDOWN by ashb and dom */
var MARKDOWN = util.require_maybe('markdown');

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
 * @param encoding (optional) the anticipated file encoding of served text files (if not specified, "utf8").
 * @returns a handler function.
 */
function createFileHandler(root, indexDirectory, encoding)
{
	if (!root || 'string' !== typeof root)
		throw new Error('Must declare a root directory for the document root.');

	root = util.removeSlash(root);
	if (!encoding) encoding = 'utf8';
	
	return function(request, response, model)
	{
		if (!fs.existsSync(root + model._path))
		{
			helpers.sendStatus(response, 404, model._path);
			return;
		}
		
		var filepath = root + model._path;
		
		fs.stat(filepath, function(err, stats) 
		{
			if (err)
			{
				helpers.sendStatus(response, 500, err);
				logging.error(err);
			}
			else if (stats.isDirectory())
			{
				if (!indexDirectory)
					helpers.sendStatus(response, 404, model._path);
				else if (model._path[model._path.length - 1] !== '/')
				{
					helpers.sendRedirect(response, model._path + '/');
				}
				else fs.readdir(filepath, function(err, files)
				{
					if (err)
					{
						helpers.sendStatus(response, 500, err);
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
							var fsstats = fs.statSync(filepath+"/" + fn);
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
						
						helpers.sendData(response, _fileDumpDirectoryHTML(model._path, dir_list, file_list, file_info), 'text/html');
					}
				});
			}
			else 
				helpers.sendFile(response, filepath, 'text/html');
		});
		
	};
	
}

/**
 * Creates a new handler that is a chain of handlers - if one of the handlers returns
 * a false-equivalent value, the chain is stopped.
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


/**************************** Optional Handlers *****************************/

// Creates a new handler for a Jade file.
var createJadeHandler = !JADE ? null : function (root, encoding)
{
	if (!root || 'string' !== typeof root)
		throw new Error('Must declare a root directory for the document root.');

	root = util.removeSlash(root);
	if (!encoding) encoding = 'utf8';
	
	if (!fs.existsSync(root))
		throw new Error("Document root '"+root+"' does not exist!");

	// Cache of Jade-compiled Jade pages. Maps path to generator function.
	var _JADECACHE = {};

	return function(request, response, model)
	{
		if (!fs.existsSync(root + model._path))
		{
			helpers.sendStatus(response, 404, model._path);
			return;
		}
		
		fs.readFile(root + model._path, encoding, function(err, data)
		{
			if (err)
			{
				helpers.sendStatus(response, 500, err);
				logging.error(err);
			}
			else
			{
				try {
					var file = root + model._path;
					var fn = _JADECACHE[file] ? _JADECACHE[file] : _JADECACHE[file] = JADE.compile(data, {"filename": file});
					var htmlout = fn(model);
					helpers.sendData(response, htmlout, 'text/html');
				} catch (e) {
					helpers.sendStatus(response, 500, e);
					logging.error(e);
				}
			}
		});
	};
};

// Creates a new handler for a Mustache file.
var createMustacheHandler = !MUSTACHE ? null : function (root, encoding)
{
	if (!root || 'string' !== typeof root)
		throw new Error('Must declare a root directory for the document root.');

	root = util.removeSlash(root);
	if (!encoding) encoding = 'utf8';

	if (!fs.existsSync(root))
		throw new Error("Document root '"+root+"' does not exist!");
	
	return function(request, response, model)
	{
		if (!fs.existsSync(root + model._path))
		{
			helpers.sendStatus(response, 404, model._path);
			return;
		}
		
		fs.readFile(root + model._path, encoding, function(err, data)
		{
			if (err)
			{
				helpers.sendStatus(response, 500, err);
				logging.error(err);
			}
			else
			{
				try {
					helpers.sendData(response, MUSTACHE.render(data, model), 'text/html');
				} catch (e) {
					helpers.sendStatus(response, 500, e);
					logging.error(e);
				}
			}
		});
	};
};

// Creates a new handler for a Markdown file.
var createMarkdownHandler = !MARKDOWN ? null : function (root, encoding)
{
	if (!root || 'string' !== typeof root)
		throw new Error('Must declare a root directory for the document root.');
	
	root = util.removeSlash(root);
	if (!encoding) encoding = 'utf8';

	if (!fs.existsSync(root))
		throw new Error("Document root '"+root+"' does not exist!");

	return function(request, response, model)
	{
		if (!fs.existsSync(root + model._path))
		{
			helpers.sendStatus(response, 404, model._path);
			return;
		}
		
		fs.readFile(root + model._path, encoding, function(err, data)
		{
			if (err)
			{
				helpers.sendStatus(response, 500, err);
				logging.error(err);
			}
			else
			{
				try {
					var content = '<!DOCTYPE html><html><body>' + (MARKDOWN.markdown.toHTML(data)) + '</body></html>';
					helpers.sendData(response, content, 'text/html');
				} catch (e) {
					helpers.sendStatus(response, 500, e);
					logging.error(e);
				}
			}
		});
	};
};

/****************************************************************************
 * Pre-built handler functions.
 ****************************************************************************/

/**
 * Handler function for telling the user that a resource could not be found.
 * Sends HTTP status 404.
 */
function notFoundHandler(request, response, model)
{
	helpers.sendStatus(response, 404, request.method + ' ' + model._path);
}

/**
 * Handler function for telling the user that a request type is not supported.
 * Sends HTTP status 405.
 */
function notSupportedHandler(request, response, model)
{
	helpers.sendStatus(response, 405, request.method + ' ' + model._path);
}

/**
 * A special handler function for telling the user about the incoming request
 * and additional information on the model object created by the main router.
 * Sends HTTP status 200.
 */
function debugHandler(request, response, model)
{
	response.setHeader("Content-Type", "text/plain");
	response.writeHead(status);
	response.write("200 OK\n");
	response.write(request.method + ' ' + model._path + "\n");
	response.write("--Headers--\n");
	response.write(JSON.stringify(request.headers, null, "    "));
	response.write("\n--Model--\n");
	response.write(JSON.stringify(model, null, "    "));
	response.end();
}

// ............................. Exports ....................................

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
exports.notFoundHandler = notFoundHandler;
exports.notSupportedHandler = notSupportedHandler;
exports.debugHandler = debugHandler;
