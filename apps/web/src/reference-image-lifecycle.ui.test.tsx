// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ReferenceRichText } from './reference-rich-text.js';
import { fictionalJpeg } from './reference-image-fixture.js';
afterEach(()=>{cleanup();vi.restoreAllMocks()});
function platform(){
 Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,writable:true,value:()=>Promise.resolve()});
 vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(32);
 vi.spyOn(HTMLImageElement.prototype,'naturalHeight','get').mockReturnValue(24);
 return vi.spyOn(HTMLImageElement.prototype,'decode');
}
it('review: mounted aggregate allowance returns on complete reader unmount',async()=>{
 const decode=platform();
 const first=render(<>{Array.from({length:33},(_,i)=><ReferenceRichText key={i} text={`![Map ${i}](${fictionalJpeg})`}/>)}</>);
 await screen.findByText(/Map 32: Open-reference image limit exceeded/);
 await waitFor(()=>expect(first.container.querySelectorAll('img')).toHaveLength(32));
 expect(decode).toHaveBeenCalledTimes(32);
 first.unmount();
 const second=render(<ReferenceRichText text={`![Fresh](${fictionalJpeg})`}/>);
 await waitFor(()=>expect(second.container.querySelector('img')).not.toBeNull());
 expect(decode).toHaveBeenCalledTimes(33);
});
it('review: a rendered image load failure visibly replaces its raster',async()=>{
 platform();
 const {container}=render(<ReferenceRichText text={`![Map](${fictionalJpeg})`}/>);
 await waitFor(()=>expect(container.querySelector('img')).not.toBeNull());
 fireEvent.error(container.querySelector('img')!);
 expect(container.querySelector('img')).toBeNull();
 expect(container.textContent).toContain('Map: Image could not be displayed.');
});
