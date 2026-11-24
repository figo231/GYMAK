import{it,expect}from'vitest';import{foodSwaps}from'../src/lib/foodSwaps';
const f=(name,kcal,protein)=>({name,per100:{kcal,protein,carbs:10,fat:2}});const catalog=[f('أرز',130,3),f('مكرونة',150,5),f('فراخ',180,30),f('جبنة',200,20)];
it('matches calories with plausible servings and protein tolerance',()=>{const r=foodSwaps({name:'أرز',kcal:260,protein:6},catalog);expect(r.map(x=>x.name)).toEqual(['مكرونة']);expect(r[0].grams).toBe(175);expect(r[0].kcal).toBe(263);});
it('filters excluded names without claiming ingredient safety',()=>{expect(foodSwaps({name:'أرز',kcal:260,protein:6},catalog,['مكرونة'])).toEqual([]);});
it('rejects zero/invalid source, overlarge portions and self duplicates',()=>{expect(foodSwaps({name:'أرز',kcal:0,protein:0},catalog)).toEqual([]);expect(foodSwaps({name:'أرز',kcal:20000,protein:6},catalog)).toEqual([]);});
