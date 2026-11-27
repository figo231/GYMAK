import{a as t,aL as s}from"./index-BJNHbZ4w.js";function r(){const[a,n]=t.useState(()=>s.getSnapshot());return t.useEffect(()=>s.subscribe(n),[]),{...a,syncNow:()=>s.manualSync()}}export{r as u};
