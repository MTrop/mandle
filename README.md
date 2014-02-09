# Mandle

Node.js HTTP router with out-of-the-box document-serving and session-keeping 
capabilities. Can use certain modules optionally for expanded capability, 
ensuring that your server is as fat or lean as you want.

Mandle is currently in an **UNSTABLE** state and will undergo some changes before its API is finalized.

## Features

Mandle has plenty appealing features.

* Routes requests by static path or Regex or Wildcard pattern.
* Has built-in session management.
* Has built-in cookie reading.
* Has built-in parameter parsing, on GET or POST requests.
* Has built-in file upload handling, if Formidable is installed (optionally). 
* Is essentially an onRequest handler, so it can be wired to HTTP or HTTPS.
* Contains some handlers for 

## How to Install

If you have [npm], installing **Mandle** couldn't be easier.

```
npm install git+https://github.com/MTrop/mandle.git
```

*(Once NPM's login and registration bits start working again, that'll be a heck
of a lot shorter, I promise)*

You can also install it manually via Git, if you so wished:

```
git clone https://github.com/MTrop/mandle.git mandle
```

But then, the "require" line in your program would be:

```
var mandle = require('./mandle');
```



