describe('an instance of xdm.Rpc', function () {
    'use strict';

    var expectedMessage;
    var guest;
    var i = 0;
    var isReady = false;
    var isComplete = false;
    var message;

    beforeEach(function () {
        // create a unique message
        expectedMessage = ++i + "_abcd1234%@¤/";

        // set up the cross-domain messaging channel
        guest = new xdm.Rpc({
            remote: '/base/test/fixture/guest.html',
            container: document.body,
            props: {
                height: '50px'
            },
            onReady: function () {
                isReady = true;
            }
        }, {
            remote: {
                voidMethod: {},
                asyncMethod: {},
                regularMethod: {},
                errorMethod: {},
                nonexistent: {},
                namedParamsMethod: {
                    namedParams: true
                }
            },
            local: {
                voidCallback: function (msg) {
                    message = msg;
                    isComplete = true;
                }
            }
        });

        // wait until the onReady callback has been triggered
        waitsFor(function () {
            return isReady;
        });
    });

    afterEach(function () {
        isReady = false;
        isComplete = false;
        message = null;

        guest.destroy();
    });

    it('creates an iframe', function () {
        expect(document.body.innerHTML).toContain('iframe');
    });

    it('has a reference to the iframe', function () {
        expect(guest.iframe.nodeName).toEqual('IFRAME');
    });

    it('triggers onReady', function () {
        expect(isReady).toBe(true);
    });

    it('can remove the iframe', function () {
        guest.destroy();
        expect(document.getElementsByTagName('iframe').length).toBe(0);
    });

    it('can remove the channel', function () {
        guest.destroy();
        expect(guest.voidMethod).not.toBeDefined();
    });

    /**
     * Remote procedure call tests
     */

    describe('remote method call', function () {
        it('supports void methods', function () {
            runs(function () {
                guest.voidMethod(expectedMessage);
            });

            waitsFor(function () {
                return isComplete;
            });

            runs(function () {
                expect(message).toEqual(expectedMessage);
            });
        });

        it('supports async methods', function () {
            runs(function () {
                guest.asyncMethod(expectedMessage, function (msg) {
                    message = msg;
                    isComplete = true;
                });
            });

            waitsFor(function () {
                return isComplete;
            });

            runs(function () {
                expect(message).toEqual(expectedMessage);
            });
        });

        it('supports regular methods', function () {
            runs(function () {
                guest.regularMethod(expectedMessage, function (msg) {
                    message = msg;
                    isComplete = true;
                });
            });

            waitsFor(function () {
                return isComplete;
            });

            runs(function () {
                expect(message).toEqual(expectedMessage);
            });
        });

        it('handles errors by calling the error callback', function () {
            var isError = false;

            runs(function () {
                guest.errorMethod(expectedMessage, function (msg) {
                    isComplete = true;
                }, function (err) {
                    isError = true;
                    isComplete = true;
                });
            });

            waitsFor(function () {
                return isComplete;
            });

            runs(function () {
                expect(isError).toBe(true);
            });
        });

        it('throws an error on nonexistent methods', function () {
            var isError = false;

            runs(function () {
                guest.nonexistent(expectedMessage, function (msg) {
                    isComplete = true;
                }, function (err) {
                    isError = true;
                    isComplete = true;
                });
            });

            waitsFor(function () {
                return isComplete;
            });

            runs(function () {
                expect(isError).toBe(true);
            });
        });

        it('supports messages with named parameters', function () {
            runs(function () {
                guest.namedParamsMethod({
                    msg: expectedMessage
                }, function (msg) {
                    message = msg;
                    isComplete = true;
                });
            });

            waitsFor(function () {
                return isComplete;
            });

            runs(function () {
                expect(message).toEqual(expectedMessage);
            });
        });
    });
});
