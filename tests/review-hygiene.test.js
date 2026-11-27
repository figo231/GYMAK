import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
it('sync server errors show a fixed friendly message, not raw error text',()=>{
 const s=readFileSync('src/lib/sync/syncManager.js','utf8');
 expect(s).not.toMatch(/_setStatus\("error",\s*\{\s*error:\s*err\?\.message/);
 expect(s).toContain('errorKind: "server"');
});
it('export file names use the local date, not the UTC date',()=>{
 for(const f of ['src/lib/backup.js','src/pages/Auth/Account.jsx']){const s=readFileSync(f,'utf8');expect(s).not.toContain('toISOString().slice(0, 10)');expect(s).toContain('localISO()');}
});
it('empty root files and tsbuildinfo files are gone',()=>{
 for(const f of ['AiCoach','Auth','Dashboard','ExerciseDetail','Exercises','Profile','Programs','Stats','dir','gymak-admin/tsconfig.app.tsbuildinfo','gymak-admin/tsconfig.node.tsbuildinfo'])expect(existsSync(f)).toBe(false);
 expect(readFileSync('gymak-admin/.gitignore','utf8')).toContain('*.tsbuildinfo');
});
