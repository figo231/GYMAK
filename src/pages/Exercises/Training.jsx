import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Store from '../../lib/store/gymakStore';
import { useStoreVersion } from '../../hooks/useStoreVersion';
import Profile from '../Profile/Profile';

export default function Training() {
  const [version] = useStoreVersion();
  const day = useMemo(() => {
    const plan = Store.getTodayPlanIds().map(id => Store.getExerciseById(id)).filter(Boolean);
    return { plan, done: plan.filter(ex => Store.isLoggedToday(ex.id)).length, sets: Store.getSetsInRange(1), recent: Store.getRecentExerciseLogs(3), program: Store.getActiveProgram() };
  }, [version]);
  const next = day.plan.find(ex => !Store.isLoggedToday(ex.id));
  return <div className="ux-training">
    <header className="page-head"><div><h1 className="page-title">تمرين النهارده</h1><p className="page-count">خطوة واحدة لتسجيل تمرينك</p></div></header>
    <section className="glass ux-training-hero" aria-label="حالة تمرين النهارده">
      <p className="ux-eyebrow">النهارده</p>
      <h2>{day.sets ? `سجّلت ${day.sets} مجموعات` : day.plan.length ? `${day.plan.length} تمارين في خطتك` : 'جاهز لتمرينك؟'}</h2>
      <p>{day.plan.length ? `${day.done} من ${day.plan.length} خلصوا` : 'اختار تمرينك من المكتبة، أو برنامج يناسبك.'}</p>
      <Link className="btn btn-primary" to={next ? `/exercise/${encodeURIComponent(next.id)}` : '/exercises'}>{next ? 'كمّل تمرينك' : day.sets ? 'سجّل تمرين تاني' : 'اختار تمرين وسجّله'}</Link>
    </section>
    {!!day.plan.length && <section aria-label="خطة النهارده"><h2 className="section-sub">المتبقي في خطتك</h2>{day.plan.map(ex => <Link className="ux-destination glass" key={ex.id} to={`/exercise/${encodeURIComponent(ex.id)}`}><span>{ex.name}</span><span>{Store.isLoggedToday(ex.id) ? '✓ اتسجّل' : 'سجّل ←'}</span></Link>)}</section>}
    <Link className="ux-destination glass" to="/programs"><span>برنامج التدريب</span><small>{day.program?.name || 'اختار برنامج مناسب ليك'} ←</small></Link>
    <Link className="ux-destination glass" to="/exercises"><span>مكتبة التمارين</span><small>بحث، عضلات، فلتر، مفضلة وتمارينك الخاصة ←</small></Link>
    <Link className="ux-destination glass" to="/warmup"><span>إحماء وإطالة</span><span>←</span></Link>
    <details className="ux-group" id="training-settings"><summary>إعدادات التدريب ومدربيني ووضع رمضان</summary><div className="ux-group-body"><Profile panel="training" /></div></details>
    <p className="pc-hint">قوتك وأرقامك القياسية في <Link to="/stats">تقدم</Link>. الرسائل في <Link to="/messages">دردشة</Link>، منفصلة عن مشاركة بيانات التمرين مع مدربك.</p>
  </div>;
}
