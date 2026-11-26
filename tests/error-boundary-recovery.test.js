import {describe,it,expect} from 'vitest';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ErrorBoundary from '../src/components/ErrorBoundary';
describe('saved history recovery screen',()=>{
 it('never reassures that corrupt data has no problem',()=>{const boundary=new ErrorBoundary({});boundary.state=ErrorBoundary.getDerivedStateFromError(Error('original copy has not been changed'));const html=renderToStaticMarkup(boundary.render());expect(html).toContain('تنزيل النسخة الأصلية للاسترجاع');expect(html).toContain('متعملش حذف');expect(html).not.toContain('مفيهاش أي مشكلة');});
});
