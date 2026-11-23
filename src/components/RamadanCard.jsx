import { ramadanTips } from "../lib/ramadan";
import Store from "../lib/store/gymakStore";
import { useStoreVersion } from "../hooks/useStoreVersion";
import { tx } from "../lib/i18n/tx";

export default function RamadanCard({ kind }) {
  const [version] = useStoreVersion();
  void version;
  if (!Store.getRamadan()) return null;
  return (
    <div className="rm-card glass" data-testid="ramadan-card">
      <b className="rm-title">{tx("وضع رمضان")}</b>
      {ramadanTips(kind).map((x) => (<p key={x.t}><strong>{x.t}:</strong> {x.d}</p>))}
    </div>
  );
}
