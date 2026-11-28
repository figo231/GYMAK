import{beforeEach,it,expect,vi}from'vitest';
let Store;
beforeEach(async()=>{vi.resetModules();localStorage.clear();Store=(await import('../src/lib/store/gymakStore')).default;});
const p=q=>(Store.parseFood(q)||[]).map(i=>[i.name,i.grams,i.kcal]);
it('a bare number of 20 or more is grams, not x100 servings',()=>{
 for(const q of['زبادي 150','مكرونة 150','بطاطس مسلوقة 200']){const [r]=Store.parseFood(q);expect(r.grams,q).toBeLessThanOrEqual(200);}
 expect(Store.parseFood('زبادي 150')[0].grams).toBe(150);
});
it('matches whole words only',()=>{
 expect(p('رز ابيض 200 جم').map(x=>x[0])).toEqual(['رز']);
 expect(p('خبز ابيض 2').map(x=>x[0])).not.toContain('بيض');
 expect(p('جبنة بيضاء').map(x=>x[0])).not.toContain('بيض');
 expect(p('بطاطا').map(x=>x[0])).not.toContain('بط');
});
it('keeps real matches, prefixes and plurals working',()=>{
 expect(p('2 بيض مسلوق').map(x=>x[0])).toContain('بيض');
 expect(p('2 بيضة').length).toBe(1);
 expect(p('200 جم رز مع فراخ').map(x=>x[0]).sort()).toEqual(['رز','فراخ']);
 expect(p('بالرز').length).toBe(1);
 expect(p('٣ حبات تمر')[0][1]).toBe(24);
});
it('the most specific alias wins',()=>{
 const fried=Store.parseFood('200 جم فراخ مقلية');
 expect(fried.length).toBe(1);
 expect(fried[0].name).toBe('فراخ مقلية');
 expect(fried[0].kcal).toBe(520);
 expect(Store.parseFood('200 جم فراخ بانيه').length).toBe(1);
});
