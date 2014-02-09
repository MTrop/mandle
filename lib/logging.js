/****************************************************************************
 * Logging portion for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var util = require('./util');
var format = require('util').format; // Node.JS util

//Logging levels.

var LEVEL_FATAL = 0;
var LEVEL_ERROR = 1;
var LEVEL_WARN = 2;
var LEVEL_INFO = 3;
var LEVEL_DEBUG = 4;

// Logging options.

var options = {
	"level": LEVEL_INFO,
	"alwaysToErr": false,
	"alwaysToOut": false,
	"dateFormat": 'yyyy-MM-dd hh:mm:ss.SSS'
};

//Logging level name.

var levelName = [
	'FATAL',
	'ERROR',
	'WARN ',
	'INFO ',
	'DEBUG'
];

function _messageout(level, args)
{
	return format.apply(format, ['[MANDLE] %s %s : ' + args[0], util.formatDate(Date.now(), options.dateFormat), levelName[level]].concat(args.slice(1)));
}

/**
 * Logs a FATAL message to console.error(), unless Options.alwaysToOut is true.
 * @see console.error for usage.
 * @see Options.level for logging level output.
 * @see Options.dateFormat for date format output.
 */
function fatal()
{
	if (LEVEL_FATAL <= options.level)
		(options.alwaysToOut ? console.log : console.error)(_messageout(LEVEL_FATAL, [].slice.call(arguments))); 
}

/**
 * Logs an ERROR message to console.error(), unless Options.alwaysToOut is true.
 * @see console.error for usage.
 * @see Options.level for logging level output.
 * @see Options.dateFormat for date format output.
 */
function error()
{
	if (LEVEL_ERROR <= options.level)
		(options.alwaysToOut ? console.log : console.error)(_messageout(LEVEL_ERROR, [].slice.call(arguments))); 
}

/**
 * Logs a WARN message to console.error(), unless Options.alwaysToOut is true.
 * @see console.error for usage.
 * @see Options.level for logging level output.
 * @see Options.dateFormat for date format output.
 */
function warn()
{
	if (LEVEL_WARN <= options.level)
		(options.alwaysToOut ? console.log : console.error)(_messageout(LEVEL_WARN, [].slice.call(arguments))); 
}

/**
 * Logs an INFO message to console.out(), unless Options.alwaysToErr is true.
 * @see console.log for usage.
 * @see Options.level for logging level output.
 * @see Options.dateFormat for date format output.
 */
function info()
{
	if (LEVEL_INFO <= options.level)
		(options.alwaysToErr ? console.error : console.log)(_messageout(LEVEL_INFO, [].slice.call(arguments))); 
}

/**
 * Logs an DEBUG message to console.out(), unless Options.alwaysToErr is true.
 * @see console.log for usage.
 * @see Options.level for logging level output.
 * @see Options.dateFormat for date format output.
 */
function debug()
{
	if (LEVEL_DEBUG <= options.level)
		(options.alwaysToErr ? console.error : console.log)(_messageout(LEVEL_DEBUG, [].slice.call(arguments))); 
}

// ............................. Exports ....................................

exports.options = options;

exports.fatal = fatal;
exports.error = error;
exports.warn = warn;
exports.info = info;
exports.debug = debug;
