# xdm.js

[![Build Status](https://secure.travis-ci.org/necolas/xdm.js.png?branch=master)](http://travis-ci.org/necolas/xdm.js)

Cross-domain messaging over postMessage, based on the [JSON-RPC
2.0](http://www.jsonrpc.org/specification) protocol. It is a stripped down and
slightly modified version of [easyXDM](https://github.com/oyvindkinsey/easyXDM/).

## Installation

Install with [Bower](http://bower.io):

```
bower install --save xdm.js
```

The component can be used as a Common JS module, an AMD module, or a browser
global.


## API

The xdm.js library must be included in both the host and guest application. It
will dynamically create the guest application's iframe from the host
application.

### xdm.version

The version of the library.

### xdm.Rpc(config, methods);

The cross-domain RPC constructor.

Creates a proxy object that can be used to call methods implemented on the
remote end of the channel, and also to provide the implementation of methods to
be called from the remote end.

Creates an iframe to the remote window.

```js
// connect to the host application
var host = xdm.Rpc(config, methods);
```

#### config.onReady (optional)

Specify a function to call when communication has been established.

#### config.container (host application only)

The DOM node to append the generated iframe to.

#### config.remote (host application only)

The path to the local or remote window. Set to 'about:blank' if using
`config.html`.

#### config.html (optional; host application only)

The HTML to be injected into a sourceless iframe.

#### config.props (optional; host application only)

The additional attributes to set on the iframe. Can contain nested objects, e.g.,
`'style': { 'border': '1px solid black' }`.

#### config.acl (optional; guest application only)

Add domains to an Access Control List. The ACL can contain `*` and `?` as
wildcards, or can be regular expressions. If regular expressions they need to
begin with `^` and end with `$`.

#### methods.local (optional)

All the methods you which to expose to the remote window.

```js
var methods = {};
methods.local = {
    namedMethod: function (data, success, error) { /* ... */ }
};
```

The function will receive the passed arguments followed by the callback
functions `success` and `error`. To send a successful result back you can
use:

`return foo` or `success(foo)`

To return an error you can use:

`throw new Error('foo error')` or `error('foo error')`

#### methods.remote (optional)

All the remote methods you want to use from the remote window when it's ready.
These are just stubs.

```js
methods.remote = {
    remoteMethod: {}
};
```

#### Example

```js
// host application creates new connection with a guest widget

var widget = new xdm.Rpc({
    remote: 'http://another.domain.com/widget.html',
    container: document.body,
    props: {
        'height': '300px',
        'style': {
            'border': '2px solid red'
        }
    },
    onReady: function () {
        isReady = true;
    }
}, {
    remote: {
        guestMethod: {}
    },
    local: {
        hostMethod: function (msg) {
            return msg;
        }
    }
});

widget.guestMethod('message');

// guest application creates new connection with host application

var host = new xdm.Rpc({
    acl: [
        'http://example.com',
        'http://sub.example.com'
    ],
    onReady: function () {
        isReady = true;
    }
}, {
    remote: {
        hostMethod: {}
    },
    local: {
        guestMethod: function (msg) {
            return msg;
        }
    }
});

host.hostMethod('message')
```

### xdm.Rpc.iframe;

A reference to the instance's iframe.

### xdm.Rpc.destroy();

Teardown the communication channel and remove the iframe from the DOM.

### proxy.remoteMethod(arg1, arg2, successCallback, errorCallback)

Remote method calls can take any number of arguments.

The second last argument is a success callback.
The last argument is an error callback.

```js
// from within the widget, request that the host resize the iframe
host.resizeIframe({
    height: calculatedHeight
}, successCallback, errorCallback);
```

When called with no callback a JSON-RPC 2.0 notification will be executed.
Be aware that you will not be notified of any errors with this method.

## Development

Install [Node](http://nodejs.org) (comes with npm).

From the repo root, install the project's development dependencies:

```
npm install
```

Testing relies on the Karma test-runner. If you'd like to use Karma to
automatically watch and re-run the test file during development, it's easiest
to globally install Karma and run it from the CLI.

```
npm install -g karma
karma start
```

To run the tests in Firefox, just once, as Travis CI does:

```
npm test
```

## Browser support

* Google Chrome (latest)
* Opera (latest)
* Firefox 4+
* Safari 5+
* Internet Explorer 8+
