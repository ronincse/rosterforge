// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { RosterPrintDialog } from './roster-print-dialog.js';
import type { RosterPrintViewModel } from './roster-print.js';
import * as preparation from './army-reference-images.js';
import { fictionalJpeg } from './reference-image-fixture.js';
afterEach(()=>{cleanup();vi.restoreAllMocks()});
const model=(name:string)=>({name,reference:{name,catalogue:'Fiction',system:'Fiction',resources:[],status:[],glossary:[{anchor:'rule-1',name:'Map',text:`![${name}](${fictionalJpeg})`,note:'',users:[]}],units:[]}} as unknown as RosterPrintViewModel);
it('review: a replacement snapshot remains disabled until its own preview settles',async()=>{
 Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,writable:true,value:()=>Promise.resolve()});
 vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(32);
 vi.spyOn(HTMLImageElement.prototype,'naturalHeight','get').mockReturnValue(24);
 let holdPreview = false; let settlePreview!: () => void;
 vi.spyOn(preparation, 'settleReferenceDocumentImages').mockImplementation(() => holdPreview ? new Promise(resolve => { settlePreview = resolve; }) : Promise.resolve());
 const decode=vi.spyOn(HTMLImageElement.prototype,'decode');
 const {rerender}=render(<RosterPrintDialog model={model('A')} onPrint={()=>true} onClose={()=>{}}/>);
 const first=await screen.findByTitle('Printable army preview');
 fireEvent.load(first);
 await waitFor(()=>expect((screen.getByRole('button',{name:'Save HTML'}) as HTMLButtonElement).disabled).toBe(false));
 let complete!:()=>void;
 decode.mockImplementation(()=>new Promise(resolve=>{complete=resolve}));
 holdPreview = true;
 rerender(<RosterPrintDialog model={model('B')} onPrint={()=>true} onClose={()=>{}}/>);
 await waitFor(()=>expect((screen.getByRole('button',{name:'Save HTML'}) as HTMLButtonElement).disabled).toBe(true));
 await act(async()=>{complete()});
 await screen.findByTitle('Printable army preview');
 // Even an automatic iframe load cannot authorize the pending replacement decode.
 expect((screen.getByRole('button',{name:'Save HTML'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.load(screen.getByTitle('Printable army preview'));
 await act(async()=>{settlePreview()});
 expect((screen.getByRole('button',{name:'Save HTML'}) as HTMLButtonElement).disabled).toBe(false);
});
