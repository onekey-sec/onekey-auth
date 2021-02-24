import tk from 'timekeeper';
import { mocked } from 'ts-jest/utils'
import { nanoid } from 'nanoid';
import { defaultIotAuthConfig, AuthManager } from '../src';

jest.mock('nanoid');
const mockedNanoid = mocked(nanoid)
mockedNanoid.mockReturnValue('somerandomgibberish');

const config = defaultIotAuthConfig('http://localhost', 'auth');

describe('AuthManager', () => {
  describe('login', () => {
    test('returns User when successfully logged in', async () => {
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      const user = await authManager.login('analyst@localhost', '12345678');
      expect(user).toEqual({
        email: 'analyst@localhost',
        tenants: [
          {
            name: 'Sharing is Caring Corp.',
            id: '384fdbda-5039-4d77-b335-2a432449c328'
          },
          {
            name: 'Tenant One GmbH',
            id: 'fdcfa239-8725-4f4b-89aa-e5b0bcc43bf1'
          }
        ]
      });
      tk.reset();
    });

    test('throws error when signature verification fails', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      try {
        await authManager.login('analyst@localhost', 'wrong_signature');
      } catch (e) {
        expect(e.message).toEqual('Invalid token signature');
      } finally {
        tk.reset();
      }
    });

    test('throws error when token expired', async () => {
      expect.assertions(1);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      try {
        await authManager.login('analyst@localhost', '12345678');
      } catch (e) {
        expect(e.message).toEqual('Token expired');
      }
    });

    test('throws error when issuer verification fails', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode', issuer: 'configured issuer'});
      try {
        await authManager.login('analyst@localhost', '12345678');
      } catch (e) {
        expect(e.message).toEqual('Issuer must be configured issuer, got https://www.iot-inspector.com/');
      } finally {
        tk.reset();
      }
    });

    test('throws error when audience verification fails', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      const authManager = new AuthManager(config);
      try {
        await authManager.login('analyst@localhost', '12345678');
      } catch (e) {
        expect(e.message).toEqual('Audience must be Frontend, got VSCode');
      } finally {
        tk.reset();
      }
    });

    test('throws error when audience verification fails', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      mockedNanoid.mockReturnValueOnce('nonce');
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      try {
        await authManager.login('analyst@localhost', '12345678');
      } catch (e) {
        expect(e.message).toEqual('Nonce must be nonce but it was somerandomgibberish');
      } finally {
        tk.reset();
      }
    });
  });

  describe('chooseTenant', () => {
    test('returns TenantUser when token request was successful', async () => {
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      const user = await authManager.login('analyst@localhost', '12345678');
      mockedNanoid.mockReturnValueOnce('kuldokmarvalamithogylegyen');
      authManager.config = {...config, audience: 'walkman'};
      const tenantUser = await authManager.chooseTenant(user.tenants[0]);
      expect(tenantUser).toEqual({
        token: {
          raw: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3d3dy5pb3QtaW5zcGVjdG9yLmNvbS8iLCJzdWIiOiJhbmFseXN0QGxvY2FsaG9zdCIsImF1ZCI6IndhbGttYW4iLCJpYXQiOjE2MTM3MzM3NzgsImV4cCI6MTcxMzczMzc3Nywibm9uY2UiOiJrdWxkb2ttYXJ2YWxhbWl0aG9neWxlZ3llbiIsImh0dHBzOi8vd3d3LmlvdC1pbnNwZWN0b3IuY29tL3RlbmFudF9pZCI6IjM4NGZkYmRhLTUwMzktNGQ3Ny1iMzM1LTJhNDMyNDQ5YzMyOCJ9.wcZLEqteAT0kH64oPK1MO8SsaxKqKmBvUIISKOcBlBu-r4e1EnmPxXW-FmK2bZesaM6W5lSfx66_qENsbvOhvX5FLGiOkPbQ8AkmDx-AiLRp0DcwP-ACNQ6nz-tvKCJBKI9Ilc9c1FN201r-34q8Pu24Yi5BKZaduUh-SqeMSmX3CscKHpwEIjGUhsG9Nc4D55h4N9-NOU_bZheGsx8lRV60HsSe9AfZmtSrehbV_LSH6ehSCH8QUYR-VBKglD6WjExZv3o9dn1Lug2w6k3BCLTfeR1CQOITdT93wBBue_W9QptiAdWdGQPYDOY0G8SBN71ZAO0-qjKWdkmYdNaJ4w',
          payload: {
            iss: 'https://www.iot-inspector.com/',
            sub: 'analyst@localhost',
            aud: 'walkman',
            iat: 1613733778,
            exp: 1713733777,
            nonce: 'kuldokmarvalamithogylegyen',
            'https://www.iot-inspector.com/tenant_id': '384fdbda-5039-4d77-b335-2a432449c328'
          }
        },
        userGroups: [ { name: 'User group 1', id: '1' } ],
        productGroups: [ { name: 'Product Group 1', id: '1' } ],
        roles: [ 'admin' ]
      });
      tk.reset();
    });

    test('throws error when id token is missing', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      authManager.config = {...config, audience: 'walkman'};
      try {
        await authManager.chooseTenant({
          name: "Sharing is Caring Corp.",
          id: "384fdbda-5039-4d77-b335-2a432449c328"
        });
      } catch (e) {
        expect(e.message).toEqual('Missing id token');
      } finally {
        tk.reset();
      }
    });

    test('throws error when signature verification fails', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      await authManager.login('analyst@localhost', '12345678');
      mockedNanoid.mockReturnValueOnce('kuldokmarvalamithogylegyen');
      authManager.config = {...config, audience: 'walkman'};
      try {
        await authManager.chooseTenant({
          name: "Sharing is Caring Corp.",
          id: "wrong_signature"
        });
      } catch (e) {
        expect(e.message).toEqual('Invalid token signature');
      } finally {
        tk.reset();
      }
    });

    test('throws error when token expired', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      await authManager.login('analyst@localhost', '12345678');
      tk.reset();
      tk.freeze(1713833777000);
      mockedNanoid.mockReturnValueOnce('kuldokmarvalamithogylegyen');
      authManager.config = {...config, audience: 'walkman'};
      try {
        await authManager.chooseTenant({
          name: "Sharing is Caring Corp.",
          id: "384fdbda-5039-4d77-b335-2a432449c328"
        });
      } catch (e) {
        expect(e.message).toEqual('Token expired');
      } finally {
        tk.reset();
      }
    });

    test('throws error when issuer verification fails', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      await authManager.login('analyst@localhost', '12345678');
      mockedNanoid.mockReturnValueOnce('kuldokmarvalamithogylegyen');
      authManager.config = {...config, audience: 'walkman', issuer: 'configured issuer'};
      try {
        await authManager.chooseTenant({
          name: "Sharing is Caring Corp.",
          id: "384fdbda-5039-4d77-b335-2a432449c328"
        });
      } catch (e) {
        expect(e.message).toEqual('Issuer must be configured issuer, got https://www.iot-inspector.com/');
      } finally {
        tk.reset();
      }
    });

    test('throws error when audience verification fails', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      await authManager.login('analyst@localhost', '12345678');
      mockedNanoid.mockReturnValueOnce('kuldokmarvalamithogylegyen');
      authManager.config = config;
      try {
        await authManager.chooseTenant({
          name: "Sharing is Caring Corp.",
          id: "384fdbda-5039-4d77-b335-2a432449c328"
        });
      } catch (e) {
        expect(e.message).toEqual('Audience must be Frontend, got walkman');
      } finally {
        tk.reset();
      }
    });

    test('throws error when nonce verification fails', async () => {
      expect.assertions(1);
      tk.freeze(1613810840000);
      const authManager = new AuthManager({...config, audience: 'VSCode'});
      await authManager.login('analyst@localhost', '12345678');
      authManager.config = {...config, audience: 'walkman'};
      try {
        await authManager.chooseTenant({
          name: "Sharing is Caring Corp.",
          id: "384fdbda-5039-4d77-b335-2a432449c328"
        });
      } catch (e) {
        expect(e.message).toEqual('Nonce must be somerandomgibberish but it was kuldokmarvalamithogylegyen');
      } finally {
        tk.reset();
      }
    });
  });
});

