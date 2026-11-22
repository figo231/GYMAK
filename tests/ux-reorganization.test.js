import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createElement as h, act } from 'react';
import { createRoot } from 'react-dom/client';
vi.mock('../src/lib/update/UpdateService', () => ({ default: { hasPendingApk: () => false } }));
let node, root;
beforeEach(() => { vi.resetModules(); localStorage.clear(); node = document.createElement('div'); document.body.append(node); });
afterEach(() => { if (root) act(() => root.unmount()); node.remove(); root = null; });
async function mount(path, Component, props = {}) {
  const { MemoryRouter } = await import('react-router-dom');
  const { ThemeProvider } = await import('../src/hooks/useTheme');
  const { I18nProvider } = await import('../src/hooks/useI18n');
  const { AuthProvider } = await import('../src/hooks/useAuth');
  const { ToastProvider } = await import('../src/hooks/useToast');
  const { DialogProvider } = await import('../src/hooks/useDialog');
  root = createRoot(node);
  act(() => root.render(h(ThemeProvider, null, h(I18nProvider, null, h(AuthProvider, null, h(ToastProvider, null, h(DialogProvider, null, h(MemoryRouter, { initialEntries: [path] }, h(Component, props)))))))));
}
describe('reorganized navigation, without deleting old destinations', () => {
  it.each([['/training','تدريب'],['/exercises','تدريب'],['/programs','تدريب'],['/warmup','تدريب'],['/supplements','أكل'],['/strength','تقدم'],['/achievements','تقدم'],['/professionals?view=requests','دردشة'],['/admin','حسابي']])('marks the right bottom tab for %s', async (path,label) => {
    const { default: Nav } = await import('../src/components/layout/BottomNav');
    await mount(path,Nav);
    expect(node.querySelectorAll('.nav-item')).toHaveLength(6);
    expect(node.querySelectorAll('.nav-item.active')).toHaveLength(1);
    expect(node.querySelector('.nav-item.active').textContent).toBe(label);
  });
  it('lands training on today and keeps the library, programmes and warmup', async () => {
    const { default: Training } = await import('../src/pages/Exercises/Training');
    await mount('/training',Training);
    expect(node.querySelector('h1').textContent).toBe('تمرين النهارده');
    for (const url of ['/exercises','/programs','/warmup','/ai-coach']) expect(node.querySelector(`a[href="${url}"]`)).toBeTruthy();
    expect(node.textContent).toContain('مؤقت الراحة بين المجموعات');
    expect(node.textContent).toContain('وضع رمضان');
  });
  it('puts food tracking ahead of goal controls and retains saved meals/barcode', async () => {
    const { default: Food } = await import('../src/pages/Food/Food');
    await mount('/food',Food);
    const markup=node.innerHTML;
    expect(markup.indexOf('food-hero')).toBeLessThan(markup.indexOf('food-add'));
    expect(markup.indexOf('food-add')).toBeLessThan(markup.indexOf('goal-modes'));
    for (const label of ['سجّل بالباركود','وجباتك المحفوظة','الهدف واليوم الحر ووضع رمضان']) expect(node.textContent).toContain(label);
  });
  it('separates chat inbox, suggestions and requests with real routes', async () => {
    const { default: Nav } = await import('../src/components/layout/ChatNav');
    await mount('/professionals?view=requests',Nav);
    expect([...node.querySelectorAll('a')].map(a=>a.getAttribute('href'))).toEqual(['/messages','/professionals','/professionals?view=requests']);
    expect(node.querySelector('[aria-current="page"]').textContent).toBe('الطلبات');
  });
  it('groups profile controls and keeps destructive actions behind the existing confirmation', async () => {
    const { default: Profile } = await import('../src/pages/Profile/Profile');
    await mount('/profile',Profile);
    for (const text of ['الحساب ومزامنة البيانات','التفضيلات والخصوصية','المساعدة والدعم','عن التطبيق والمشاركة','قفل التطبيق','اللغة والوحدات','إعادة تعيين كل البيانات']) expect(node.textContent).toContain(text);
    for (const url of ['/backups','/tour','/contact','/help']) expect(node.querySelector(`a[href="${url}"]`)).toBeTruthy();
    expect(node.querySelector('a[href="/professionals"]')).toBeNull();
    expect(node.querySelector('a[href="/messages"]')).toBeNull();
  });
});
