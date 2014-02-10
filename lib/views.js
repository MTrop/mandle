/****************************************************************************
 * View engine for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var util = require('./util');

/* Name -> engineFunction map. */
var _engineMap = {};

/** 
 * File extension to engine map.
 * ext -> name 
 */
var _engineExtMap = {};

// Name is engine name.
// Extension is engine name.
// Function is (response, path, model)
function register(name, extension, engineFunc)
{
	_engineMap[name] = engineFunc;
	if (util.isArray(extension))
	{
		for (var i = 0; i < extension.length; i++)
			_engineExtMap[extension[i]] = engineFunc;
	}
	else
		_engineExtMap[extension] = engineFunc;
}

// Name is engine name.
// If not provided, use default.
// Returns function(response, path, model)
function get(name)
{
	return _engineMap[name];
}

// Ext is engine name.
// If not provided, use default.
// Returns function(response, path, model)
function getExtension(ext)
{
	return _engineExtMap[ext];
}

//............................. Exports ....................................

exports.register = register;
exports.get = get;
exports.getExtension = getExtension;

