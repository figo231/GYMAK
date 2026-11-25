import{r as t,H as s}from"./index-CqBw9UmT.js";function r(){const[n,a]=t.useState(()=>s.getSnapshot());return t.useEffect(()=>s.subscribe(a),[]),{...n,syncNow:()=>s.manualSync()}}export{r as u};
