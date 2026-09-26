import { expect,it } from 'vitest';
import { referenceProse } from './reference-images.js';
it('review: suppressed overflow images still separate adjacent prose',()=>{
 const result=referenceProse('![x](remote)'.repeat(33)+'Before![x](remote)After');
 expect(result).not.toContain('BeforeAfter');
});
