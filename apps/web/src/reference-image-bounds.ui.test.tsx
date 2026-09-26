// @vitest-environment jsdom
import { it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { referenceContent } from './reference-images.js';
import { ReferenceRichText } from './reference-rich-text.js';
import { fictionalJpeg } from './reference-image-fixture.js';
it('review: bounds placeholder token growth after count cap',()=>{
 const p=referenceContent('![x](https://example.invalid/x) '.repeat(500));
 expect(p.filter(x=>x.kind==='image').length).toBeLessThanOrEqual(33);
});
it('review: keeps total prose formatting bound despite image splits',()=>{
 const s=('**bold** '+ 'x'.repeat(20_000)+' ![x](https://example.invalid/x) ').repeat(2);
 const {container}=render(<ReferenceRichText text={s}/>);
 expect(container.querySelector('strong')).toBeNull(); cleanup();
});
it('review: tilde fenced image stays literal',()=>{
 expect(referenceContent('~~~\n![x]('+fictionalJpeg+')\n~~~').some(x=>x.kind==='image')).toBe(false);
});
it('review: indented code image stays literal',()=>{
 expect(referenceContent('    ![x]('+fictionalJpeg+')').some(x=>x.kind==='image')).toBe(false);
});
