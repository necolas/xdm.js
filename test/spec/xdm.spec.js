describe('the xdm object', function () {
    'use strict';

    it('is defined', function () {
        expect(xdm).toBeDefined();
    });

    it('exposes xdm.query', function () {
        expect(xdm.query).toBeDefined();
    });

    it('exposes xdm.version', function () {
        expect(xdm.version).toBeDefined();
    });

    it('exposes xdm.checkAcl', function () {
        expect(xdm.checkAcl).toBeDefined();
    });

    it('exposes xdm.stack', function () {
        expect(xdm.stack).toBeDefined();
    });

    it('exposes xdm.stack.PostMessageTransport', function () {
        expect(xdm.stack.PostMessageTransport).toBeDefined();
    });

    it('exposes xdm.stack.QueueBehavior', function () {
        expect(xdm.stack.QueueBehavior).toBeDefined();
    });

    it('exposes xdm.stack.RpcBehavior', function () {
        expect(xdm.stack.RpcBehavior).toBeDefined();
    });

    it('exposes xdm.Rpc', function () {
        expect(xdm.Rpc).toBeDefined();
    });
});

