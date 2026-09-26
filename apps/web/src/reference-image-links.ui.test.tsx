// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { render,cleanup } from '@testing-library/react';
import { ReferenceRichText,ReferenceTextContext } from './reference-rich-text.js';
import { createReferenceTextIndex } from './reference-text-index.js';
it('review: a reference-wide link budget survives image segmentation',()=>{
 const index=createReferenceTextIndex(new Map([['term',{name:'Term',rules:[],profiles:[],sourceOnly:true}]]));
 const {container}=render(<ReferenceTextContext.Provider value={{index,open:()=>{}}}><ReferenceRichText text={'Term '.repeat(200)+' ![Image](remote) '+'Term '.repeat(200)}/></ReferenceTextContext.Provider>);
 expect(container.querySelectorAll('.reference-prose-link').length).toBeLessThanOrEqual(256);
 cleanup();
});
