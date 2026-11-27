import{a as t,aL as s}from"./index-CETTGWSQ.js";function r(){const[a,n]=t.useState(()=>s.getSnapshot());return t.useEffect(()=>s.subscribe(n),[]),{...a,syncNow:()=>s.manualSync()}}export{r as u};
