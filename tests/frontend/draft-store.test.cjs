const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm');
function store(initial={},url='http://example.test/edit-set.html',failWrites=false){
 const map=new Map(Object.entries(initial));let current=new URL(url);
 const localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>{if(failWrites)throw new Error('QuotaExceeded');map.set(k,v)},removeItem:k=>map.delete(k)};
 const context={window:{location:current},localStorage,URL,history:{replaceState:(_,__,url)=>{current=new URL(url,current);context.window.location=current}}};
 vm.runInNewContext(fs.readFileSync('front/js/draft-store.js','utf8'),context);
 return {api:context.window.DraftStore,map,url:()=>current};
}
test('a fresh start consumes new once and subsequent loads restore edits',()=>{
 const s=store({'words-up-editor-draft':'{"meta":{"title":"Old"}}'},'http://example.test/edit-set.html?new=1');
 assert.equal(s.api.load([]).meta.title,'');assert(!s.url().searchParams.has('new'));
 s.api.write(s.api.key,{meta:{title:'Kept'},cards:[]});assert.equal(s.api.load([]).meta.title,'Kept');
});
test('invalid storage is recoverable and failed writes are reported',()=>{
 const s=store({'words-up-editor-draft':'invalid json'});assert.equal(s.api.load([]).meta.title,'');
 assert.equal(s.api.read('missing',42),42);
 const full=store({},'http://example.test/edit-set.html',true);
 assert.throws(()=>full.api.write(full.api.key,{cards:[]}),/Browser storage is full/);
});
