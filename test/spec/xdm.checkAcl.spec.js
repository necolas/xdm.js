describe('xdm.checkAcl', function () {
    'use strict';

    var acl = [
        'http://www.domain.invalid',
        '*.domaina.com',
        'http://dom?inb.com',
        '^http://domc{3}ain\\.com$'
    ];

    it('matches a complete string', function () {
        expect(xdm.checkAcl(acl, 'http://www.domain.invalid')).toBe(true);
    });

    it('matches *', function () {
        expect(xdm.checkAcl(acl, 'http://www.domaina.com')).toBe(true);
    });

    it('matches ?', function () {
        expect(xdm.checkAcl(acl, 'http://domainb.com')).toBe(true);
    });

    it('matches RegExp', function () {
        expect(xdm.checkAcl(acl, 'http://domcccain.com')).toBe(true);
    });

    it('does not match', function () {
        expect(xdm.checkAcl(acl, 'http://foo.com')).toBe(false);
    });
});
