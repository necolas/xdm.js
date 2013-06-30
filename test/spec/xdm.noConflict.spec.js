describe('xdm.noConflict', function () {
    'use strict';

    var xdmCache = window.xdm;
    var namespace = null;
    var i = 0;
    var expectedMessage = ++i + '_abcd1234%@¤/';

    beforeEach(function () {
        namespace = {
            xdm: window.xdm.noConflict('modules')
        };
    });

    afterEach(function () {
        window.xdm = xdmCache;
        namespace = null;
    });

    it('releases window.xdm', function () {
        expect(window.xdm).toBeUndefined();
        expect(namespace.xdm).toBe(xdmCache);
    });
});

