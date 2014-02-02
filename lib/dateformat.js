/****************************************************************************
 * Date Format Stuff for Mandle
 * Matt Tropiano 2014
 ****************************************************************************/

// Enumerations and stuff.

var _DAYINWEEK = [
	['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
	['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
];
var _MONTHINYEAR = [
	['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], // MMM
	['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] // MMMM
];

function _PAD(value, len)
{
	value = parseInt(value, 10);
	var out = '';
	do {
		out = value % 10 + out; 
		value = Math.floor(value / 10);
		len--;
	} while (value > 0);
	
	while (len-- > 0)
		out = '0' + out; 
	
	return out;
}

// The regular expression for finding all pertinent tokens. 
var _DATEFORMATREGEX = /G+|y+|M+|w+|W+|D+|d+|F+|E+|a+|H+|k+|K+|h+|m+|s+|S+|z+|Z+|'.*'/g;

/* Mapping of token types to value function. All return strings. */
var _TOKENFUNCS = {
	"G": function(token, date, utc)
	{
		if ((utc ? date.getUTCFullYear() : date.getFullYear()) < 0)
			return token.length === 1 ? 'B' : 'BC';
		else
			return token.length === 1 ? 'A' : 'AD';
	},
	"y": function(token, date, utc)
	{
		var year = (utc ? date.getUTCFullYear() : date.getFullYear());
		if (token.length === 2)
			return Math.floor(year % 100)+'';
		else
			return _PAD(year, token.length);
	},
	"M": function(token, date, utc)
	{
		var month = (utc ? date.getUTCMonth() : date.getMonth());
		if (token.length === 1)
			return (month + 1)+'';
		else if (token.length === 2)
			return _PAD(month + 1, 2);
		else if (token.length === 3)
			return _MONTHINYEAR[0][month];
		else
			return _MONTHINYEAR[1][month];
	},
	"d": function(token, date, utc)
	{
		var d = (utc ? date.getUTCDate() : date.getDate());
		if (token.length === 1)
			return (d + 1)+'';
		else
			return _PAD(d, token.length);
	},
	"E": function(token, date, utc)
	{
		var day = (utc ? date.getUTCDay() : date.getDay());
		if (token.length === 1)
			return day+'';
		else if (token.length === 2)
			return _DAYINWEEK[0][day];
		else if (token.length === 3)
			return _DAYINWEEK[1][day];
		else
			return _DAYINWEEK[2][day];
	},
	"a": function(token, date, utc)
	{
		var pm = (utc ? date.getUTCHours() >= 12 : date.getHours() >= 12);
		if (token.length === 1)
			return pm ? 'P' : 'A';
		else
			return pm ? 'PM' : 'AM';
	},
	"H": function(token, date, utc)
	{
		var hours = (utc ? date.getUTCHours() : date.getHours());
		if (token.length === 1)
			return hours+'';
		else
			return _PAD(hours, token.length);
	},
	"k": function(token, date, utc)
	{
		var hours = (utc ? date.getUTCHours() : date.getHours()) + 1;
		if (token.length === 1)
			return hours+'';
		else
			return _PAD(hours, token.length);
	},
	"K": function(token, date, utc)
	{
		var hours = Math.floor((utc ? date.getUTCHours() : date.getHours()) % 12) - 1;
		if (token.length === 1)
			return hours+'';
		else
			return _PAD(hours, token.length);
	},
	"h": function(token, date, utc)
	{
		var hours = Math.floor((utc ? date.getUTCHours() : date.getHours()) % 12);
		if (token.length === 1)
			return hours+'';
		else
			return _PAD(hours, token.length);
	},
	"m": function(token, date, utc)
	{
		var minutes = (utc ? date.getUTCMinutes() : date.getMinutes());
		if (token.length === 1)
			return minutes+'';
		else
			return _PAD(minutes, token.length);
	},
	"s": function(token, date, utc)
	{
		var seconds = (utc ? date.getUTCSeconds() : date.getSeconds());
		if (token.length === 1)
			return seconds+'';
		else
			return _PAD(seconds, token.length);
	},
	"S": function(token, date, utc)
	{
		var millis = (utc ? date.getUTCMilliseconds() : date.getMilliseconds());
		if (token.length === 1)
			return Math.round(millis / 100) + '';
		else if (token.length === 2)
			return _PAD(Math.round(millis / 10), 2);
		else
			return _PAD(millis, 3);
	},
	"Z": function(token, date, utc)
	{
		var offset = (date.getTimezoneOffset() / 60) * 100;
		return (offset > 0 ? '-' : '') +_PAD(offset, 4)+'';
	},
	"'": function(token, date, utc)
	{
		if (token.length === 2)
			return "'";
		else
			return token.substring(1, token.length - 1);
	},
};

/**
 * Formats a date string.
 * @param date a date object, or a number (millisecond time) or string (date to parse using new Date()).
 * @returns a formatted date string.
 */
function formatDate(date, formatstring, utc)
{
	if (date === null)
		return null;
	else if ('undefined' === typeof date)
		return null;
	else if ('string' === typeof date || 'number' === typeof date)
		date = new Date(date);
	
	var out = formatstring;
	var tokens = formatstring.match(_DATEFORMATREGEX);
	
	for(var i = tokens.length - 1; i >= 0; i--)
	{
		var element = tokens[i];
		var func = _TOKENFUNCS[element[0]];
		if (func)
			out = out.replace(element, func(element, date, utc));
	}
	
	return out;
}

// ............................. Exports ....................................

exports.formatDate = formatDate;
