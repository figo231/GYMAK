import{r as t,U as s}from"./index-L1WMX7G4.js";function r(){const[n,a]=t.useState(()=>s.getSnapshot());return t.useEffect(()=>s.subscribe(a),[]),{...n,syncNow:()=>s.manualSync()}}export{r as u};
