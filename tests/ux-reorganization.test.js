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
describe('mixed layout candidate, APK15 first', () => {
  it.each([['/','الرئيسية'],['/exercises','تدريب'],['/programs','تدريب'],['/warmup','تدريب'],['/food','أكل'],['/stats','تقدم'],['/history','تقدم'],['/professionals','دردشة'],['/profile','حسابي']])('retains six old-layout bottom tabs at %s', async (path,label) => {
    const { default: Nav } = await import('../src/components/layout/BottomNav');
    await mount(path,Nav);
    expect(node.querySelectorAll('.nav-item')).toHaveLength(6);
    expect(node.querySelector('.nav-item.active').textContent).toBe(label);
    expect(node.querySelector('a[href="/exercises"]')).toBeTruthy();
  });
  it('restores the old home without duplicate chat banners', async () => {
    const { default: Dashboard } = await import('../src/pages/Dashboard/Dashboard');await mount('/',Dashboard);
    expect(node.querySelector('details')).toBeNull();expect(node.querySelector('[data-testid="water-card"]')).toBeTruthy();
    expect(node.querySelector('a[href="/professionals"]')).toBeNull();expect(node.querySelector('a[href="/messages"]')).toBeNull();
  });
  it('retains grouped Profile without losing body, achievements or training controls', async () => {
    const { default: Profile } = await import('../src/pages/Profile/Profile');await mount('/profile',Profile);
    for (const text of ['الحساب ومزامنة البيانات','التفضيلات والخصوصية','المساعدة والدعم','عن التطبيق والمشاركة','قفل التطبيق','مؤقت الراحة بين المجموعات','مؤشر كتلة الجسم BMI','كارت الوزن (صورة)','وضع رمضان']) expect(node.textContent).toContain(text);
    for (const url of ['/backups','/tour','/contact','/help','/ai-coach','/photos','/measurements','/achievements']) expect(node.querySelector(`a[href="${url}"]`)).toBeTruthy();
    expect(node.querySelector('a[href="/training#training-settings"]')).toBeNull();
  });
  it('restores the old visible food controls', async () => {
    const { default: Food } = await import('../src/pages/Food/Food');await mount('/food',Food);
    expect(node.querySelector('details')).toBeNull();expect(node.textContent).toContain('سجّل بالباركود');
  });
  it('restores the combined directory and requests page', async () => {
    const fs=await import('node:fs');const text=fs.readFileSync('src/pages/Professionals/Professionals.jsx','utf8');
    expect(text).not.toContain('ChatNav');expect(text).toContain('pro-requests');expect(text).toContain('pro-intro');
  });
});
