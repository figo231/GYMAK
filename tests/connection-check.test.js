import {describe,it,expect} from 'vitest';
import {checkConnection,isNetworkAuthError} from '../src/lib/connectionCheck';
describe('connection check',()=>{
 it('reports http status without body or keys',async()=>{const r=await checkConnection({url:'https://x.test/',fetchFn:async(u)=>{expect(u).toBe('https://x.test/auth/v1/health');return {status:200}}});expect(r).toMatch(/^chk:http200 \d+ms online=/);});
 it('reports error name on failure',async()=>{const r=await checkConnection({url:'https://x.test',fetchFn:async()=>{throw new TypeError('Failed to fetch')}});expect(r).toMatch(/^chk:TypeError/);});
 it('handles missing url',async()=>{expect(await checkConnection({url:''})).toMatch(/^chk:nourl/);});
 it('detects network class errors only',()=>{expect(isNetworkAuthError(new TypeError('x'))).toBe(true);expect(isNetworkAuthError({name:'AuthApiError',message:'Invalid login credentials'})).toBe(false);});
});
