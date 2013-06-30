/*!
 * xdm.js – Nicolas Gallagher – MIT License
 * easyXDM – Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no – MIT License
 */

(function (window) {
    'use strict';

    if (!window.postMessage) {
        return;
    }

    // stores namespace under which the 'xdm' object is stored on the page
    // (empty if object is global)
    var namespace = "";
    var xdm = {};
    // map over global xdm in case of overwrite
    var _xdm = window.xdm;
    var IFRAME_PREFIX = 'xdm_';

    var iframe = document.createElement('IFRAME');
    // randomize the initial id in case multiple closures are loaded
    var channelId = Math.floor(Math.random() * 10000);
    var emptyFn = Function.prototype;
    // returns groups for protocol (2), domain (3) and port (4)
    var reURI = /^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/;
    // matches a foo/../ expression
    var reParent = /[\-\w]+\/\.\.\//;
    // matches `//` anywhere but in the protocol
    var reDoubleSlash = /([^:])\/\//g;

    /**
     * Helper for adding and removing cross-browser event listeners
     */

    var addEvent = (function () {
        if (window.addEventListener) {
            return function (target, type, listener) {
                target.addEventListener(type, listener, false);
            };
        }
        return function (target, type, listener) {
            target.attachEvent('on' + type, listener);
        };
    }());

    var removeEvent = (function () {
        if (window.removeEventListener) {
            return function (target, type, listener) {
                target.removeEventListener(type, listener, false);
            };
        }
        return function (target, type, listener) {
            target.detachEvent('on' + type, listener);
        };
    }());

    /**
     * Build the query object from location.hash
     */

    var query = (function (input) {
        input = input.substring(1, input.length).split('&');
        var data = {}, pair, i = input.length;
        while (i--) {
            pair = input[i].split('=');
            data[pair[0]] = decodeURIComponent(pair[1]);
        }
        return data;
    }(location.hash));

    // -------------------------------------------------------------------------

    /**
     * xdm object setup
     */

    xdm.version = "1.0.0";
    xdm.stack = {};
    xdm.query = query;
    xdm.checkAcl = checkAcl;

    /**
     * Removes the `xdm` variable from the global scope. It also returns control
     * of the `xdm` variable to the code that used it before.
     *
     * @param {String} ns A string representation of an object that will hold
     *   an instance of xdm.
     * @return {xdm}
     */

    xdm.noConflict = function (ns) {
        window.xdm = _xdm;
        namespace = ns;
        if (namespace) {
            IFRAME_PREFIX = 'xdm_' + namespace.replace('.', '_') + '_';
        }
        return xdm;
    };

    // -------------------------------------------------------------------------

    /**
     * Helper for testing if an object is an array
     *
     * @param {Object} obj The object to test
     * @return {Boolean}
     */

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    /**
     * Helper for testing if a variable/property is undefined
     *
     * @param {Object} variable The variable to test
     * @return {Boolean}
     */

    function undef(variable) {
        return typeof variable === 'undefined';
    }

    /**
     * Returns a string containing the schema, domain and if present the port
     *
     * @param {String} url The url to extract the location from
     * @return {String} The location part of the url
     */

    function getLocation(url) {
        if (!url) {
            throw new Error('url is undefined or empty');
        }
        if (/^file/.test(url)) {
            throw new Error('The file:// protocol is not supported');
        }

        var m = url.toLowerCase().match(reURI);
        if (m) {
            var proto = m[2], domain = m[3], port = m[4] || '';
            if ((proto === 'http:' && port === ':80') || (proto === 'https:' && port === ':443')) {
                port = '';
            }
            return proto + '//' + domain + port;
        }

        return url;
    }

    /**
     * Resolves a relative url into an absolute one.
     *
     * @param {String} url The path to resolve.
     * @return {String} The resolved url.
     */
    function resolveUrl(url) {
        if (!url) {
            throw new Error('url is undefined or empty');
        }

        // replace all `//` except the one in proto with `/`
        url = url.replace(reDoubleSlash, '$1/');

        // if the url is a valid url we do nothing
        if (!url.match(/^(http||https):\/\//)) {
            // If this is a relative path
            var path = (url.substring(0, 1) === '/') ? '' : location.pathname;
            if (path.substring(path.length - 1) !== '/') {
                path = path.substring(0, path.lastIndexOf('/') + 1);
            }

            url = location.protocol + '//' + location.host + path + url;
        }

        // reduce all 'xyz/../' to just ''
        while (reParent.test(url)) {
            url = url.replace(reParent, '');
        }

        return url;
    }

    /**
     * Applies properties from the source object to the target object.
     *
     * @param {Object} destination The target of the properties.
     * @param {Object} source The source of the properties.
     * @param {Boolean} noOverwrite Set to True to only set non-existing properties.
     */

    function merge(destination, source, noOverwrite) {
        var member;
        for (var prop in source) {
            if (source.hasOwnProperty(prop)) {
                if (prop in destination) {
                    member = source[prop];
                    if (typeof member === 'object') {
                        merge(destination[prop], member, noOverwrite);
                    }
                    else if (!noOverwrite) {
                        destination[prop] = source[prop];
                    }
                }
                else {
                    destination[prop] = source[prop];
                }
            }
        }
        return destination;
    }

    /**
     * GUEST ONLY
     * Check whether a host domain is allowed using an Access Control List.
     * The ACL can contain `*` and `?` as wildcards, or can be regular expressions.
     * If regular expressions they need to begin with `^` and end with `$`.
     *
     * @param {Array/String} acl The list of allowed domains
     * @param {String} domain The domain to test.
     * @return {Boolean} True if the domain is allowed, false if not.
     */

    function checkAcl(acl, domain) {
        // normalize into an array
        if (typeof acl === 'string') {
            acl = [acl];
        }
        var re;
        var i = acl.length;
        while (i--) {
            re = acl[i];
            re = new RegExp(re.substr(0, 1) === '^' ? re : ('^' + re.replace(/(\*)/g, '.$1').replace(/\?/g, '.') + '$'));
            if (re.test(domain)) {
                return true;
            }
        }
        return false;
    }

    /**
     * HOST ONLY
     * Appends the parameters to the given url.
     * The base url can contain existing query parameters.
     *
     * @param {String} url The base url.
     * @param {Object} parameters The parameters to add.
     * @return {String} A new valid url with the parameters appended.
     */

    function appendQueryParameters(url, parameters) {
        if (!parameters) {
            throw new Error('parameters is undefined or null');
        }

        var indexOf = url.indexOf('#');
        var q = [];
        for (var key in parameters) {
            if (parameters.hasOwnProperty(key)) {
                q.push(key + '=' + encodeURIComponent(parameters[key]));
            }
        }

        return url + (indexOf === -1 ? '#' : '&') + q.join('&');
    }

    /**
     * HOST ONLY
     * Creates an iframe and appends it to the DOM.
     *
     * @param {Object} config This iframe configuration object
     * @return {Element} The frames DOM Element
     */

    function createFrame(config) {
        var frame = iframe.cloneNode(false);

        // merge the defaults with the configuration properties
        merge(config.props, {
            frameBorder: 0,
            allowTransparency: true,
            scrolling: 'no',
            width: '100%',
            src: appendQueryParameters(config.remote, {
                xdm_e: getLocation(location.href),
                xdm_c: config.channel,
                xdm_p: 1
            }),
            name: IFRAME_PREFIX + config.channel + '_provider',
            style: {
                margin: 0,
                padding: 0,
                border: 0
            }
        });

        frame.id = config.props.name;
        delete config.props.name;

        // if no container, then we cannot proceed
        if (!config.container) {
            throw new Error('xdm.Rpc() configuration object missing a DOM "container" property');
        }

        // merge config properties into the frame
        merge(frame, config.props);

        config.container.appendChild(frame);

        if (config.onLoad) {
            addEvent(frame, 'load', config.onLoad);
        }

        // if we're injecting HTML directly into the iframe
        if (config.html) {
            frame.contentWindow.document.open();
            frame.contentWindow.document.write(config.html);
            frame.contentWindow.document.close();
        }

        // pass a reference to the frame around so that it can be exposed on the
        // rpc object
        config.iframe = frame;

        return frame;
    }

    /**
     * Prepares an array of stack-elements suitable for the current configuration
     *
     * @param {Object} config The Transports configuration.
     * @return {Array} An array of stack-elements with the TransportElement at index 0.
     */

    function prepareTransportStack(config) {
        var stackEls;

        config.isHost = config.isHost || undef(query.xdm_p);
        config.props = config.props || {};

        if (!config.isHost) {
            config.channel = query.xdm_c.replace(/["'<>\\]/g, '');
            config.remote = query.xdm_e.replace(/["'<>\\]/g, '');

            if (config.acl && !checkAcl(config.acl, config.remote)) {
                throw new Error('Access denied for ' + config.remote);
            }
        }
        else {
            config.remote = resolveUrl(config.remote);
            config.channel = config.channel || 'default' + channelId++;
        }

        stackEls = [new xdm.stack.PostMessageTransport(config)];
        // this behavior is responsible for buffering outgoing messages
        stackEls.push(new xdm.stack.QueueBehavior(true));

        return stackEls;
    }

    /**
     * Chains all the separate stack elements into a single usable stack.
     * If an element is missing a necessary method then it will have a pass-through method applied.
     *
     * @param {Array} stackElements An array of stack elements to be linked.
     * @return {xdm.stack.StackElement} The last element in the chain.
     */

    function chainStack(stackElements) {
        var stackEl;
        var i;
        var len = stackElements.length;

        var defaults = {
            incoming: function (message, origin) {
                this.up.incoming(message, origin);
            },
            outgoing: function (message, recipient) {
                this.down.outgoing(message, recipient);
            },
            callback: function (success) {
                this.up.callback(success);
            },
            init: function () {
                this.down.init();
            },
            destroy: function () {
                this.down.destroy();
            }
        };

        for (i = 0; i < len; i++) {
            stackEl = stackElements[i];
            merge(stackEl, defaults, true);

            if (i !== 0) {
                stackEl.down = stackElements[i - 1];
            }

            if (i !== len - 1) {
                stackEl.up = stackElements[i + 1];
            }
        }

        return stackEl;
    }

    /**
     * This will remove a stackelement from its stack while leaving the stack functional.
     *
     * @param {Object} element The elment to remove from the stack.
     */

    function removeFromStack(element) {
        element.up.down = element.down;
        element.down.up = element.up;
        element.up = element.down = null;
    }

    /**
     * xdm.Rpc
     *
     * Creates a proxy object that can be used to call methods implemented on the
     * remote end of the channel, and also to provide the implementation of methods
     * to be called from the remote end.
     *
     * The instantiated object will have methods matching those specified in
     * `config.remote`.
     *
     * @param {Object} config The underlying transport configuration.
     *   remote: The remote window's location
     *   html: HTML to inject into a sourceless iframe
     *   container: The iframe's container DOM element
     *   props: Object of the properties that should be set on the frame
     *   acl: An array of domains to add to the Access Control List
     *   onReady: A function to call when communication has been established
     *   onLoad: A function to called – with the iframe's `contentWindow` as
     *     the argument – when the frame is fully loaded
     * @param {Object} jsonRpcConfig The description of the interface to implement.
     */

    xdm.Rpc = function (config, jsonRpcConfig) {
        var member;

        // expand shorthand notation
        if (jsonRpcConfig.local) {
            for (var method in jsonRpcConfig.local) {
                if (jsonRpcConfig.local.hasOwnProperty(method)) {
                    member = jsonRpcConfig.local[method];
                    if (typeof member === 'function') {
                        jsonRpcConfig.local[method] = {
                            method: member
                        };
                    }
                }
            }
        }

        // create the stack
        var stack = chainStack(prepareTransportStack(config).concat([
            new xdm.stack.RpcBehavior(this, jsonRpcConfig), {
                callback: function (success) {
                    if (config.onReady) config.onReady(success);
                }
            }
        ]));

        // set the origin
        this.origin = getLocation(config.remote);

        // initiates the destruction of the stack.
        this.destroy = function () {
            stack.destroy();
        };

        stack.init();

        // store a reference to the iframe that is created
        this.iframe = config.iframe;
    };

    /**
     * xdm.stack.PostMessageTransport
     *
     * PostMessageTransport uses HTML5 postMessage for communication.
     *
     * @param {Object} config The transports configuration.
     */

    xdm.stack.PostMessageTransport = function (config) {
        var pub;
        var frame;
        var callerWindow;
        var targetOrigin;

        /**
         * This is the main implementation for the onMessage event.
         * It checks the validity of the origin and passes the message on if appropriate.
         *
         * @param {Object} event The message event
         */

        function _windowOnMessage(event) {
            var origin = getLocation(event.origin);
            var dataIsString = (typeof event.data === 'string');
            if (origin === targetOrigin && dataIsString && event.data.substring(0, config.channel.length + 1) === config.channel + ' ') {
                pub.up.incoming(event.data.substring(config.channel.length + 1), origin);
            }
        }

        pub = {
            outgoing: function (message, domain, fn) {
                callerWindow.postMessage(config.channel + ' ' + message, domain || targetOrigin);
                if (fn) {
                    fn();
                }
            },

            destroy: function () {
                removeEvent(window, 'message', _windowOnMessage);
                if (frame) {
                    callerWindow = null;
                    frame.parentNode.removeChild(frame);
                    frame = null;
                }
            },

            init: function () {
                targetOrigin = getLocation(config.remote);
                if (config.isHost) {
                    // add the event handler for listening
                    var waitForReady = function (event) {
                        if (event.data === config.channel + '-ready') {
                            if ('postMessage' in frame.contentWindow) {
                                callerWindow = frame.contentWindow;
                            }
                            else {
                                callerWindow = frame.contentWindow.document;
                            }

                            // replace the eventlistener
                            removeEvent(window, 'message', waitForReady);
                            addEvent(window, 'message', _windowOnMessage);

                            setTimeout(function () {
                                pub.up.callback(true);
                            }, 0);
                        }
                    };

                    addEvent(window, 'message', waitForReady);
                    frame = createFrame(config);
                }
                else {
                     // add the event handler for listening
                    addEvent(window, 'message', _windowOnMessage);
                    if ('postMessage' in window.parent) {
                        callerWindow = window.parent;
                    }
                    else {
                        callerWindow = window.parent.document;
                    }

                    callerWindow.postMessage(config.channel + '-ready', targetOrigin);

                    setTimeout(function () {
                        pub.up.callback(true);
                    }, 0);
                }
            }
        };

        return pub;
    };

    /**
     * xdm.stack.QueueBehavior
     *
     * This is a behavior that enables queueing of messages.
     * It will buffer incoming messages and dispach these as fast as the underlying transport allows.
     *
     * @param {Boolean} remove If true, it will remove from the stack
     */

    xdm.stack.QueueBehavior = function (remove) {
        var pub;
        var queue = [];
        var waiting = true;
        var incoming = '';
        var destroying;

        function dispatch() {
            var message;

            if (remove === true && queue.length === 0) {
                removeFromStack(pub);
                return;
            }
            if (waiting || queue.length === 0 || destroying) {
                return;
            }

            waiting = true;
            message = queue.shift();

            pub.down.outgoing(message.data, message.origin, function (success) {
                waiting = false;
                if (message.callback) {
                    setTimeout(function () {
                        message.callback(success);
                    }, 0);
                }
                dispatch();
            });
        }

        pub = {
            init: function () {
                pub.down.init();
            },

            callback: function (success) {
                waiting = false;
                // in case dispatch calls removeFromStack
                var up = pub.up;
                dispatch();
                up.callback(success);
            },

            incoming: function (message, origin) {
                pub.up.incoming(message, origin);
            },

            outgoing: function (message, origin, fn) {
                queue.push({
                    data: message,
                    origin: origin,
                    callback: fn
                });

                dispatch();
            },

            destroy: function () {
                destroying = true;
                pub.down.destroy();
            }
        };

        return pub;
    };

    /**
     * xdm.stack.RpcBehavior
     *
     * This uses JSON-RPC 2.0 to expose local methods and to invoke remote methods
     * and have responses returned over the the string based transport stack.
     *
     * Exposed methods can return values synchronously, asynchronously, or not at all.
     *
     * @param {Object} proxy The object to apply the methods to.
     * @param {Object} config The definition of the local and remote interface to implement.
     *   local: The local interface to expose.
     *   remote: The remote methods to expose through the proxy.
     */

    xdm.stack.RpcBehavior = function (proxy, config) {
        var pub;
        var _callbackCounter = 0;
        var _callbacks = {};

        /**
         * Serializes and sends the message
         *
         * @param {Object} data The JSON-RPC message to be sent. The jsonrpc property will be added.
         */

        function _send(data) {
            data.jsonrpc = '2.0';
            pub.down.outgoing(JSON.stringify(data));
        }

        /**
         * Creates a method that implements the given definition
         *
         * @param {Object} definition The method configuration
         * @param {String} method The name of the method
         * @return {Function} A stub capable of proxying the requested method call
         */

        function _createMethod(definition, method) {
            var slice = Array.prototype.slice;

            return function () {
                var l = arguments.length;
                var callback;
                var message = {
                    method: method
                };

                if (l > 0 && typeof arguments[l - 1] === 'function') {
                    // one callback, procedure
                    if (l > 1 && typeof arguments[l - 2] === 'function') {
                        // two callbacks, success and error
                        callback = {
                            success: arguments[l - 2],
                            error: arguments[l - 1]
                        };
                        message.params = slice.call(arguments, 0, l - 2);
                    }
                    else {
                        // single callback, success
                        callback = {
                            success: arguments[l - 1]
                        };
                        message.params = slice.call(arguments, 0, l - 1);
                    }
                    _callbacks['' + (++_callbackCounter)] = callback;
                    message.id = _callbackCounter;
                }
                else {
                    // no callbacks, a notification
                    message.params = slice.call(arguments, 0);
                }

                if (definition.namedParams && message.params.length === 1) {
                    message.params = message.params[0];
                }
                // Send the method request
                _send(message);
            };
        }

        /**
         * Executes the exposed method
         *
         * @param {String} method The name of the method
         * @param {Number} id The callback id to use
         * @param {Function} fn The exposed implementation
         * @param {Array} params The parameters supplied by the remote end
         */

        function _executeMethod(method, id, fn, params) {
            if (!fn) {
                if (id) {
                    _send({
                        id: id,
                        error: {
                            code: -32601,
                            message: 'Procedure not found.'
                        }
                    });
                }
                return;
            }

            var success;
            var error;

            if (id) {
                success = function (result) {
                    success = emptyFn;
                    _send({
                        id: id,
                        result: result
                    });
                };

                error = function (message, data) {
                    error = emptyFn;
                    var msg = {
                        id: id,
                        error: {
                            code: -32099,
                            message: message
                        }
                    };

                    if (data) {
                        msg.error.data = data;
                    }
                    _send(msg);
                };
            }
            else {
                success = error = emptyFn;
            }

            // call local method
            if (!isArray(params)) {
                params = [params];
            }

            try {
                var result = fn.method.apply(fn.scope, params.concat([success, error]));
                if (!undef(result)) {
                    success(result);
                }
            }
            catch (ex1) {
                error(ex1.message);
            }
        }

        pub = {
            incoming: function (message, origin) {
                var data = JSON.parse(message);
                var callback;

                if (data.method) {
                    // a method call from the remote end
                    if (config.handle) {
                        config.handle(data, _send);
                    }
                    else {
                        _executeMethod(data.method, data.id, config.local[data.method], data.params);
                    }
                }
                else {
                    // a method response from the other end
                    callback = _callbacks[data.id];
                    if (data.error && callback.error) {
                        callback.error(data.error);
                    }
                    else if (callback.success) {
                        callback.success(data.result);
                    }
                    delete _callbacks[data.id];
                }
            },

            init: function () {
                if (config.remote) {
                    // implement the remote sides exposed methods
                    for (var method in config.remote) {
                        if (config.remote.hasOwnProperty(method)) {
                            proxy[method] = _createMethod(config.remote[method], method);
                        }
                    }
                }
                pub.down.init();
            },

            destroy: function () {
                for (var method in config.remote) {
                    if (config.remote.hasOwnProperty(method) && proxy.hasOwnProperty(method)) {
                        delete proxy[method];
                    }
                }
                pub.down.destroy();
            }
        };

        return pub;
    };

    // commonjs export
    if (typeof exports === 'object') {
        module.exports = xdm;
    }
    // loadrunner export
    else if (typeof provide === 'function') {
        provide(xdm);
    }
    // amd export
    else if (typeof define === 'function' && define.amd) {
        define(function () {
            return xdm;
        });
    }
    // browser global
    else {
        window.xdm = xdm;
    }

}(window));
