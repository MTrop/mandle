/****************************************************************************
 * File caching map for Mandle.
 * Matt Tropiano 2014
 ****************************************************************************/

var fs = require('fs');
var logging = require('./logging');

/**
 * File cache map object.
 */
function FileCacheMap()
{
	var _self = this;
	
	// Map of file path to last modified date.
	var pathAgeMap = {};
	// Map of file path to file content.
	var pathContentMap = {};
	// Total size.
	var totalSize = 0; 
	
	/**
	 * Removes a file from the cache.
	 * @param path the path to the file in the cache.
	 */
	this.clearData = function(path)
	{
		delete pathAgeMap[path];
		if (pathContentMap[path])
		{
			var len = pathContentMap[path].length;
			delete pathContentMap[path];
			totalSize -= len;
			logging.debug("Removed file cache for '%s'.", path);
		}
	};
	
	/**
	 * Caches a file (if old or not cached) and when it is done, calls the callback.
	 * @param path the path to the file to cache.
	 * @param encoding (optional) if provided, the expected file encoding.
	 * @param callback the function to call on completion with args (err, data). err: error, if any. data: file content.
	 */
	this.cacheFile = function(path, encoding, callback)
	{
		var cb = arguments[arguments.length - 1];
		
		fs.stat(path, function(err, stats){
			if (err)
				cb(err, null);
			else
			{
				var modified = stats.mtime.getTime();
				
				if (!pathAgeMap[path] || pathAgeMap[path] != modified)
				{
					_self.clearData(path);
					
					fs.readFile(path, encoding, function(err, data)
					{
						if (err)
							cb(err, null);
						else
						{
							pathAgeMap[path] = modified;
							pathContentMap[path] = data;
							totalSize += data.length; 
							logging.debug("Cached '%s', %d bytes.", path, data.length);
							cb(null, pathContentMap[path]);
						}
					});
				}
				else
				{
					logging.debug("Returned cached file '%s'.", path);
					cb(null, pathContentMap[path]);
				}
			}
		}); 
		
	};
	
}

//............................. Exports ....................................

exports.FileCacheMap = FileCacheMap;