import{a as t,aN as s}from"./index-u8Kb5RVw.js";function r(){const[a,n]=t.useState(()=>s.getSnapshot());return t.useEffect(()=>s.subscribe(n),[]),{...a,syncNow:()=>s.manualSync()}}export{r as u};
