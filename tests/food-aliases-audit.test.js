import{beforeEach,describe,it,expect,vi}from'vitest';
let S;beforeEach(async()=>{vi.resetModules();localStorage.clear();S=(await import('../src/lib/store/gymakStore')).default;});
const one=(t)=>{const r=S.parseFood(t);return r;};
describe('food aliases from the audit',()=>{
 it('لبن رايب counts once',()=>{const r=one('لبن رايب');expect(r.length).toBe(1);expect(r[0].kcal).toBe(65);});
 it('لحم, سمنة, سكر, شاي are recognized',()=>{
  expect(one('لحم 200 جم')[0]).toMatchObject({grams:200,kcal:500});
  expect(one('سمنة')[0].kcal).toBeGreaterThan(0);
  expect(one('2 معلقة سكر')[0]).toMatchObject({grams:20,kcal:77});
  expect(one('كوباية شاي')[0]).toMatchObject({grams:200});
  expect(one('كوباية شاي').length).toBe(1);
  expect(one('شاي بلبن')[0].kcal).toBe(40);
 });
 it('English food names are recognized',()=>{
  expect(one('banana')[0].kcal).toBeGreaterThan(0);
  expect(one('Grilled Chicken 200g')[0].grams).toBe(200);
  expect(one('white rice 150 g')[0].grams).toBe(150);
  expect(one('tuna').length).toBe(1);
 });
 it('old Arabic input unchanged',()=>{expect(one('رز 200')[0].grams).toBe(200);expect(one('بطاطا').length).toBe(0);expect(one('بطاطس').length).toBe(1);});
});
